/**
 * Utility functions for localStorage caching with expiration
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

export class LocalStorageCache {
  private static readonly PREFIX = 'scioly_cache_';
  private static readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes
  public static readonly INFINITE_TTL = 0; // Never expires

  /**
   * Get cached data if it exists and hasn't expired
   */
  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(this.PREFIX + key);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);
      
      // If expiresIn is 0 or negative, it never expires
      if (item.expiresIn > 0) {
        const now = Date.now();
        if (now - item.timestamp > item.expiresIn) {
          this.remove(key);
          return null;
        }
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to parse cached data:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Set cached data with optional expiration
   */
  static set<T>(key: string, data: T, expiresIn: number = this.DEFAULT_EXPIRY): void {
    if (typeof window === 'undefined') return;

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn
      };
      localStorage.setItem(this.PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  /**
   * Remove cached data
   */
  static remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Clear all cached data
   */
  static clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
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

/**
 * Hook for managing cached data with background refresh
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    expiresIn?: number;
    onUpdate?: (data: T) => void;
    enabled?: boolean;
  } = {}
) {
  const { expiresIn = 5 * 60 * 1000, onUpdate, enabled = true } = options;
  
  const [data, setData] = React.useState<T | null>(() => {
    if (!enabled) return null;
    return LocalStorageCache.get<T>(key);
  });
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const freshData = await fetchFn();
      LocalStorageCache.set(key, freshData, expiresIn);
      setData(freshData);
      onUpdate?.(freshData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, expiresIn, onUpdate, enabled]);

  // Load cached data on mount, then refresh in background
  React.useEffect(() => {
    if (!enabled) return;
    
    const cachedData = LocalStorageCache.get<T>(key);
    if (cachedData) {
      setData(cachedData);
    }
    
    // Always refresh in background to get latest data
    refresh();
  }, [key, refresh, enabled]);

  return {
    data,
    loading,
    error,
    refresh,
    isStale: data ? Date.now() - (LocalStorageCache.get<CacheItem<T>>(key)?.timestamp || 0) > expiresIn : true
  };
}

// Import React for the hook
import React from 'react';
