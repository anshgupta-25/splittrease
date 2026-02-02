import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  DollarSign,
  Calendar,
  FileText,
  Users,
  Loader2,
  Percent,
  Split
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { MemberSelector } from '@/components/expenses/MemberSelector';
import { PaidBySelector } from '@/components/expenses/PaidBySelector';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Group, Currency, Profile } from '@/types/database';

const categories = [
  { id: 'food', label: 'Food & Drinks', icon: '🍕' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'bills', label: 'Bills', icon: '📄' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const splitTypes = [
  { id: 'equal', label: 'Equal', icon: Split, description: 'Split equally among all' },
  { id: 'custom', label: 'Custom', icon: DollarSign, description: 'Specify exact amounts' },
  { id: 'percentage', label: 'Percentage', icon: Percent, description: 'Split by percentage' },
];

export default function AddExpense() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0],
    group_id: searchParams.get('group') || '',
    currency_id: '',
    split_type: 'equal' as 'equal' | 'custom' | 'percentage',
    notes: '',
    paid_by: '',
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.group_id) {
      fetchGroupMembers(formData.group_id);
    }
  }, [formData.group_id]);

  // Set paid_by to current user when user is loaded
  useEffect(() => {
    if (user?.uid && !formData.paid_by) {
      setFormData(prev => ({ ...prev, paid_by: user.uid }));
    }
  }, [user?.uid]);

  const fetchData = async () => {
    try {
      const [groupsRes, currenciesRes] = await Promise.all([
        supabase.from('groups').select('*').order('name'),
        supabase.from('currencies').select('*'),
      ]);

      if (groupsRes.data) setGroups(groupsRes.data as Group[]);
      if (currenciesRes.data) {
        setCurrencies(currenciesRes.data as Currency[]);
        const usd = currenciesRes.data.find(c => c.code === 'USD');
        if (usd) {
          setFormData(prev => ({ ...prev, currency_id: usd.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (profiles) {
          setGroupMembers(profiles as Profile[]);
          // Auto-select all members for equal split
          setSelectedMembers(profiles.map(p => p.id));
        }
      } else {
        setGroupMembers([]);
        setSelectedMembers([]);
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description for the expense',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.group_id) {
      toast({
        title: 'Group required',
        description: 'Please select a group',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.paid_by) {
      toast({
        title: 'Payer required',
        description: 'Please select who paid for this expense',
        variant: 'destructive',
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: 'Select members',
        description: 'Please select at least one member to split with',
        variant: 'destructive',
      });
      return;
    }

    // Validate custom amounts or percentages
    if (formData.split_type === 'custom') {
      const totalAssigned = selectedMembers.reduce((sum, id) => {
        return sum + (parseFloat(customAmounts[id]) || 0);
      }, 0);
      if (Math.abs(totalAssigned - parseFloat(formData.amount)) > 0.01) {
        toast({
          title: 'Amounts don\'t match',
          description: 'Custom amounts must equal the total expense amount',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.split_type === 'percentage') {
      const totalPercent = selectedMembers.reduce((sum, id) => {
        return sum + (parseFloat(customAmounts[id]) || 0);
      }, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        toast({
          title: 'Percentages don\'t add up',
          description: 'Percentages must total 100%',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: formData.description.trim(),
          amount: parseFloat(formData.amount),
          category: formData.category,
          expense_date: formData.expense_date,
          group_id: formData.group_id,
          currency_id: formData.currency_id,
          split_type: formData.split_type,
          notes: formData.notes.trim() || null,
          paid_by: formData.paid_by,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Calculate and create expense splits
      const totalAmount = parseFloat(formData.amount);
      const splits = selectedMembers.map(userId => {
        let splitAmount: number;
        let percentage: number | null = null;

        if (formData.split_type === 'equal') {
          splitAmount = totalAmount / selectedMembers.length;
          percentage = 100 / selectedMembers.length;
        } else if (formData.split_type === 'custom') {
          splitAmount = parseFloat(customAmounts[userId]) || 0;
          percentage = (splitAmount / totalAmount) * 100;
        } else {
          percentage = parseFloat(customAmounts[userId]) || 0;
          splitAmount = (percentage / 100) * totalAmount;
        }

        return {
          expense_id: expense.id,
          user_id: userId,
          amount: splitAmount,
          percentage: percentage,
        };
      });

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitError) throw splitError;

      toast({
        title: 'Expense added!',
        description: 'Your expense has been recorded successfully.',
      });
      
      navigate(`/groups/${formData.group_id}`);
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add expense',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-display font-bold">Add Expense</h1>
            <p className="text-muted-foreground mt-1">
              Record a new expense to split with your group
            </p>
          </div>

          {/* Form */}
          <Card className="glass-card border-0">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.currency_id} 
                      onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="USD" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.symbol} {currency.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="pl-10 h-12 text-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="description"
                      placeholder="What was this expense for?"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Group */}
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Select 
                    value={formData.group_id} 
                    onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select a group" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <Label>Category</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((cat) => {
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-transparent bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-xs font-medium truncate w-full text-center">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Split Type */}
                <div className="space-y-3">
                  <Label>Split Type</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {splitTypes.map((split) => {
                      const Icon = split.icon;
                      const isSelected = formData.split_type === split.id;
                      return (
                        <button
                          key={split.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, split_type: split.id as 'equal' | 'custom' | 'percentage' })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-transparent bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-sm font-medium">{split.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Paid By */}
                {groupMembers.length > 0 && (
                  <PaidBySelector
                    members={groupMembers}
                    selectedPayer={formData.paid_by}
                    onPayerChange={(payerId) => setFormData({ ...formData, paid_by: payerId })}
                    currentUserId={user?.uid || ''}
                  />
                )}

                {/* Member Selection for Split */}
                {groupMembers.length > 0 && (
                  <MemberSelector
                    members={groupMembers}
                    selectedMembers={selectedMembers}
                    onSelectionChange={setSelectedMembers}
                    splitType={formData.split_type}
                    customAmounts={customAmounts}
                    onCustomAmountChange={(userId, amount) => {
                      setCustomAmounts(prev => ({ ...prev, [userId]: amount }));
                    }}
                    totalAmount={parseFloat(formData.amount) || 0}
                  />
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Submit */}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Expense'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
