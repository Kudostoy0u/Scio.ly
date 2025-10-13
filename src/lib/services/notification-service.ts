/**
 * Efficient Notification Service
 * 
 * This service provides notification functionality that can be integrated
 * directly into components without requiring separate API calls on every page load.
 * It uses intelligent caching and only fetches when necessary.
 */

import { globalApiCache } from '@/lib/utils/globalApiCache';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
  created_at?: string;
  is_read?: boolean;
}

export interface NotificationServiceConfig {
  cacheDuration?: number; // in milliseconds
  maxRetries?: number;
  retryDelay?: number;
}

export class NotificationService {
  private cache: Map<string, { data: NotificationItem[]; timestamp: number }> = new Map();
  private isFetching: Map<string, Promise<NotificationItem[]>> = new Map();
  private config: Required<NotificationServiceConfig>;

  constructor(config: NotificationServiceConfig = {}) {
    this.config = {
      cacheDuration: config.cacheDuration || 5 * 60 * 1000, // 5 minutes
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Get notifications for a user with intelligent caching
   * Only fetches from API if cache is stale or empty
   */
  async getNotifications(userId: string, forceRefresh = false): Promise<NotificationItem[]> {
    const cacheKey = `notifications_${userId}`;
    const now = Date.now();

    // Check cache first
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.config.cacheDuration) {
        return cached.data;
      }
    }

    // Check if already fetching
    const existingFetch = this.isFetching.get(cacheKey);
    if (existingFetch) {
      return existingFetch;
    }

    // Start new fetch
    const fetchPromise = this.fetchNotificationsWithRetry(userId);
    this.isFetching.set(cacheKey, fetchPromise);

    try {
      const notifications = await fetchPromise;
      this.cache.set(cacheKey, { data: notifications, timestamp: now });
      return notifications;
    } finally {
      this.isFetching.delete(cacheKey);
    }
  }

  /**
   * Fetch notifications with retry logic
   */
  private async fetchNotificationsWithRetry(userId: string): Promise<NotificationItem[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch('/api/notifications', {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }

    // If all retries failed, return cached data if available
    const cacheKey = `notifications_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.warn('Notification fetch failed, using cached data:', lastError?.message);
      return cached.data;
    }

    // Return empty array if no cache available
    console.error('Notification fetch failed and no cache available:', lastError?.message);
    return [];
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', id: notificationId }),
      });

      if (response.ok) {
        // Update cache
        const cacheKey = `notifications_${userId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          const updatedData = cached.data.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          );
          this.cache.set(cacheKey, { data: updatedData, timestamp: cached.timestamp });
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      });

      if (response.ok) {
        // Clear cache
        const cacheKey = `notifications_${userId}`;
        this.cache.set(cacheKey, { data: [], timestamp: Date.now() });
        return true;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
    return false;
  }

  /**
   * Get unread count from cached notifications
   */
  getUnreadCount(userId: string): number {
    const cacheKey = `notifications_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data.filter(n => !n.is_read).length;
    }
    return 0;
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    const cacheKey = `notifications_${userId}`;
    this.cache.delete(cacheKey);
    this.isFetching.delete(cacheKey);
  }

  /**
   * Check if user has team memberships (to determine if notifications should be fetched)
   * This is more efficient than making a separate API call
   */
  async hasTeamMemberships(userId: string): Promise<boolean> {
    try {
      // Check if user has any team-related data in localStorage
      const teamData = localStorage.getItem(`scio_user_teams_${userId}`);
      if (teamData) {
        const teams = JSON.parse(teamData);
        return Array.isArray(teams) && teams.length > 0;
      }

      // If no cached data, make a lightweight check using global cache
      try {
        const cacheKey = `user-teams-${userId}`;
        const teams = await globalApiCache.fetchWithCache(
          cacheKey,
          async () => {
            const response = await fetch('/api/teams/user-teams', {
              cache: 'no-store',
            });
            if (!response.ok) throw new Error('Failed to fetch user teams');
            const result = await response.json();
            return result.teams || [];
          },
          'user-teams'
        );
        
        return Array.isArray(teams) && teams.length > 0;
      } catch (error) {
        console.warn('Failed to check team memberships:', error);
        return false;
      }
    } catch (error) {
      console.warn('Failed to check team memberships:', error);
    }
    
    return false;
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();
