'use client';
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateOnline = () => setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  return { isOffline };
}


