'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

type NotificationItem = { id: string; type: string; title: string; body?: string; data?: any };

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  refresh: () => Promise<void>;
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
  const intervalRef = useRef<number | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user?.id) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      console.log('fetching notifications');
      const res = await fetch('/api/notifications', { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success) {
        const list = Array.isArray(json.data) ? json.data : [];
        setNotifications(list);
        // Derive unread count from list to avoid server/client mismatch
        setUnreadCount(list.length);
      }
    } catch {
      // ignore
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already polling
    // Visibility-aware polling: only poll when tab visible
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        await fetchOnce();
      }
    };
    // Initial tick shortly after mount to coalesce with others
    const id = window.setInterval(tick, 15000);
    intervalRef.current = id as unknown as number;
    // Also refresh on visibility gain
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchOnce();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    visibilityListenerRef.current = () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchOnce]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (visibilityListenerRef.current) {
      visibilityListenerRef.current();
      visibilityListenerRef.current = null;
    }
    abortRef.current?.abort();
    isFetchingRef.current = false;
  }, []);

  useEffect(() => {
    // Reset state when user changes
    setNotifications([]);
    setUnreadCount(0);
    stopPolling();
    if (user?.id) {
      // Single initial fetch; then start polling
      void fetchOnce().then(() => startPolling());
    }
    return () => {
      stopPolling();
    };
  }, [user?.id, fetchOnce, startPolling, stopPolling]);

  const refresh = useCallback(async () => {
    await fetchOnce();
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
  }, [notifications]);

  const markReadById = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', id })
      });
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

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


