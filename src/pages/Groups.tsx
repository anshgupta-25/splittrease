import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Users,
  Search,
  Plane,
  Home,
  Heart,
  Users2,
  Briefcase,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { PendingInvitations } from '@/components/groups/PendingInvitations';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Group } from '@/types/database';

const categoryIcons: Record<string, React.ReactNode> = {
  trip: <Plane className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  couple: <Heart className="h-5 w-5" />,
  friends: <Users2 className="h-5 w-5" />,
  office: <Briefcase className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  trip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  home: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  couple: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  friends: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  office: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function Groups() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data as Group[]);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">Your Groups</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track expenses with your groups
              </p>
            </div>
            <Button onClick={() => navigate('/groups/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Pending Invitations */}
          <PendingInvitations />

          {/* Groups Grid */}
          {loadingData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-44 animate-pulse bg-muted" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                  <Users className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">
                  {searchQuery ? 'No groups found' : 'No groups yet'}
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Create your first group to start splitting expenses with friends, family, or roommates'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate('/groups/new')} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="glass-card border-0 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${categoryColors[group.category] || categoryColors.other}`}>
                          {categoryIcons[group.category] || categoryIcons.other}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[group.category] || categoryColors.other}`}>
                            {group.category}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {group.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium ring-2 ring-background">
                            You
                          </div>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          $0.00
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
