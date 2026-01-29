import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { AuthForm } from '@/components/auth/AuthForm';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const initialMode = mode === 'signup' ? 'signup' : mode === 'reset' ? 'reset' : 'signin';
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AuthForm initialMode={initialMode} onSuccess={handleSuccess} />
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 text-center text-white p-12"
        >
          <motion.div
            className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-lg"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <span className="text-5xl font-bold">$</span>
          </motion.div>
          
          <h2 className="text-4xl font-display font-bold mb-4">
            Split expenses,<br />not friendships
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            Track shared expenses, settle debts, and keep your group finances organized — all in one place.
          </p>

          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-sm text-white/70">Active Users</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold">$2M+</p>
              <p className="text-sm text-white/70">Tracked</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-sm text-white/70">Expenses Split</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
