-- Create role enum
CREATE TYPE public.group_role AS ENUM ('admin', 'member');

-- Add role column to group_members
ALTER TABLE public.group_members 
ADD COLUMN role public.group_role NOT NULL DEFAULT 'member';

-- Update existing owner to be admin
UPDATE public.group_members gm
SET role = 'admin'
FROM public.groups g
WHERE gm.group_id = g.id AND gm.user_id = g.owner_id;

-- Create invitations table
CREATE TABLE public.group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    role public.group_role NOT NULL DEFAULT 'member',
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, email)
);

-- Enable RLS on invitations
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
-- Group admins can create invitations
CREATE POLICY "Group admins can create invitations"
ON public.group_invitations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = group_invitations.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

-- Group members can view invitations for their groups
CREATE POLICY "Group members can view invitations"
ON public.group_invitations
FOR SELECT
USING (
    is_group_member(group_id) OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Invited user can update their own invitation (accept/decline)
CREATE POLICY "Invited users can update invitation"
ON public.group_invitations
FOR UPDATE
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Group admins can delete invitations
CREATE POLICY "Group admins can delete invitations"
ON public.group_invitations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = group_invitations.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

-- Create helper function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(group_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = group_id_param 
        AND user_id = auth.uid()
        AND role = 'admin'
    )
$$;

-- Update the add_owner_as_member trigger to set admin role
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'admin');
    RETURN NEW;
END;
$$;

-- Function to accept invitation and join group
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inv RECORD;
    user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Get invitation
    SELECT * INTO inv FROM public.group_invitations 
    WHERE id = invitation_id 
    AND email = user_email 
    AND status = 'pending'
    AND expires_at > now();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Add user to group
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (inv.group_id, auth.uid(), inv.role)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    -- Update invitation status
    UPDATE public.group_invitations 
    SET status = 'accepted', accepted_at = now()
    WHERE id = invitation_id;
    
    RETURN TRUE;
END;
$$;