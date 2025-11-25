"use client";

import { useAuth } from "@/app/contexts/authContext";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const NOTIFICATION_CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Notification item type definition
 * Represents a single notification with metadata
 */
type NotificationPayload = Record<string, unknown>;

type NotificationItem = {
  /** Unique notification identifier */
  id: string;
  /** Notification type/category */
  type: string;
  /** Notification title */
  title: string;
  /** Optional notification body text */
  body?: string;
  /** Optional notification data payload */
  data?: NotificationPayload;
};

/**
 * Notifications context value interface
 * Provides notification state and management functionality
 */
interface NotificationsContextValue {
  /** Array of notification items */
  notifications: NotificationItem[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Function to refresh notifications */
  refresh: (forceRefresh?: boolean) => Promise<void>;
  /** Function to mark all notifications as read */
  markAllRead: () => Promise<void>;
  /** Function to mark a specific notification as read by ID */
  markReadById: (id: string) => Promise<void>;
}

/**
 * Notifications context for managing application notifications
 * Provides notification state management with caching and real-time updates
 */
const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Hook to access notifications context
 * Provides notification state and management functionality
 *
 * @returns {NotificationsContextValue} Notifications context with state and handlers
 * @throws {Error} When used outside of NotificationsProvider
 * @example
 * ```tsx
 * function NotificationBell() {
 *   const { notifications, unreadCount, markReadById } = useNotifications();
 *
 *   return (
 *     <div>
 *       <span>Notifications ({unreadCount})</span>
 *       {notifications.map(notification => (
 *         <div key={notification.id} onClick={() => markReadById(notification.id)}>
 *           {notification.title}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

/**
 * NotificationsProvider Component
 *
 * Provides notifications context to the application
 * Manages notification state with caching, real-time updates, and session management
 * Handles notification fetching, marking as read, and cache invalidation
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Notifications provider component
 * @example
 * ```tsx
 * <NotificationsProvider>
 *   <App />
 * </NotificationsProvider>
 * ```
 */
export function NotificationsProvider({
  children,
  initialNotifications = [],
  initialUnreadCount = 0,
}: {
  children: React.ReactNode;
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
}) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const isFetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasFetchedThisLoadRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const hasInitializedWithServerDataRef = useRef(false);
  const initialNotificationsLengthRef = useRef(initialNotifications.length);

  // Detect page refresh to reset session flag and clear cache on page close
  useEffect(() => {
    // Use sessionStorage to track if this is a page refresh
    const sessionKey = `scio_notifications_session_${user?.id || "anonymous"}`;
    const wasPageRefreshed = sessionStorage.getItem(sessionKey) === "true";

    if (wasPageRefreshed) {
      // This is a page refresh, reset the session flag
      hasFetchedThisLoadRef.current = false;
    }

    // Mark that we've been here in this session
    if (user?.id) {
      sessionStorage.setItem(sessionKey, "true");
    }

    // Clear notification cache when user closes the website/tab
    const handleBeforeUnload = () => {
      if (user?.id) {
        try {
          SyncLocalStorage.removeItem(`scio_notifications_${user.id}`);
          SyncLocalStorage.removeItem(`scio_notifications_time_${user.id}`);
        } catch {
          // ignore cache errors
        }
      }
    };

    // Add event listener for page unload
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up session storage and event listener when user changes
    return () => {
      if (user?.id) {
        sessionStorage.removeItem(sessionKey);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user?.id]);

  const getCachedNotifications = useCallback((userId: string): NotificationItem[] | null => {
    try {
      const cached = SyncLocalStorage.getItem(`scio_notifications_${userId}`);
      const cachedTime = SyncLocalStorage.getItem(`scio_notifications_time_${userId}`);
      if (cached && cachedTime) {
        const timeDiff = Date.now() - Number.parseInt(cachedTime);
        if (timeDiff < NOTIFICATION_CACHE_DURATION_MS) {
          const parsed = JSON.parse(cached);
          return parsed;
        }
      }
    } catch {
      // ignore cache errors
    }
    return null;
  }, []);

  const setCachedNotifications = useCallback((userId: string, data: NotificationItem[]) => {
    try {
      SyncLocalStorage.setItem(`scio_notifications_${userId}`, JSON.stringify(data));
      SyncLocalStorage.setItem(`scio_notifications_time_${userId}`, Date.now().toString());
    } catch {
      // ignore cache errors
    }
  }, []);

  // Clear notification cache function reserved for future use
  // const clearNotificationCache = useCallback((userId: string) => {
  //   try {
  //     SyncLocalStorage.removeItem(`scio_notifications_${userId}`);
  //     SyncLocalStorage.removeItem(`scio_notifications_time_${userId}`);
  //   } catch {
  //     // ignore cache errors
  //   }
  // }, []);

  const fetchOnce = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) {
        return;
      }
      if (isFetchingRef.current) {
        return;
      }

      // Helper function to check if we should use cached data
      const shouldUseCache = (): boolean => {
        if (forceRefresh) {
          return false;
        }
        const cached = getCachedNotifications(user.id);
        if (cached) {
          setNotifications(cached);
          setUnreadCount(cached.length);
          return true;
        }
        return false;
      };

      // Helper function to check if we should skip fetch due to rate limiting
      const shouldSkipFetch = (): boolean => {
        if (forceRefresh) {
          return false;
        }
        const now = Date.now();
        return now - lastFetchTimeRef.current < 30000;
      };

      // Helper function to process fetch response
      const processFetchResponse = (json: unknown) => {
        if (
          json &&
          typeof json === "object" &&
          "success" in json &&
          json.success &&
          "data" in json
        ) {
          const jsonWithData = json as { data: unknown };
          const list = Array.isArray(jsonWithData.data) ? jsonWithData.data : [];
          setNotifications(list);
          setUnreadCount(list.length);
          setCachedNotifications(user.id, list);
        }
      };

      // Helper function to perform the actual fetch
      const performFetch = async (controller: AbortController) => {
        const res = await fetch("/api/notifications", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          return;
        }
        const json = await res.json();
        processFetchResponse(json);
      };

      if (shouldUseCache()) {
        return;
      }

      if (shouldSkipFetch()) {
        return;
      }

      isFetchingRef.current = true;
      lastFetchTimeRef.current = Date.now();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await performFetch(controller);
      } catch (error) {
        logger.error("Failed to fetch notifications:", error);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [user?.id, getCachedNotifications, setCachedNotifications]
  );

  // Initialize with server data only once
  useEffect(() => {
    if (!hasInitializedWithServerDataRef.current && initialNotifications.length > 0) {
      setNotifications(initialNotifications);
      setUnreadCount(initialUnreadCount);
      hasInitializedWithServerDataRef.current = true;
    }
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    // Reset state when user changes; do not auto-fetch
    abortRef.current?.abort();
    isFetchingRef.current = false;
    hasFetchedThisLoadRef.current = false;
    lastFetchTimeRef.current = 0;
    hasInitializedWithServerDataRef.current = false;

    // If we have initial data from server, skip all client-side fetching
    if (initialNotificationsLengthRef.current > 0) {
      return;
    }

    // Load from cache immediately if available
    if (user?.id) {
      const cached = getCachedNotifications(user.id);
      if (cached) {
        setNotifications(cached);
        setUnreadCount(cached.length);
      }

      // Only fetch fresh data if we don't have server data
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

  const refresh = useCallback(
    async (forceRefresh = false) => {
      await fetchOnce(forceRefresh);
    },
    [fetchOnce]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        setCachedNotifications(user.id, []);
      }
    } catch {
      // ignore
    }
  }, [user?.id, setCachedNotifications]);

  const markReadById = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead", id }),
        });
      } catch (error) {
        logger.error("Failed to mark notification as read:", error);
      }
      const updatedNotifications = notifications.filter((n) => n.id !== id);
      setNotifications(updatedNotifications);
      setUnreadCount((c) => Math.max(0, c - 1));
      // Update cache
      if (user?.id) {
        setCachedNotifications(user.id, updatedNotifications);
      }
    },
    [notifications, user?.id, setCachedNotifications]
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, refresh, markAllRead, markReadById }),
    [notifications, unreadCount, refresh, markAllRead, markReadById]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
