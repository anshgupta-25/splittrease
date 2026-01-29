/**
 * Firebase Configuration and Initialization
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

console.log('🚀 Firebase module loading...');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB6hApCIm-klLA_hm5Vsyax_0Q1jooNf3s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "splitwise-bd5c0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "splitwise-bd5c0",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:277592669825:web:8b170c154ad942af755780",
};

console.log('✅ Firebase config loaded');

let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized');
} catch (error) {
  console.error('❌ Firebase error:', error);
  throw error;
}

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

console.log('✅ Firebase ready');

export { app };
