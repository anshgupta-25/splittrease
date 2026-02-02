import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Plus,
  Settings,
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  MoreVertical,
  UserPlus,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Header } from '@/components/layout/Header';
import { InviteMemberDialog } from '@/components/groups/InviteMemberDialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { BalanceCard } from '@/components/settlements/BalanceCard';
import type { Group, Expense, Profile, Currency, ExpenseSplit } from '@/types/database';

interface MemberWithRole extends Profile {
  role: string;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [balances, setBalances] = useState<{ person: Profile; amount: number; direction: 'owe' | 'owed' }[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchGroupData();
    }
  }, [user, id]);

  const fetchGroupData = async () => {
    if (!id || !user?.uid) return;
    
    try {
      // Fetch group with default currency
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*, currencies(*)')
        .eq('id', id)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData as Group);
      
      // Set default currency
      if (groupData.currencies) {
        setDefaultCurrency(groupData.currencies as Currency);
      } else {
        // Fallback to USD
        const { data: usdCurrency } = await supabase
          .from('currencies')
          .select('*')
          .eq('code', 'USD')
          .single();
        if (usdCurrency) setDefaultCurrency(usdCurrency as Currency);
      }

      // Fetch expenses with splits
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('group_id', id)
        .order('expense_date', { ascending: false });

      setExpenses((expensesData as Expense[]) || []);

      // Fetch members with roles
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', id);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        
        // Merge profiles with roles
        const membersWithRoles: MemberWithRole[] = (profiles || []).map(profile => {
          const memberData = membersData.find(m => m.user_id === profile.id);
          return {
            ...profile,
            role: memberData?.role || 'member'
          } as MemberWithRole;
        });
        
        setMembers(membersWithRoles);
        
        // Set current user profile
        const currentProfile = profiles?.find(p => p.id === user.uid);
        if (currentProfile) {
          setCurrentUserProfile(currentProfile as Profile);
        }
        
        // Check if current user is admin
        const currentUserMember = membersData.find(m => m.user_id === user?.uid);
        setIsAdmin(currentUserMember?.role === 'admin');

        // Calculate balances
        await calculateBalances(expensesData || [], profiles || [], user.uid);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = async (expensesData: any[], profiles: any[], currentUserId: string) => {
    // Calculate what each person owes/is owed relative to the current user
    const balanceMap: Record<string, number> = {};

    for (const expense of expensesData) {
      const paidBy = expense.paid_by;
      const splits = expense.expense_splits || [];

      for (const split of splits) {
        const owedBy = split.user_id;
        const amount = Number(split.amount);

        if (paidBy === currentUserId && owedBy !== currentUserId) {
          // Current user paid, someone else owes them
          balanceMap[owedBy] = (balanceMap[owedBy] || 0) + amount;
        } else if (owedBy === currentUserId && paidBy !== currentUserId) {
          // Current user owes someone else
          balanceMap[paidBy] = (balanceMap[paidBy] || 0) - amount;
        }
      }
    }

    // Convert to balance items
    const balanceItems: { person: Profile; amount: number; direction: 'owe' | 'owed' }[] = [];
    
    for (const [userId, amount] of Object.entries(balanceMap)) {
      if (Math.abs(amount) > 0.01) {
        const person = profiles.find(p => p.id === userId);
        if (person) {
          balanceItems.push({
            person: person as Profile,
            amount: Math.abs(amount),
            direction: amount > 0 ? 'owed' : 'owe',
          });
        }
      }
    }

    setBalances(balanceItems);
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/groups')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-display font-bold">{group.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {members.length} member{members.length !== 1 ? 's' : ''} • {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Group Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Invite Dialog */}
          {group && (
            <InviteMemberDialog
              groupId={group.id}
              groupName={group.name}
              open={inviteDialogOpen}
              onOpenChange={setInviteDialogOpen}
              onInviteSent={fetchGroupData}
            />
          )}

          {/* Balance Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">You're owed</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {defaultCurrency?.symbol || '$'}
                      {balances.filter(b => b.direction === 'owed').reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">You owe</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {defaultCurrency?.symbol || '$'}
                      {balances.filter(b => b.direction === 'owe').reduce((sum, b) => sum + b.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">
                      {defaultCurrency?.symbol || '$'}{expenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="expenses" className="space-y-4">
            <TabsList>
              <TabsTrigger value="expenses" className="gap-2">
                <Receipt className="h-4 w-4" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="balances" className="gap-2">
                <Wallet className="h-4 w-4" />
                Balances
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses">
              {expenses.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Add your first expense to start tracking
                    </p>
                    <Button onClick={() => navigate(`/add-expense?group=${id}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {expenses.map((expense) => (
                        <div 
                          key={expense.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                              <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(expense.expense_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold">
                            ${Number(expense.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="mt-4">
                <Button onClick={() => navigate(`/add-expense?group=${id}`)} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="balances">
              {defaultCurrency && currentUserProfile && (
                <BalanceCard
                  balances={balances}
                  currency={defaultCurrency}
                  groupId={id!}
                  currentUserId={user.uid}
                  currentUserProfile={currentUserProfile}
                  onSettlementComplete={fetchGroupData}
                />
              )}
              {!defaultCurrency && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                      <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Loading balances...</h3>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Group Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                            {member.full_name?.[0] || member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'admin' && (
                            <Badge variant="default" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                          {member.id === group.owner_id && (
                            <Badge variant="secondary">Owner</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
