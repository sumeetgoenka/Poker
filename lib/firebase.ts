import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

// Check if we're in a browser environment and if Firebase is configured
const isBrowser = typeof window !== 'undefined';
const isConfigured = isBrowser && firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if configured and in browser
let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isConfigured) {
  // Only initialize if not already initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

// Export instances directly (will be undefined during SSR/build)
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const firebaseApp = app;

// Export a function to check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return Boolean(isConfigured);
};

export default app;
