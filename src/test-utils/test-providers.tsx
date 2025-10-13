import React from 'react';
import { ThemeProvider } from '@/app/contexts/ThemeContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { NotificationsProvider } from '@/app/contexts/NotificationsContext';

interface TestProvidersProps {
  children: React.ReactNode;
  initialDarkMode?: boolean;
  initialUser?: any;
}

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

// Mock providers for components that don't need full context
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
