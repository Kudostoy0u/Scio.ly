'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

type NotificationItem = { id: string; type: string; title: string; body?: string; data?: any };

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  refresh: (forceRefresh?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  markReadById: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const isFetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedThisLoadRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Detect page refresh to reset session flag and clear cache on page close
  useEffect(() => {
    // Use sessionStorage to track if this is a page refresh
    const sessionKey = `scio_notifications_session_${user?.id || 'anonymous'}`;
    const wasPageRefreshed = sessionStorage.getItem(sessionKey) === 'true';
    
    if (wasPageRefreshed) {
      // This is a page refresh, reset the session flag
      hasFetchedThisLoadRef.current = false;
    }
    
    // Mark that we've been here in this session
    if (user?.id) {
      sessionStorage.setItem(sessionKey, 'true');
    }

    // Clear notification cache when user closes the website/tab
    const handleBeforeUnload = () => {
      if (user?.id) {
        try {
          localStorage.removeItem(`scio_notifications_${user.id}`);
          localStorage.removeItem(`scio_notifications_time_${user.id}`);
        } catch {
          // ignore cache errors
        }
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up session storage and event listener when user changes
    return () => {
      if (user?.id) {
        sessionStorage.removeItem(sessionKey);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  const getCachedNotifications = useCallback((userId: string) => {
    try {
      const cached = localStorage.getItem(`scio_notifications_${userId}`);
      const cachedTime = localStorage.getItem(`scio_notifications_time_${userId}`);
      if (cached && cachedTime) {
        const timeDiff = Date.now() - parseInt(cachedTime);
        if (timeDiff < CACHE_DURATION) {
          const parsed = JSON.parse(cached);
          return parsed;
        }
      }
    } catch {
      // ignore cache errors
    }
    return null;
  }, [CACHE_DURATION]);

  const setCachedNotifications = useCallback((userId: string, data: NotificationItem[]) => {
    try {
      localStorage.setItem(`scio_notifications_${userId}`, JSON.stringify(data));
      localStorage.setItem(`scio_notifications_time_${userId}`, Date.now().toString());
    } catch {
      // ignore cache errors
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearNotificationCache = useCallback((userId: string) => {
    try {
      localStorage.removeItem(`scio_notifications_${userId}`);
      localStorage.removeItem(`scio_notifications_time_${userId}`);
    } catch {
      // ignore cache errors
    }
  }, []);

  const fetchOnce = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    if (isFetchingRef.current) return;
    
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = getCachedNotifications(user.id);
      if (cached) {
        setNotifications(cached);
        setUnreadCount(cached.length);
        return;
      }
    }

    // Check if we've fetched recently (within 30 seconds)
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTimeRef.current) < 30000) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/notifications', { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success) {
        const list = Array.isArray(json.data) ? json.data : [];
        setNotifications(list);
        setUnreadCount(list.length);
        setCachedNotifications(user.id, list);
      }
    } catch {
      // ignore
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id, getCachedNotifications, setCachedNotifications]);

  useEffect(() => {
    // Reset state when user changes; do not auto-fetch
    setNotifications([]);
    setUnreadCount(0);
    abortRef.current?.abort();
    isFetchingRef.current = false;
    hasFetchedThisLoadRef.current = false;
    lastFetchTimeRef.current = 0;
    
    // Load from cache immediately if available
    if (user?.id) {
      const cached = getCachedNotifications(user.id);
      if (cached) {
        setNotifications(cached);
        setUnreadCount(cached.length);
      }
      
      // Fetch fresh data once per session (when user first loads the page)
      // This ensures users see new notifications like team invites or assignments
      if (!hasFetchedThisLoadRef.current) {
        hasFetchedThisLoadRef.current = true;
        // Use a small delay to avoid blocking the initial page load
        setTimeout(() => {
          fetchOnce(false); // This will respect the 30-second rate limit
        }, 1000);
      }
    }
    
    return () => {
      abortRef.current?.abort();
      isFetchingRef.current = false;
    };
  }, [user?.id, getCachedNotifications, fetchOnce]);

  const refresh = useCallback(async (forceRefresh: boolean = false) => {
    await fetchOnce(forceRefresh);
  }, [fetchOnce]);

  const markAllRead = useCallback(async () => {
    if (notifications.length === 0) return;
    try {
      await Promise.all(
        notifications.map((n) =>
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'markRead', id: n.id })
          }).catch(() => null)
        )
      );
    } catch {}
    setNotifications([]);
    setUnreadCount(0);
    // Update cache
    if (user?.id) {
      setCachedNotifications(user.id, []);
    }
  }, [notifications, user?.id, setCachedNotifications]);

  const markReadById = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', id })
      });
    } catch {}
    const updatedNotifications = notifications.filter((n) => n.id !== id);
    setNotifications(updatedNotifications);
    setUnreadCount((c) => Math.max(0, c - 1));
    // Update cache
    if (user?.id) {
      setCachedNotifications(user.id, updatedNotifications);
    }
  }, [notifications, user?.id, setCachedNotifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, refresh, markAllRead, markReadById }),
    [notifications, unreadCount, refresh, markAllRead, markReadById]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}


