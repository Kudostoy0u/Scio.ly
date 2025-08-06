'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        // Upsert user profile on sign-in
        if (_event === 'SIGNED_IN' && session?.user) {
          upsertUserProfile(session.user);
        }
      }
    );

    // Initial load
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const upsertUserProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.user_metadata?.full_name || null,
          photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        }, { onConflict: 'id' });
      
      if (error) {
        console.error('Error upserting user profile:', error);
      }
    } catch (error) {
      console.error('Exception during user profile upsert:', error);
    }
  };

  const value = {
    user,
    loading,
    supabase
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
