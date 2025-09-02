import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './types/database';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return (cookieStore as any).get(name)?.value as string | undefined;
      },
      set(name: string, value: string, options?: Record<string, unknown>) {
        try {
          (cookieStore as any).set({ name, value, ...(options || {}) });
        } catch {
          // ignore in read-only contexts
        }
      },
      remove(name: string, options?: Record<string, unknown>) {
        try {

          (cookieStore as any).set({ name, value: '', maxAge: 0, ...(options || {}) });
        } catch {
          // ignore in read-only contexts
        }
      },
    },
  });
}

export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

