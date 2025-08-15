'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  
  // Register service worker for offline support (PWA only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    
    // Only register service worker if running as PWA (standalone) or if user is on offline page
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    const isOfflinePage = window.location.pathname === '/offline/';
    
    if (!isStandalone && !isOfflinePage) return;
    
    const register = async () => {
      try {
        // Ensure scope covers the whole app
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // ignore
      }
    };
    // Delay slightly to avoid competing with initial route hydration
    const id = setTimeout(register, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? 'dark' : 'light'}
      />
    </>
  );
}