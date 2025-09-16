'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useEffect } from 'react';
import { NotificationsProvider } from '@/app/contexts/NotificationsContext';

// Guard to avoid React StrictMode double-invocation of effects in dev
let hasInitializedFetchNotifFlag = false;
let hasPatchedFetchOnce = false;

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    const isOfflinePage = window.location.pathname === '/offline/';
    
    if (!isStandalone && !isOfflinePage) return;
    
    const register = async () => {
      try {

        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // ignore
      }
    };

    const id = setTimeout(register, 0);
    return () => clearTimeout(id);
  }, []);

  // Initialize notifications fetch flag once per page load
  useEffect(() => {
    if (hasInitializedFetchNotifFlag) return;
    hasInitializedFetchNotifFlag = true;
    try {
      localStorage.setItem('fetchNotif', 'true');
    } catch {
      // ignore
    }
  }, []);

  // Hard gate: ensure only one GET to /api/notifications per page load
  useEffect(() => {
    if (hasPatchedFetchOnce) return;
    hasPatchedFetchOnce = true;
    try {
      const w = window as any;
      const originalFetch = window.fetch.bind(window);
      let cachedResponse: Response | null = null;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        try {
          const method = (init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET') || 'GET').toUpperCase();
          let url: string = '';
          if (typeof input === 'string') url = input;
          else if (input instanceof URL) url = input.pathname + input.search;
          else if (typeof input === 'object') url = (input as Request).url;
          const sameOrigin = typeof url === 'string' && (url.startsWith('/') || url.startsWith(window.location.origin));
          const path = url.startsWith(window.location.origin) ? url.substring(window.location.origin.length) : url;
          if (sameOrigin && method === 'GET' && path.startsWith('/api/notifications')) {
            if (w.__scioNotifFetched === true && cachedResponse) {
              return cachedResponse.clone();
            }
            const res = await originalFetch(input as any, init);
            try {
              cachedResponse = res.clone();
            } catch {}
            w.__scioNotifFetched = true;
            try { localStorage.setItem('fetchNotif', 'false'); } catch {}
            return res;
          }
        } catch {
          // fall through to original fetch
        }
        return originalFetch(input as any, init as any);
      };
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
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