import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Mail, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  group_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  groups: {
    name: string;
    description: string | null;
  };
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email) {
      fetchInvitations();
    }
  }, [user?.email]);

  const fetchInvitations = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          id,
          group_id,
          email,
          role,
          status,
          created_at,
          expires_at,
          groups (
            name,
            description
          )
        `)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setInvitations((data as unknown as Invitation[]) || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_id: invitationId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Welcome to the group!',
          description: 'You have successfully joined the group.',
        });
        fetchInvitations();
      } else {
        toast({
          title: 'Could not accept invitation',
          description: 'The invitation may have expired or already been used.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    
    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation declined',
        description: 'You have declined the invitation.',
      });
      fetchInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Pending Invitations</h2>
        <Badge variant="secondary">{invitations.length}</Badge>
      </div>

      <div className="grid gap-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{invitation.groups.name}</CardTitle>
                  {invitation.groups.description && (
                    <CardDescription>{invitation.groups.description}</CardDescription>
                  )}
                </div>
                <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                  {invitation.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.id)}
                    disabled={processingId === invitation.id}
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
