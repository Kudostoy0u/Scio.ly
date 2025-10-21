'use client';

import logger from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  expiresAt: number;
}

interface CacheConfig {
  duration: number; // Cache duration in milliseconds
  version: string; // Cache version for invalidation
  persistToStorage: boolean; // Whether to persist to localStorage
  backgroundRefresh: boolean; // Whether to refresh in background
  backgroundRefreshInterval: number; // Background refresh interval
}

// Enhanced cache configurations with longer durations and localStorage persistence
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  'user-teams': {
    duration: 30 * 60 * 1000, // 30 minutes - user teams change infrequently
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false,
    backgroundRefreshInterval: 0
  },
  'subteams': {
    duration: 60 * 60 * 1000, // 1 hour - subteams are very static
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false,
    backgroundRefreshInterval: 0
  },
  'roster': {
    duration: 20 * 60 * 1000, // 20 minutes - roster data is important
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false, // Disable background refresh
    backgroundRefreshInterval: 0
  },
  'members': {
    duration: 15 * 60 * 1000, // 15 minutes - member data changes moderately
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false, // Disable background refresh
    backgroundRefreshInterval: 0
  },
  'stream': {
    duration: 5 * 60 * 1000, // 5 minutes - stream is dynamic but we want some persistence
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false, // Disable background refresh
    backgroundRefreshInterval: 0
  },
  'assignments': {
    duration: 20 * 60 * 1000, // 20 minutes - assignments change moderately
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false, // Disable background refresh
    backgroundRefreshInterval: 0
  },
  'tournaments': {
    duration: 30 * 60 * 1000, // 30 minutes - tournaments are static
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false,
    backgroundRefreshInterval: 0
  },
  'timers': {
    duration: 2 * 60 * 1000, // 2 minutes - timers are dynamic
    version: '1.0.0',
    persistToStorage: true,
    backgroundRefresh: false, // Disable background refresh
    backgroundRefreshInterval: 0
  }
};

class EnhancedLocalStorageCache {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private backgroundRefreshTimers = new Map<string, NodeJS.Timeout>();
  private readonly STORAGE_PREFIX = 'scio_teams_cache_';
  private readonly VERSION_KEY = 'scio_teams_cache_version';

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeStorage();
    }
  }

  /**
   * Initialize localStorage and clean up old/invalid entries
   */
  private initializeStorage(): void {
    try {
      // Get current version
      const currentVersion = this.getCurrentVersion();
      
      // Clean up old cache entries
      this.cleanupOldEntries();
      
      // Load valid entries from localStorage into memory
      this.loadFromStorage();
      
      logger.info('Enhanced localStorage cache initialized', { currentVersion });
    } catch (error) {
      logger.error('Error initializing enhanced localStorage cache:', error);
    }
  }

  /**
   * Get current cache version
   */
  private getCurrentVersion(): string {
    try {
      if (typeof window === 'undefined') return '1.0.0';
      return localStorage.getItem(this.VERSION_KEY) || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Clean up old cache entries from localStorage
   */
  private cleanupOldEntries(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const currentVersion = this.getCurrentVersion();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}');
            if (entry.version !== currentVersion || (entry.expiresAt && Date.now() > entry.expiresAt)) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        logger.info('Cleaned up old cache entries', { count: keysToRemove.length });
      }
    } catch (error) {
      logger.error('Error cleaning up old cache entries:', error);
    }
  }

  /**
   * Load valid entries from localStorage into memory
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      
      const currentVersion = this.getCurrentVersion();
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}');
            if (entry.version === currentVersion && entry.expiresAt && now < entry.expiresAt) {
              const cacheKey = key.replace(this.STORAGE_PREFIX, '');
              this.memoryCache.set(cacheKey, entry);
            }
          } catch {
            // Invalid entry, will be cleaned up
          }
        }
      }
      
      logger.info('Loaded cache entries from localStorage', { count: this.memoryCache.size });
    } catch (error) {
      logger.error('Error loading from localStorage:', error);
    }
  }

  /**
   * Get cache configuration for a data type
   */
  private getCacheConfig(dataType: string): CacheConfig {
    return CACHE_CONFIGS[dataType] || {
      duration: 10 * 60 * 1000, // 10 minutes default
      version: '1.0.0',
      persistToStorage: true,
      backgroundRefresh: false,
      backgroundRefreshInterval: 0
    };
  }

  /**
   * Get data type from cache key
   */
  private getDataTypeFromKey(key: string): string {
    const parts = key.split('-');
    return parts[0] || 'unknown';
  }

  /**
   * Get storage key for localStorage
   */
  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return entry.expiresAt > now;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, dataType?: string): void {
    const type = dataType || this.getDataTypeFromKey(key);
    const config = this.getCacheConfig(type);
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      version: config.version,
      expiresAt: now + config.duration
    };
    
    // Store in memory
    this.memoryCache.set(key, entry);
    
    // Store in localStorage if configured
    if (config.persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      } catch (error) {
        logger.error('Error saving to localStorage:', error);
      }
    }
    
    logger.debug('Cache entry set', { key, type, expiresAt: entry.expiresAt });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (!this.isValidEntry(entry)) {
      this.delete(key);
      return null;
    }
    
    return entry.data as T | null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(key));
      } catch (error) {
        logger.error('Error removing from localStorage:', error);
      }
    }
    
    // Stop background refresh if running
    this.stopBackgroundRefresh(key);
  }

  /**
   * Check if cache has valid entry
   */
  has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    return entry ? this.isValidEntry(entry) : false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();
    
    // Clear all background refresh timers
    this.backgroundRefreshTimers.forEach(timer => clearInterval(timer));
    this.backgroundRefreshTimers.clear();
    
    // Clear localStorage entries
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.STORAGE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        logger.error('Error clearing localStorage:', error);
      }
    }
    
    logger.info('Enhanced localStorage cache cleared');
  }

  /**
   * Fetch data with cache
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    dataType?: string
  ): Promise<T> {
    // Check if we have valid cached data
    if (this.has(key)) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }
    }
    
    logger.debug('Cache miss, fetching data', { key });
    
    try {
      const data = await fetcher();
      this.set(key, data, dataType);
      return data;
    } catch (error) {
      logger.error('Error fetching data:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern?: string): void {
    if (pattern) {
      // Invalidate specific pattern
      const keysToDelete: string[] = [];
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.delete(key));
    } else {
      // Clear all cache
      this.clear();
    }
    
    logger.info('Cache invalidated', { pattern });
  }

  /**
   * Stop background refresh for a cache key
   */
  stopBackgroundRefresh(key: string): void {
    const timer = this.backgroundRefreshTimers.get(key);
    if (timer) {
      clearInterval(timer);
      this.backgroundRefreshTimers.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[]; memoryUsage: number } {
    const keys = Array.from(this.memoryCache.keys());
    const memoryUsage = JSON.stringify(Array.from(this.memoryCache.entries())).length;
    
    return {
      size: this.memoryCache.size,
      keys,
      memoryUsage
    };
  }
}

// Export singleton instance
export const enhancedLocalStorageCache = new EnhancedLocalStorageCache();
