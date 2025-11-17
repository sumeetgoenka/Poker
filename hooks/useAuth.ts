'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if Firebase is not configured (during build or missing env vars)
    if (!isFirebaseConfigured()) {
      setError('Firebase is not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    try {
      const authInstance = auth;
      const unsubscribe = onAuthStateChanged(
        authInstance,
        (user) => {
          setUser(user);
          setLoading(false);

          // Auto sign in anonymously if not authenticated
          if (!user) {
            signInAnonymously(authInstance).catch((err) => {
              setError(err.message);
              setLoading(false);
            });
          }
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError('Failed to initialize authentication');
      setLoading(false);
    }
  }, []);

  return { user, loading, error };
}
