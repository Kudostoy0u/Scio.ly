import '@testing-library/jest-dom';

// Mock next/navigation if needed
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined })
}));

vi.mock('next/navigation', () => {
  return {
    __esModule: true,
    useRouter: () => ({
      push: (_: string) => {},
      replace: (_: string) => {},
      prefetch: (_: string) => {},
      back: () => {}
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: () => { throw new Error('redirect called'); }
  };
});

// Basic ThemeContext mock default (can be overridden per test)
vi.mock('@/app/contexts/ThemeContext', async () => {
  return {
    useTheme: () => ({ darkMode: false })
  };
});

// Mock Header to avoid layout complexity
vi.mock('@/app/components/Header', () => ({
  __esModule: true,
  default: () => null
}));

// Mock Supabase browser client to avoid requiring env vars in tests
vi.mock('@/lib/supabase', () => {
  const mockFrom = () => {
    const chain = {
      select: (_cols?: string) => chain,
      eq: (_col?: string, _val?: any) => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async (_payload?: any, _opts?: any) => ({ error: null })
    } as any;
    return chain;
  };

  const supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } })
    },
    from: (_table: string) => mockFrom()
  } as any;

  return {
    __esModule: true,
    supabase,
    getCurrentUser: async () => null,
    getUserProfile: async () => null
  };
});

// Mock AuthContext to avoid requiring provider in component tests
vi.mock('@/app/contexts/AuthContext', () => {
  return {
    __esModule: true,
    useAuth: () => ({ user: null, loading: false, client: { auth: { getSession: async () => ({ data: { session: null } }) } } as any }),
    AuthProvider: ({ children }: any) => children
  };
});


