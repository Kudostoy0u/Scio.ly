import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// Global cache to prevent duplicate requests
const notificationCache = new Map<
  string,
  { data: NotificationsState; timestamp: number; promise?: Promise<NotificationsState> }
>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export function useNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
  });

  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNotifications = useCallback(
    async (forceRefresh = false): Promise<NotificationsState> => {
      if (!user?.id) {
        return { notifications: [], unreadCount: 0, loading: false, error: null };
      }

      const cacheKey = `notifications-${user.id}`;
      const now = Date.now();
      const cached = notificationCache.get(cacheKey);

      // Return cached data if still valid and not forcing refresh
      if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      // Return existing promise if already fetching
      if (cached?.promise) {
        return cached.promise;
      }

      // Prevent duplicate requests
      if (isFetchingRef.current) {
        return { notifications: [], unreadCount: 0, loading: false, error: null };
      }

      isFetchingRef.current = true;

      // Cancel previous request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const fetchPromise = (async (): Promise<NotificationsState> => {
        try {
          // Fetch notifications directly from Supabase
          const { data: notifications, error } = (await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(50)) as {
            data: Array<{
              id: string;
              user_id: string;
              notification_type: string;
              title: string;
              message: string;
              data: any;
              is_read: boolean;
              created_at: string;
              read_at: string | null;
              team_id: string | null;
              team_name: string | null;
            }> | null;
            error: any;
          };

          if (error) {
            // If table doesn't exist, provide helpful error message
            if (
              error.code === "42P01" ||
              error.message?.includes('relation "notifications" does not exist')
            ) {
              // Return empty state instead of throwing error
              return {
                notifications: [],
                unreadCount: 0,
                loading: false,
                error: "Notifications table not found. Please apply the Supabase migration.",
              };
            }

            throw error;
          }

          const notificationItems: NotificationItem[] = (notifications || []).map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.notification_type,
            data: n.data,
            is_read: n.is_read,
            created_at: n.created_at,
          }));

          const result: NotificationsState = {
            notifications: notificationItems,
            unreadCount: notificationItems.length,
            loading: false,
            error: null,
          };

          // Cache the result
          notificationCache.set(cacheKey, { data: result, timestamp: now });

          return result;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch notifications";
          const result: NotificationsState = {
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: errorMessage,
          };

          // Don't cache errors
          notificationCache.delete(cacheKey);

          return result;
        } finally {
          isFetchingRef.current = false;
        }
      })();

      // Store the promise to prevent duplicate requests
      notificationCache.set(cacheKey, {
        data: cached?.data || { notifications: [], unreadCount: 0, loading: true, error: null },
        timestamp: cached?.timestamp || 0,
        promise: fetchPromise,
      });

      return fetchPromise;
    },
    [user?.id]
  );

  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!user?.id) {
        return;
      }

      try {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true, read_at: new Date().toISOString() } as any)
          .eq("id", notificationId)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== notificationId),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));

        // Invalidate cache to force refresh on next fetch
        notificationCache.delete(`notifications-${user.id}`);
      } catch (_err) {}
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        throw error;
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));

      // Invalidate cache to force refresh on next fetch
      notificationCache.delete(`notifications-${user.id}`);
    } catch (_err) {}
  }, [user?.id]);

  const refresh = useCallback(
    async (force = false) => {
      if (!user?.id) {
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await fetchNotifications(force);
        setState(result);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to fetch notifications",
        }));
      }
    },
    [user?.id, fetchNotifications]
  );

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      const loadNotifications = async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const result = await fetchNotifications(false);
          setState(result);
        } catch (err) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to fetch notifications",
          }));
        }
      };
      loadNotifications();
    } else {
      setState({ notifications: [], unreadCount: 0, loading: false, error: null });
    }
  }, [user?.id, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    error: state.error,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
