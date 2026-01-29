-- Drop incomplete tables from failed migration attempt
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.expense_splits CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.currencies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create currencies table
CREATE TABLE public.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

-- Insert common currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
    ('USD', 'US Dollar', '$'),
    ('EUR', 'Euro', '€'),
    ('GBP', 'British Pound', '£'),
    ('INR', 'Indian Rupee', '₹'),
    ('CAD', 'Canadian Dollar', 'C$'),
    ('AUD', 'Australian Dollar', 'A$'),
    ('JPY', 'Japanese Yen', '¥');

-- Create groups table (removed subquery from default)
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other' CHECK (category IN ('trip', 'home', 'couple', 'friends', 'office', 'other')),
    image_url TEXT,
    default_currency_id UUID REFERENCES public.currencies(id),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group members table
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create expense categories enum-like table
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    color TEXT NOT NULL
);

-- Insert default categories
INSERT INTO public.expense_categories (name, icon, color) VALUES
    ('food', 'utensils', '#22c55e'),
    ('transport', 'car', '#3b82f6'),
    ('entertainment', 'music', '#a855f7'),
    ('shopping', 'shopping-bag', '#f59e0b'),
    ('bills', 'receipt', '#ef4444'),
    ('travel', 'plane', '#06b6d4'),
    ('other', 'more-horizontal', '#6b7280');

-- Create expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    category TEXT DEFAULT 'other',
    expense_date DATE DEFAULT CURRENT_DATE,
    paid_by UUID NOT NULL REFERENCES auth.users(id),
    currency_id UUID NOT NULL REFERENCES public.currencies(id),
    split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense splits table
CREATE TABLE public.expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    percentage DECIMAL(5,2),
    is_settled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expense_id, user_id)
);

-- Create settlements table
CREATE TABLE public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency_id UUID NOT NULL REFERENCES public.currencies(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is a group member
CREATE OR REPLACE FUNCTION public.is_group_member(group_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = group_id_param AND user_id = auth.uid()
    )
$$;

-- Helper function: Check if user is group owner
CREATE OR REPLACE FUNCTION public.is_group_owner(group_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = group_id_param AND owner_id = auth.uid()
    )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can view profiles of group members"
ON public.profiles FOR SELECT
USING (
    id IN (
        SELECT gm.user_id FROM public.group_members gm
        WHERE gm.group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Currencies RLS - everyone can read
CREATE POLICY "Everyone can view currencies"
ON public.currencies FOR SELECT
USING (true);

-- Expense categories RLS - everyone can read
CREATE POLICY "Everyone can view expense categories"
ON public.expense_categories FOR SELECT
USING (true);

-- Groups RLS policies
CREATE POLICY "Users can view groups they belong to"
ON public.groups FOR SELECT
USING (public.is_group_member(id) OR owner_id = auth.uid());

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can update groups"
ON public.groups FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Group owners can delete groups"
ON public.groups FOR DELETE
USING (owner_id = auth.uid());

-- Group members RLS policies
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (public.is_group_member(group_id) OR public.is_group_owner(group_id));

CREATE POLICY "Group owners can add members"
ON public.group_members FOR INSERT
WITH CHECK (public.is_group_owner(group_id));

CREATE POLICY "Group owners can remove members or self-leave"
ON public.group_members FOR DELETE
USING (public.is_group_owner(group_id) OR user_id = auth.uid());

-- Expenses RLS policies
CREATE POLICY "Members can view group expenses"
ON public.expenses FOR SELECT
USING (public.is_group_member(group_id));

CREATE POLICY "Members can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND paid_by = auth.uid());

CREATE POLICY "Expense creator can update"
ON public.expenses FOR UPDATE
USING (paid_by = auth.uid());

CREATE POLICY "Expense creator can delete"
ON public.expenses FOR DELETE
USING (paid_by = auth.uid());

-- Expense splits RLS policies
CREATE POLICY "Participants can view splits"
ON public.expense_splits FOR SELECT
USING (
    expense_id IN (
        SELECT id FROM public.expenses WHERE public.is_group_member(group_id)
    )
);

CREATE POLICY "Expense creator can insert splits"
ON public.expense_splits FOR INSERT
WITH CHECK (
    expense_id IN (
        SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
);

CREATE POLICY "Expense creator can update splits"
ON public.expense_splits FOR UPDATE
USING (
    expense_id IN (
        SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
);

CREATE POLICY "Expense creator can delete splits"
ON public.expense_splits FOR DELETE
USING (
    expense_id IN (
        SELECT id FROM public.expenses WHERE paid_by = auth.uid()
    )
);

-- Settlements RLS policies
CREATE POLICY "Involved parties can view settlements"
ON public.settlements FOR SELECT
USING (payer_id = auth.uid() OR receiver_id = auth.uid() OR public.is_group_member(group_id));

CREATE POLICY "Group members can create settlements"
ON public.settlements FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND (payer_id = auth.uid() OR receiver_id = auth.uid()));

CREATE POLICY "Involved parties can update settlements"
ON public.settlements FOR UPDATE
USING (payer_id = auth.uid() OR receiver_id = auth.uid());

-- Trigger for auto-creating profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-adding group owner as member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (NEW.id, NEW.owner_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();