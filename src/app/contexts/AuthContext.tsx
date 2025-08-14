'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  client: SupabaseClient<any, 'public', any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState<boolean>(true);
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(data.session?.user ?? null);
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // If SSR provided a user, we can render immediately but still sync the client session once
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    // Lightweight recovery on focus/visibility change
    const resync = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(data.session?.user ?? null);
      } catch {
        /* noop */
      }
    };
    const onFocus = () => void resync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [initialUser]);

  // After login (including Google OAuth), sync profile names in `users` table
  useEffect(() => {
    const syncProfileFromAuth = async () => {
      if (!user) return;
      if (hasSyncedRef.current === user.id) return;

      try {
        const isGoogle = (user as any)?.app_metadata?.provider === 'google'
          || Array.isArray((user as any)?.identities) && (user as any).identities.some((i: any) => i.provider === 'google');

        // Read existing profile
        const { data: existing, error: readError } = await (supabase as any)
          .from('users')
          .select('id, email, first_name, last_name, display_name, username, photo_url')
          .eq('id', user.id)
          .maybeSingle();

        if (readError) {
          // Non-fatal; continue with sensible defaults
        }

        // Extract names from OAuth metadata if available
        const meta: any = user.user_metadata || {};
        const given = (meta.given_name || meta.givenName || '').toString().trim();
        const family = (meta.family_name || meta.familyName || '').toString().trim();
        const full = (meta.name || meta.full_name || meta.fullName || '').toString().trim();

        let firstName: string | null = null;
        let lastName: string | null = null;

        if (given || family) {
          firstName = given || null;
          lastName = family || null;
        } else if (full) {
          const parts = full.split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          } else if (parts.length === 1) {
            firstName = parts[0];
            lastName = null;
          }
        }

        const email = user.email || (existing?.email ?? '');
        const username = existing?.username || (email ? email.split('@')[0] : null);
        const displayName = existing?.display_name || full || given || null;
        const photoUrl = existing?.photo_url || meta.avatar_url || meta.picture || null;

        // If this session is Google OAuth, always update names from Google/derived
        // Otherwise, only fill if missing
        const shouldForceUpdateNames = Boolean(isGoogle) && (firstName || lastName);
        const shouldFillMissing = !isGoogle && (!existing?.first_name || !existing?.last_name);

        if (!existing || shouldForceUpdateNames || shouldFillMissing || !existing.display_name || !existing.username || !existing.photo_url) {
          const upsertPayload: Record<string, any> = {
            id: user.id,
            email,
          };
          if (shouldForceUpdateNames || (!existing?.first_name && firstName !== null)) upsertPayload.first_name = firstName;
          if (shouldForceUpdateNames || (!existing?.last_name && lastName !== undefined)) upsertPayload.last_name = (lastName ?? null);
          if (!existing?.display_name && displayName !== undefined) upsertPayload.display_name = displayName;
          if (!existing?.username && username) upsertPayload.username = username;
          if (!existing?.photo_url && photoUrl) upsertPayload.photo_url = photoUrl;

          await (supabase as any)
            .from('users')
            .upsert(upsertPayload as any, { onConflict: 'id' });
        }

        hasSyncedRef.current = user.id;
      } catch {
        // swallow; non-critical
      }
    };

    void syncProfileFromAuth();
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    client: supabase as unknown as SupabaseClient<any, 'public', any>,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
