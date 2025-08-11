import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types/database';

// Declare minimal process typing so TS is happy, while keeping Next's env inlining intact
declare const process: { env: { NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string } };

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Singleton browser client that persists session to cookies for SSR interoperability
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const supabase = (() => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      db: { schema: 'public' },
    });
  }
  return browserClient;
})();

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return data.user ?? null;
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && (error as any).code !== 'PGRST116') {
    console.error('Error getting user profile:', error);
    return null;
  }

  return data;
}