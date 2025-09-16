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
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedThisLoadRef = useRef(false);

  const shouldFetchOnLoad = useCallback(() => {
    try {
      const flag = localStorage.getItem('fetchNotif');
      return flag === null || flag === 'true';
    } catch {
      return true;
    }
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!user?.id) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
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
        // Derive unread count from list to avoid server/client mismatch
        setUnreadCount(list.length);
      }
    } catch {
      // ignore
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    // Reset state when user changes
    setNotifications([]);
    setUnreadCount(0);
    abortRef.current?.abort();
    isFetchingRef.current = false;
    if (user?.id && shouldFetchOnLoad() && !hasFetchedThisLoadRef.current) {
      // Global page-load guard to prevent multiple fetches from any source
      const w = typeof window !== 'undefined' ? (window as any) : undefined;
      if (w && w.__scioNotifFetched === true) {
        return;
      }
      hasFetchedThisLoadRef.current = true;
      try {
        if (w) w.__scioNotifFetched = true;
        // Flip the flag immediately to avoid double-invocation in React StrictMode
        localStorage.setItem('fetchNotif', 'false');
      } catch {
        // ignore
      }
      void fetchOnce();
    }
    return () => {
      abortRef.current?.abort();
      isFetchingRef.current = false;
    };
  }, [user?.id, fetchOnce, shouldFetchOnLoad]);

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


