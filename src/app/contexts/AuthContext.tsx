'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient<any, 'public', any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser }: { children: ReactNode, initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
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

    // Initial load (skip if initialUser was provided by server)
    const getInitialSession = async () => {
      if (initialUser) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const upsertUserProfile = async (user: User) => {
    try {
      const emailLocal = (user.email || '').split('@')[0] || 'user';
      const fullName: string | undefined = (user.user_metadata?.name as string | undefined) || (user.user_metadata?.full_name as string | undefined) || undefined;
      const username = emailLocal;

      const upsertRow: Record<string, unknown> = {
        id: String(user.id),
        email: user.email || '',
        username,
        photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      };
      if (fullName && fullName.trim()) {
        upsertRow.display_name = fullName.trim();
      }

      const { error } = await supabase
        .from('users')
        .upsert(upsertRow as any, { onConflict: 'id' });
      
      if (error) {
        console.error('Error upserting user profile:', error);
      }
    } catch (error) {
      console.error('Exception during user profile upsert:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    supabase: supabase as unknown as SupabaseClient<any, 'public', any>
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
