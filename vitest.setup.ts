import '@testing-library/jest-dom';

// Mock next/navigation if needed
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined })
}));

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


