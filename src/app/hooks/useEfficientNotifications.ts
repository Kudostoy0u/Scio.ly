/**
 * Efficient Notifications Hook
 * 
 * This hook provides notification functionality that integrates seamlessly
 * with the AuthButton component and minimizes API calls by using intelligent
 * caching and team membership checks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, NotificationItem } from '@/lib/services/notification-service';

export interface UseEfficientNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  refresh: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  hasTeamMemberships: boolean;
}

export function useEfficientNotifications(userId: string | null): UseEfficientNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasTeamMemberships, setHasTeamMemberships] = useState<boolean>(false);
  
  const hasInitialized = useRef<boolean>(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds

  // Check if user has team memberships
  const checkTeamMemberships = useCallback(async (userId: string) => {
    try {
      const hasTeams = await notificationService.hasTeamMemberships(userId);
      setHasTeamMemberships(hasTeams);
      return hasTeams;
    } catch (error) {
      console.warn('Failed to check team memberships:', error);
      setHasTeamMemberships(false);
      return false;
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (userId: string, forceRefresh = false) => {
    // Check cooldown period
    const now = Date.now();
    if (!forceRefresh && (now - lastFetchTime.current) < FETCH_COOLDOWN) {
      return;
    }

    setIsLoading(true);
    lastFetchTime.current = now;

    try {
      const fetchedNotifications = await notificationService.getNotifications(userId, forceRefresh);
      setNotifications(fetchedNotifications);
      setUnreadCount(notificationService.getUnreadCount(userId));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize notifications for a user
  const initializeNotifications = useCallback(async (userId: string) => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // First check if user has team memberships
    const hasTeams = await checkTeamMemberships(userId);
    
    // Only fetch notifications if user has team memberships
    if (hasTeams) {
      // Load from cache immediately if available
      const cachedNotifications = await notificationService.getNotifications(userId, false);
      if (cachedNotifications.length > 0) {
        setNotifications(cachedNotifications);
        setUnreadCount(notificationService.getUnreadCount(userId));
      }

      // Fetch fresh data with a small delay to avoid blocking initial page load
      setTimeout(() => {
        fetchNotifications(userId, false);
      }, 1000);
    }
  }, [checkTeamMemberships, fetchNotifications]);

  // Refresh notifications
  const refresh = useCallback(async (force = false) => {
    if (!userId) return;
    
    if (force) {
      hasInitialized.current = false;
      await initializeNotifications(userId);
    } else {
      await fetchNotifications(userId, force);
    }
  }, [userId, initializeNotifications, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!userId) return;

    const success = await notificationService.markAsRead(userId, id);
    if (success) {
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const success = await notificationService.markAllAsRead(userId);
    if (success) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  // Effect to initialize notifications when user changes
  useEffect(() => {
    if (!userId) {
      // Reset state when no user
      setNotifications([]);
      setUnreadCount(0);
      setHasTeamMemberships(false);
      setIsLoading(false);
      hasInitialized.current = false;
      return;
    }

    // Initialize notifications for the user
    initializeNotifications(userId);
  }, [userId, initializeNotifications]);

  // Effect to clear cache when user changes
  useEffect(() => {
    return () => {
      if (userId) {
        // Don't clear cache immediately, let it expire naturally
        // This allows for better UX when switching between users
      }
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    hasTeamMemberships,
  };
}
