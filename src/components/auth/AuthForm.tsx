import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { GoogleSignInButton } from './GoogleSignInButton';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthFormProps {
  initialMode: AuthMode;
  onSuccess?: () => void;
}

export function AuthForm({ initialMode, onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      if (mode === 'signup') {
        signUpSchema.parse(formData);
      } else if (mode === 'signin') {
        signInSchema.parse(formData);
      } else {
        resetSchema.parse({ email: formData.email });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof typeof errors] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (mode === 'signup') {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welcome to SplitEase!',
            description: 'Your account has been created successfully.',
          });
          onSuccess?.();
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          onSuccess?.();
        }
      } else {
        const { error } = await resetPassword(formData.email);
        if (error) {
          toast({
            title: 'Reset failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link.',
          });
          setMode('signin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create your account';
      case 'signin': return 'Welcome back';
      case 'reset': return 'Reset your password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup': return 'Start splitting expenses with friends easily';
      case 'signin': return 'Sign in to continue managing your shared expenses';
      case 'reset': return 'Enter your email to receive a reset link';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <span className="text-xl font-bold text-primary-foreground">S</span>
        </div>
        <span className="font-display text-2xl font-bold">SplitEase</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">{getTitle()}</h1>
        <p className="text-muted-foreground">{getSubtitle()}</p>
      </div>

      {mode !== 'reset' && (
        <>
          <GoogleSignInButton />
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="pl-10"
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {mode !== 'reset' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {mode === 'signup' && 'Create Account'}
              {mode === 'signin' && 'Sign In'}
              {mode === 'reset' && 'Send Reset Link'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
          </>
        )}
        {mode === 'signin' && (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </button>
          </>
        )}
        {mode === 'reset' && (
          <>
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </motion.div>
  );
}
