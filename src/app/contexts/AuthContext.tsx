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


    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });


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


  useEffect(() => {
    const syncProfileFromAuth = async () => {
      console.log('syncProfileFromAuth called with user:', user);
      if (!user) {
        console.log('No user, returning early');
        return;
      }
      if (hasSyncedRef.current === user.id) {
        console.log('Already synced for user ID:', user.id);
        return;
      }


      if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
        console.warn('Invalid user ID for profile sync:', user.id);
        return;
      }

      try {
        const isGoogle = (user as any)?.app_metadata?.provider === 'google'
          || Array.isArray((user as any)?.identities) && (user as any).identities.some((i: any) => i.provider === 'google');


        const { data: existing, error: readError } = await (supabase as any)
          .from('users')
          .select('id, email, first_name, last_name, display_name, username, photo_url')
          .eq('id', user.id)
          .maybeSingle();

        if (readError) {
          console.warn('Error reading existing profile:', readError);

        }


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
        const username = existing?.username || (email ? email.split('@')[0] : 'user_' + user.id.slice(0, 8));
        const displayName = existing?.display_name || full || given || null;
        const photoUrl = existing?.photo_url || meta.avatar_url || meta.picture || null;



        const shouldForceUpdateNames = Boolean(isGoogle) && (firstName || lastName);
        const shouldFillMissing = !isGoogle && (!existing?.first_name || !existing?.last_name);

        if (!existing || shouldForceUpdateNames || shouldFillMissing || !existing.display_name || !existing.username || !existing.photo_url) {

          if (!user.id || !email || !username) {
            console.warn('Missing required user fields for upsert:', { id: user.id, email, username });
            return;
          }


          if (typeof user.id !== 'string' || user.id.trim() === '' || 
              typeof email !== 'string' || email.trim() === '' ||
              typeof username !== 'string' || username.trim() === '') {
            console.warn('Invalid field types or empty values for upsert:', { 
              id: user.id, idType: typeof user.id, 
              email, emailType: typeof email, 
              username, usernameType: typeof username 
            });
            return;
          }

          const upsertPayload: Record<string, any> = {
            id: user.id.trim(),
            email: email.trim(),
            username: username.trim(),
          };
          

          if (shouldForceUpdateNames || (!existing?.first_name && firstName !== null)) {
            if (firstName !== null && firstName !== undefined) {
              upsertPayload.first_name = firstName;
            }
          }
          if (shouldForceUpdateNames || (!existing?.last_name && lastName !== undefined)) {
            if (lastName !== undefined) {
              upsertPayload.last_name = lastName;
            }
          }
          if (!existing?.display_name && displayName !== undefined) {
            if (displayName !== null && displayName !== undefined) {
              upsertPayload.display_name = displayName;
            }
          }
          if (!existing?.photo_url && photoUrl) {
            if (photoUrl !== null && photoUrl !== undefined) {
              upsertPayload.photo_url = photoUrl;
            }
          }


          try {
            console.log('Attempting upsert with payload:', upsertPayload);
            const { error: upsertError } = await (supabase as any)
              .from('users')
              .upsert(upsertPayload as any, { onConflict: 'id' });
            
            if (upsertError) {
              console.warn('Failed to upsert user profile:', upsertError);
            } else {
              console.log('Successfully upserted user profile');
            }
          } catch (error) {
            console.warn('Error upserting user profile:', error);
          }
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