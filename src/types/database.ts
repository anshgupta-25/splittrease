export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  category: 'trip' | 'home' | 'couple' | 'friends' | 'office' | 'other';
  image_url: string | null;
  default_currency_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  paid_by: string;
  currency_id: string;
  split_type: 'equal' | 'custom' | 'percentage';
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  percentage: number | null;
  is_settled: boolean;
  created_at: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface GroupWithDetails extends Group {
  members?: (GroupMember & { profile: Profile })[];
  default_currency?: Currency;
}

export interface ExpenseWithDetails extends Expense {
  paid_by_profile?: Profile;
  currency?: Currency;
  splits?: (ExpenseSplit & { user: Profile })[];
}

export interface Balance {
  userId: string;
  userName: string;
  amount: number;
  currency: Currency;
}

export interface BalanceSummary {
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
  currency: Currency;
}
