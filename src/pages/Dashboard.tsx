import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  ArrowRight,
  Wallet,
  Utensils,
  Car,
  Plane,
  Home,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Group, Currency } from '@/types/database';

const categoryIcons: Record<string, React.ReactNode> = {
  food: <Utensils className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  travel: <Plane className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const groupCategoryColors: Record<string, string> = {
  trip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  home: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  couple: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  friends: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  office: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [groupsRes, currenciesRes] = await Promise.all([
        supabase.from('groups').select('*').order('created_at', { ascending: false }),
        supabase.from('currencies').select('*'),
      ]);

      if (groupsRes.data) setGroups(groupsRes.data as Group[]);
      if (currenciesRes.data) setCurrencies(currenciesRes.data as Currency[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">
                Welcome back! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your shared expenses
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/groups/new')}>
                <Users className="h-4 w-4 mr-2" />
                New Group
              </Button>
              <Button onClick={() => navigate('/add-expense')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">You're owed</p>
                    <p className="text-2xl font-bold money-positive">$0.00</p>
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
                    <p className="text-2xl font-bold money-negative">$0.00</p>
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
                    <p className="text-sm text-muted-foreground">Net Balance</p>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Groups Section */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Your Groups</h2>
              <Link to="/groups">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {loadingData ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-32 animate-pulse bg-muted" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first group to start splitting expenses
                  </p>
                  <Button onClick={() => navigate('/groups/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.slice(0, 6).map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={`/groups/${group.id}`}>
                      <Card className="glass-card border-0 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${groupCategoryColors[group.category] || groupCategoryColors.other}`}>
                                {group.category}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {group.description || 'No description'}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex -space-x-2">
                              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium ring-2 ring-background">
                                You
                              </div>
                            </div>
                            <p className="text-sm font-medium text-primary">
                              View →
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Recent Activity</h2>
              <Link to="/activity">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first expense to see activity here
                </p>
                <Button onClick={() => navigate('/add-expense')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
