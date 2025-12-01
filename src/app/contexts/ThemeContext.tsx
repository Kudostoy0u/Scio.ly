"use client";

import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

/**
 * Theme context type definition
 * Provides theme state and management functionality
 */
interface ThemeContextType {
  /** Current dark mode state */
  darkMode: boolean;
  /** Function to set dark mode state */
  setDarkMode: (value: boolean) => void;
}

/**
 * Theme context for managing application theme
 * Provides dark/light mode functionality with persistence
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider Component
 *
 * Provides theme context to the application
 * Manages dark/light mode state with localStorage and cookie persistence
 * Handles SSR/CSR hydration to prevent mismatches
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} [props.initialDarkMode] - Initial dark mode state from SSR
 * @returns {JSX.Element} Theme provider component
 * @example
 * ```tsx
 * <ThemeProvider initialDarkMode={false}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  initialDarkMode,
}: { children: ReactNode; initialDarkMode?: boolean }) {
  // initialdarkmode (from cookie) to guarantee ssr/csr match and avoid hydration errors.
  const getInitialDarkMode = (): boolean => {
    // to guarantee markup parity and avoid hydration mismatches.

    return initialDarkMode ?? false;
  };

  const [darkMode, setDarkModeState] = useState<boolean>(getInitialDarkMode);

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    if (typeof document !== "undefined") {
      document.cookie = `theme=${value ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    }
    if (typeof localStorage !== "undefined") {
      SyncLocalStorage.setItem("theme", value ? "dark" : "light");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedTheme = SyncLocalStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      const prefersDark = storedTheme === "dark";
      if (prefersDark !== darkMode) {
        setDarkModeState(prefersDark);

        document.cookie = `theme=${prefersDark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
      }
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      setDarkModeState(e.matches);
    };
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [darkMode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.classList.toggle("dark-scrollbar", darkMode);
    root.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Provides theme state and management functionality
 *
 * @returns {ThemeContextType} Theme context with dark mode state and setter
 * @throws {Error} When used outside of ThemeProvider
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { darkMode, setDarkMode } = useTheme();
 *
 *   return (
 *     <button onClick={() => setDarkMode(!darkMode)}>
 *       {darkMode ? 'Light Mode' : 'Dark Mode'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined || context == null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
