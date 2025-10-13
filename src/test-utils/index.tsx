import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { TestProviders } from './test-providers';

// Mock Supabase Server
vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  getServerUser: vi.fn(() => Promise.resolve(null)),
}));

// Mock Supabase Client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock database pool
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
    connect: vi.fn(() => Promise.resolve({ release: vi.fn() })),
    end: vi.fn(() => Promise.resolve()),
  },
}));

// Mock postgres connection
vi.mock('postgres', () => {
  return vi.fn(() => ({
    end: vi.fn(() => Promise.resolve()),
  }));
});

// Mock Drizzle database
vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([
              {
                id: 'test-id-1',
                question: 'Test question 1',
                tournament: 'Test Tournament',
                division: 'C',
                event: 'Test Event',
                difficulty: '0.5',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                answers: ['A'],
                subtopics: ['Test Topic'],
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                randomF: 0.5
              }
            ])),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([
            {
              id: 'test-id-1',
              question: 'Test question 1',
              tournament: 'Test Tournament',
              division: 'C',
              event: 'Test Event',
              difficulty: '0.5',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              answers: ['A'],
              subtopics: ['Test Topic'],
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
              randomF: 0.5
            }
          ])),
        })),
        limit: vi.fn(() => Promise.resolve([
          {
            id: 'test-id-1',
            question: 'Test question 1',
            tournament: 'Test Tournament',
            division: 'C',
            event: 'Test Event',
            difficulty: '0.5',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answers: ['A'],
            subtopics: ['Test Topic'],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            randomF: 0.5
          }
        ])),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ insertId: 'mock-id' })),
    update: vi.fn(() => Promise.resolve({ affectedRows: 1 })),
    delete: vi.fn(() => Promise.resolve({ affectedRows: 1 })),
  },
  testConnection: vi.fn(() => Promise.resolve(true)),
  closeConnection: vi.fn(() => Promise.resolve()),
}));

// Mock Gemini service
vi.mock('@/lib/services/gemini', () => ({
  GeminiService: {
    getInstance: vi.fn(() => ({
      explainQuestion: vi.fn(() => Promise.resolve('Mock explanation')),
      gradeFreeResponse: vi.fn(() => Promise.resolve({ score: 5, feedback: 'Mock feedback' })),
      analyzeQuestion: vi.fn(() => Promise.resolve({ difficulty: 'medium', topics: ['biology'] })),
      suggestEdit: vi.fn(() => Promise.resolve('Mock edit suggestion')),
    })),
  },
}));

// Mock teams service
vi.mock('@/lib/services/teams', () => ({
  teamsService: {
    getTeamMembers: vi.fn(() => Promise.resolve([])),
    createTeam: vi.fn(() => Promise.resolve({ id: 'mock-team-id' })),
    joinTeam: vi.fn(() => Promise.resolve({ success: true })),
    getUserTeams: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock team data service
vi.mock('@/lib/services/team-data', () => ({
  getTeamData: vi.fn(() => Promise.resolve({ team: null, members: [] })),
  updateTeamData: vi.fn(() => Promise.resolve({ success: true })),
}));

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialDarkMode?: boolean;
    initialUser?: any;
  }
) {
  const { initialDarkMode, initialUser, ...renderOptions } = options || {};
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders 
        initialDarkMode={initialDarkMode} 
        initialUser={initialUser}
      >
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock Next.js router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

// Mock Next.js navigation
export const mockNavigation = {
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
};

// Mock fetch
export const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: vi.fn(() => Promise.resolve(new Blob())),
    formData: vi.fn(() => Promise.resolve(new FormData())),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    bytes: vi.fn(() => Promise.resolve(new Uint8Array())),
  } as unknown as Response)
);

// Create a proper storage implementation for tests
class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

// Mock localStorage
export const mockLocalStorage = new MockStorage();

// Mock sessionStorage
export const mockSessionStorage = new MockStorage();

// Setup function for tests
export function setupTestEnvironment() {
  // Mock global fetch
  global.fetch = mockFetch;
  
  // Mock localStorage
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  
  // Mock sessionStorage
  Object.defineProperty(global, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  });
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock scrollTo
  global.scrollTo = vi.fn();
  
  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'mock-url');
  global.URL.revokeObjectURL = vi.fn();
  
  // Mock crypto.randomUUID
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: vi.fn(() => 'mock-uuid'),
  });
  
  // Mock performance.now
  Object.defineProperty(global.performance, 'now', {
    value: vi.fn(() => Date.now()),
  });
  
  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0) as any);
  global.cancelAnimationFrame = vi.fn();
}

// Cleanup function for tests
export function cleanupTestEnvironment() {
  vi.clearAllMocks();
  if (mockLocalStorage && typeof mockLocalStorage.clear === 'function') {
    mockLocalStorage.clear();
  }
  if (mockSessionStorage && typeof mockSessionStorage.clear === 'function') {
    mockSessionStorage.clear();
  }
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { vi } from 'vitest';
