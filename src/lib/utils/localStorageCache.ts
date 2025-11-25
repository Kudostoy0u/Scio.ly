/**
 * Utility functions for localStorage caching with expiration
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

const PREFIX = "scioly_cache_";
const DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
export const INFINITE_TTL = 0; // Never expires

export const LocalStorageCache = {
  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const cached = localStorage.getItem(PREFIX + key);
      if (!cached) {
        return null;
      }

      const item: CacheItem<T> = JSON.parse(cached);

      // If expiresIn is 0 or negative, it never expires
      if (item.expiresIn > 0) {
        const now = Date.now();
        if (now - item.timestamp > item.expiresIn) {
          LocalStorageCache.remove(key);
          return null;
        }
      }

      return item.data;
    } catch {
      LocalStorageCache.remove(key);
      return null;
    }
  },

  /**
   * Set cached data with optional expiration
   */
  set<T>(key: string, data: T, expiresIn: number = DEFAULT_EXPIRY): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };
      localStorage.setItem(PREFIX + key, JSON.stringify(item));
    } catch {
      // Ignore localStorage errors (e.g., quota exceeded, disabled in private mode)
    }
  },

  /**
   * Remove cached data
   */
  remove(key: string): void {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(PREFIX + key);
  },

  /**
   * Clear all cached data
   */
  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },

  /**
   * Get cache key for team-specific data
   */
  getTeamKey(teamId: string, dataType: string): string {
    return `team_${teamId}_${dataType}`;
  },

  /**
   * Get cache key for user-specific data
   */
  getUserKey(userId: string, dataType: string): string {
    return `user_${userId}_${dataType}`;
  },
} as const;

// Removed unused export: useCachedData

// Removed unused import: React
