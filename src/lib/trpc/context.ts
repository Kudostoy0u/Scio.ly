import { getServerUser } from '@/lib/supabaseServer';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const user = await getServerUser();
  
  // Only log in development and only show important business logic
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [TRPC CONTEXT] User authenticated:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
  }
  
  return {
    user: user || null,
    headers: opts?.req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

