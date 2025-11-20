/**
 * Utility functions for localStorage caching with expiration
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

export class LocalStorageCache {
  private static readonly PREFIX = "scioly_cache_";
  private static readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
  public static readonly INFINITE_TTL = 0; // Never expires

  /**
   * Get cached data if it exists and hasn't expired
   */
  static get<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const cached = localStorage.getItem(LocalStorageCache.PREFIX + key);
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
    } catch (_error) {
      LocalStorageCache.remove(key);
      return null;
    }
  }

  /**
   * Set cached data with optional expiration
   */
  static set<T>(key: string, data: T, expiresIn: number = LocalStorageCache.DEFAULT_EXPIRY): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };
      localStorage.setItem(LocalStorageCache.PREFIX + key, JSON.stringify(item));
    } catch (_error) {}
  }

  /**
   * Remove cached data
   */
  static remove(key: string): void {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(LocalStorageCache.PREFIX + key);
  }

  /**
   * Clear all cached data
   */
  static clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(LocalStorageCache.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get cache key for team-specific data
   */
  static getTeamKey(teamId: string, dataType: string): string {
    return `team_${teamId}_${dataType}`;
  }

  /**
   * Get cache key for user-specific data
   */
  static getUserKey(userId: string, dataType: string): string {
    return `user_${userId}_${dataType}`;
  }
}

// Removed unused export: useCachedData

// Removed unused import: React
