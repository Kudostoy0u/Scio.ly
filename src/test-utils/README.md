# Scio.ly Test Utilities Directory Documentation

## Overview

The `src/test-utils/` directory contains testing utilities and providers for the Scio.ly platform. This directory provides comprehensive testing infrastructure including mock providers, test setup utilities, and testing helpers.

## Directory Structure

### `index.tsx`
- **Purpose**: Main testing utilities and setup functions
- **Features**: 
  - Custom render function with providers
  - Comprehensive mocking system
  - Test environment setup and cleanup
  - Mock implementations for external dependencies

### `test-providers.tsx`
- **Purpose**: Test provider components for React testing
- **Features**:
  - Test provider wrapper components
  - Mock provider implementations
  - Context provider testing utilities

## Key Features

### 1. Testing Infrastructure
- **Custom Render Function**: `renderWithProviders()` with full context
- **Mock Providers**: Simplified providers for testing
- **Test Environment**: Complete test environment setup
- **Cleanup Utilities**: Test cleanup and teardown

### 2. Mock System
- **Supabase Mocking**: Complete Supabase client mocking
- **Database Mocking**: Database connection and query mocking
- **Service Mocking**: AI and team service mocking
- **Next.js Mocking**: Router and navigation mocking

### 3. Provider Testing
- **Theme Provider**: Theme context testing
- **Auth Provider**: Authentication context testing
- **Notifications Provider**: Notification context testing
- **Mock Providers**: Simplified provider implementations

### 4. Test Utilities
- **Storage Mocking**: LocalStorage and SessionStorage mocking
- **Browser API Mocking**: Window APIs and browser features
- **Network Mocking**: Fetch and HTTP request mocking
- **Performance Mocking**: Performance API mocking

## Detailed Implementation

### `index.tsx` - Main Testing Utilities

#### Mock Implementations

##### Supabase Server Mocking
```typescript
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
```

##### Supabase Client Mocking
```typescript
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
```

##### Database Pool Mocking
```typescript
vi.mock('@/lib/db/pool', () => ({
  pool: {
    query: vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
    connect: vi.fn(() => Promise.resolve({ release: vi.fn() })),
    end: vi.fn(() => Promise.resolve()),
  },
}));
```

##### Drizzle Database Mocking
```typescript
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
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ insertId: 'mock-id' })),
    update: vi.fn(() => Promise.resolve({ affectedRows: 1 })),
    delete: vi.fn(() => Promise.resolve({ affectedRows: 1 })),
  },
  testConnection: vi.fn(() => Promise.resolve(true)),
  closeConnection: vi.fn(() => Promise.resolve()),
}));
```

##### Service Mocking
```typescript
// Gemini service mocking
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

// Teams service mocking
vi.mock('@/lib/services/teams', () => ({
  teamsService: {
    getTeamMembers: vi.fn(() => Promise.resolve([])),
    createTeam: vi.fn(() => Promise.resolve({ id: 'mock-team-id' })),
    joinTeam: vi.fn(() => Promise.resolve({ success: true })),
    getUserTeams: vi.fn(() => Promise.resolve([])),
  },
}));
```

#### Custom Render Function
```typescript
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
```

#### Mock Implementations

##### Next.js Router Mocking
```typescript
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const mockNavigation = {
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
};
```

##### Fetch Mocking
```typescript
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
```

##### Storage Mocking
```typescript
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

export const mockLocalStorage = new MockStorage();
export const mockSessionStorage = new MockStorage();
```

#### Test Environment Setup
```typescript
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
```

### `test-providers.tsx` - Test Provider Components

#### Test Providers
```typescript
export function TestProviders({ 
  children, 
  initialDarkMode = false, 
  initialUser = null 
}: TestProvidersProps) {
  return (
    <ThemeProvider initialDarkMode={initialDarkMode}>
      <AuthProvider initialUser={initialUser}>
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

#### Mock Providers
```typescript
export function MockThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="mock-theme-provider">
      {children}
    </div>
  );
}

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  );
}
```

## Usage Examples

### Basic Component Testing
```typescript
import { renderWithProviders, setupTestEnvironment } from '@/test-utils';

describe('Component Test', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it('renders component correctly', () => {
    const { getByText } = renderWithProviders(
      <MyComponent />,
      { initialDarkMode: true, initialUser: mockUser }
    );
    
    expect(getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testing with Custom Providers
```typescript
import { TestProviders } from '@/test-utils/test-providers';

describe('Component with Custom Providers', () => {
  it('renders with custom theme', () => {
    const { getByTestId } = render(
      <TestProviders initialDarkMode={true}>
        <MyComponent />
      </TestProviders>
    );
    
    expect(getByTestId('component')).toBeInTheDocument();
  });
});
```

### Testing with Mocked Services
```typescript
import { vi } from 'vitest';
import { renderWithProviders } from '@/test-utils';

describe('Service Integration Test', () => {
  it('calls service correctly', async () => {
    const mockService = vi.fn(() => Promise.resolve({ data: 'test' }));
    
    const { getByText } = renderWithProviders(
      <ComponentThatUsesService />
    );
    
    // Test service interaction
    expect(mockService).toHaveBeenCalled();
  });
});
```

## Key Features

### 1. Comprehensive Mocking
- **External Dependencies**: Complete mocking of external services
- **Browser APIs**: Mocking of browser-specific APIs
- **React Context**: Mocking of React context providers
- **Database Operations**: Mocking of database operations

### 2. Test Environment Management
- **Setup**: Automated test environment setup
- **Cleanup**: Proper test cleanup and teardown
- **Isolation**: Test isolation and independence
- **Configuration**: Flexible test configuration

### 3. Provider Testing
- **Context Providers**: Full context provider testing
- **Mock Providers**: Simplified provider implementations
- **Custom Render**: Custom render function with providers
- **Provider Isolation**: Individual provider testing

### 4. Utility Functions
- **Storage Mocking**: LocalStorage and SessionStorage mocking
- **Network Mocking**: HTTP request and response mocking
- **Performance Mocking**: Performance API mocking
- **Browser Mocking**: Browser feature mocking

## Dependencies

### Core Dependencies
- **Vitest**: Testing framework
- **React Testing Library**: React component testing
- **TypeScript**: Type safety
- **React**: Component testing

### Mock Dependencies
- **Supabase**: Authentication and database mocking
- **Next.js**: Router and navigation mocking
- **Browser APIs**: Browser feature mocking
- **Storage APIs**: Storage mocking

---

*This documentation provides a comprehensive overview of the Scio.ly testing utilities and infrastructure.*
