'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialDarkMode }: { children: React.ReactNode; initialDarkMode?: boolean }) {
  // Compute initial theme synchronously. On first render, prefer the server-provided
  // initialDarkMode (from cookie) to guarantee SSR/CSR match and avoid hydration errors.
  const getInitialDarkMode = (): boolean => {
    // Always mirror the server value during SSR and the very first client render
    // to guarantee markup parity and avoid hydration mismatches.
    // If the server didn't provide a cookie-derived value, default to light.
    return initialDarkMode ?? false;
  };

  // Internal state setter to allow initialization without persisting
  const [darkMode, setDarkModeState] = useState<boolean>(getInitialDarkMode);

  // Exposed setter that also persists the choice and writes a cookie
  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    if (typeof document !== 'undefined') {
      // Persist in cookie for SSR parity
      document.cookie = `theme=${value ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', value ? 'dark' : 'light');
    }
  };

  // After mount, if user has a stored preference, sync it once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      const prefersDark = storedTheme === 'dark';
      if (prefersDark !== darkMode) {
        setDarkModeState(prefersDark);
        // Keep cookie in sync
        document.cookie = `theme=${prefersDark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
      }
      return;
    }
    // If no stored preference, follow system preference changes live
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setDarkModeState(e.matches);
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [darkMode]);

  // Reflect theme on <html> to power CSS selectors for scrollbar & colors
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.classList.toggle('dark-scrollbar', darkMode);
    root.classList.toggle('light-scrollbar', !darkMode);
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined || context == null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}