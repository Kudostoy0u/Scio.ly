'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialDarkMode }: { children: React.ReactNode; initialDarkMode?: boolean }) {

  // initialdarkmode (from cookie) to guarantee ssr/csr match and avoid hydration errors.
  const getInitialDarkMode = (): boolean => {

    // to guarantee markup parity and avoid hydration mismatches.

    return initialDarkMode ?? false;
  };


  const [darkMode, setDarkModeState] = useState<boolean>(getInitialDarkMode);


  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    if (typeof document !== 'undefined') {

      document.cookie = `theme=${value ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', value ? 'dark' : 'light');
    }
  };


  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      const prefersDark = storedTheme === 'dark';
      if (prefersDark !== darkMode) {
        setDarkModeState(prefersDark);

        document.cookie = `theme=${prefersDark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
      }
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setDarkModeState(e.matches);
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [darkMode]);


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