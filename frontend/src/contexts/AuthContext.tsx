import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, AUTH_KEY, USER_KEY } from '../services/api';

export type User = {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  created_at: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogleSession: (sessionId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_KEY);
        const stored = await AsyncStorage.getItem(USER_KEY);
        if (token && stored) {
          setUser(JSON.parse(stored));
          try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
          } catch {
            await AsyncStorage.removeItem(AUTH_KEY);
            await AsyncStorage.removeItem(USER_KEY);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem(AUTH_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    await AsyncStorage.setItem(AUTH_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const signInWithGoogleSession = async (sessionId: string) => {
    const { data } = await api.post('/auth/google', { session_id: sessionId });
    await AsyncStorage.setItem(AUTH_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogleSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function formatApiError(e: any): string {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || 'დაფიქსირდა შეცდომა';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || JSON.stringify(x)).join(' ');
  return String(d);
}
