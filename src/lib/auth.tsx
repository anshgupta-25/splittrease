/**
 * Firebase Authentication Context
 * 
 * Provides authentication state and methods throughout the application.
 * Uses Firebase Authentication with Google OAuth and Email/Password.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null; user?: FirebaseUser }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result first (for mobile/production)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('✅ Google Sign-In successful (redirect):', result.user.email);
        }
      })
      .catch((error) => {
        if (error.code !== 'auth/popup-closed-by-user') {
          console.error('❌ Redirect result error:', error);
        }
      });

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('�� Auth state changed:', firebaseUser?.email || 'No user');
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      console.log('✅ User signed up successfully:', email);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User signed in successfully:', email);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔄 Starting Google Sign-In...');
      
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('✅ Google Sign-In successful (popup):', user.email);
        return { error: null, user };
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          console.log('🔄 Popup blocked, using redirect method...');
          await signInWithRedirect(auth, googleProvider);
          return { error: null };
        }
        throw popupError;
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return { error: new Error('Sign-in cancelled') };
      } else if (error.code === 'auth/popup-blocked') {
        return { error: new Error('Please allow popups for this site') };
      }
      console.error('❌ Google Sign-In error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent to:', email);
      return { error: null };
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
