import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";
/**
 * Enhanced team data caching system with localStorage persistence
 * Provides efficient caching, background updates, and request deduplication
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	promise?: Promise<T>;
}

interface CacheConfig {
	duration: number; // Cache duration in milliseconds
	backgroundRefresh: boolean; // Whether to refresh in background
	backgroundRefreshInterval: number; // Background refresh interval in milliseconds
}

// Default cache configurations
const CACHE_CONFIGS: Record<string, CacheConfig> = {
	roster: {
		duration: 5 * 60 * 1000, // 5 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 2 * 60 * 1000, // 2 minutes
	},
	stream: {
		duration: 2 * 60 * 1000, // 2 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
	},
	assignments: {
		duration: 3 * 60 * 1000, // 3 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 2 * 60 * 1000, // 2 minutes
	},
	members: {
		duration: 2 * 60 * 1000, // 2 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
	},
	subteams: {
		duration: 10 * 60 * 1000, // 10 minutes
		backgroundRefresh: false,
		backgroundRefreshInterval: 0,
	},
	tournaments: {
		duration: 5 * 60 * 1000, // 5 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 2 * 60 * 1000, // 2 minutes
	},
	timers: {
		duration: 1 * 60 * 1000, // 1 minute
		backgroundRefresh: true,
		backgroundRefreshInterval: 30 * 1000, // 30 seconds
	},
};

class TeamCache {
	private memoryCache = new Map<string, CacheEntry<unknown>>();
	private backgroundRefreshTimers = new Map<string, NodeJS.Timeout>();
	private readonly storagePrefix = "scioly_team_cache_";

	/**
	 * Get cache key for localStorage
	 */
	private getStorageKey(key: string): string {
		return `${this.storagePrefix}${key}`;
	}

	/**
	 * Get cache configuration for a data type
	 */
	private getCacheConfig(dataType: string): CacheConfig {
		return (
			CACHE_CONFIGS[dataType] || {
				duration: 2 * 60 * 1000,
				backgroundRefresh: false,
				backgroundRefreshInterval: 0,
			}
		);
	}

	/**
	 * Load data from localStorage
	 */
	private loadFromStorage<T>(key: string): T | null {
		try {
			const storageKey = this.getStorageKey(key);
			const cached = SyncLocalStorage.getItem(storageKey);
			if (!cached) {
				return null;
			}

			const parsed = JSON.parse(cached);
			const now = Date.now();
			const config = this.getCacheConfig(this.getDataTypeFromKey(key));

			// Check if cache is still valid
			if (now - parsed.timestamp < config.duration) {
				return parsed.data;
			}

			// Cache expired, remove it
			SyncLocalStorage.removeItem(storageKey);
			return null;
		} catch (error) {
			logger.debug(
				"Failed to load from storage",
				error instanceof Error ? error : new Error(String(error)),
				{
					key,
				},
			);
			return null;
		}
	}

	/**
	 * Save data to localStorage
	 */
	private saveToStorage<T>(key: string, data: T): void {
		try {
			const storageKey = this.getStorageKey(key);
			const cacheEntry = {
				data,
				timestamp: Date.now(),
			};
			SyncLocalStorage.setItem(storageKey, JSON.stringify(cacheEntry));
		} catch (error) {
			logger.debug(
				"Failed to save to storage",
				error instanceof Error ? error : new Error(String(error)),
				{
					key,
				},
			);
			// Ignore storage errors (e.g., quota exceeded)
		}
	}

	/**
	 * Extract data type from cache key
	 */
	private getDataTypeFromKey(key: string): string {
		if (key.includes("roster")) {
			return "roster";
		}
		if (key.includes("stream")) {
			return "stream";
		}
		if (key.includes("assignments")) {
			return "assignments";
		}
		if (key.includes("members")) {
			return "members";
		}
		if (key.includes("subteams")) {
			return "subteams";
		}
		if (key.includes("tournaments")) {
			return "tournaments";
		}
		if (key.includes("timers")) {
			return "timers";
		}
		return "default";
	}

	/**
	 * Get cached data with fallback to localStorage
	 */
	get<T>(key: string): T | null {
		const now = Date.now();
		const cached = this.memoryCache.get(key);
		const config = this.getCacheConfig(this.getDataTypeFromKey(key));

		// Return from memory cache if valid
		if (cached && now - cached.timestamp < config.duration) {
			return cached.data as T;
		}

		// Try localStorage as fallback
		const storageData = this.loadFromStorage<T>(key);
		if (storageData) {
			// Restore to memory cache
			this.memoryCache.set(key, { data: storageData, timestamp: now });
			return storageData;
		}

		return null;
	}

	/**
	 * Set cached data in both memory and localStorage
	 */
	set<T>(key: string, data: T): void {
		const now = Date.now();
		this.memoryCache.set(key, { data, timestamp: now });
		this.saveToStorage(key, data);
	}

	/**
	 * Fetch data with caching and request deduplication
	 */
	async fetchWithCache<T>(
		key: string,
		fetcher: () => Promise<T>,
		dataType?: string,
	): Promise<T> {
		const now = Date.now();
		const type = dataType || this.getDataTypeFromKey(key);
		const config = this.getCacheConfig(type);
		const cached = this.memoryCache.get(key);

		// Return cached data if still valid
		if (cached && now - cached.timestamp < config.duration) {
			return cached.data as T;
		}

		// Try localStorage as fallback
		const storageData = this.loadFromStorage<T>(key);
		if (storageData) {
			// Restore to memory cache
			this.memoryCache.set(key, { data: storageData, timestamp: now });
			return storageData;
		}

		// Return existing promise if already fetching
		if (cached?.promise) {
			return cached.promise as Promise<T>;
		}

		// Create new fetch promise
		const promise = fetcher()
			.then((result) => {
				this.set(key, result);
				return result;
			})
			.catch((err) => {
				this.memoryCache.delete(key);
				throw err;
			});

		// Store the promise to prevent duplicate requests
		this.memoryCache.set(key, {
			data: cached?.data,
			timestamp: cached?.timestamp || 0,
			promise,
		});

		return promise;
	}

	/**
	 * Start background refresh for a cache key
	 */
	startBackgroundRefresh<T>(
		key: string,
		fetcher: () => Promise<T>,
		dataType?: string,
	): void {
		const type = dataType || this.getDataTypeFromKey(key);
		const config = this.getCacheConfig(type);

		if (!config.backgroundRefresh) {
			return;
		}

		// Clear existing timer
		const existingTimer = this.backgroundRefreshTimers.get(key);
		if (existingTimer) {
			clearInterval(existingTimer);
		}

		// Set up background refresh
		const timer = setInterval(async () => {
			try {
				const freshData = await fetcher();
				this.set(key, freshData);
			} catch (error) {
				logger.error(
					"Background cache refresh failed",
					error instanceof Error ? error : new Error(String(error)),
					{
						key,
						dataType: type,
					},
				);
				// Ignore background refresh errors to avoid breaking the main flow
			}
		}, config.backgroundRefreshInterval);

		this.backgroundRefreshTimers.set(key, timer);
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
	 * Clear all cache entries
	 */
	private clearAllCaches(): void {
		this.memoryCache.clear();
		for (const timer of this.backgroundRefreshTimers.values()) {
			clearInterval(timer);
		}
		this.backgroundRefreshTimers.clear();

		// Clear localStorage - in test environment, just call clear
		if (typeof localStorage !== "undefined") {
			try {
				const keys = Object.keys(localStorage);
				for (const storageKey of keys) {
					if (storageKey.startsWith(this.storagePrefix)) {
						SyncLocalStorage.removeItem(storageKey);
					}
				}
			} catch {
				// If we can't iterate over keys, just clear all
				SyncLocalStorage.clear();
			}
		}
	}

	/**
	 * Invalidate cache entry
	 */
	invalidate(key?: string): void {
		if (key) {
			this.memoryCache.delete(key);
			SyncLocalStorage.removeItem(this.getStorageKey(key));
			this.stopBackgroundRefresh(key);
		} else {
			this.clearAllCaches();
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { memoryEntries: number; backgroundTimers: number } {
		return {
			memoryEntries: this.memoryCache.size,
			backgroundTimers: this.backgroundRefreshTimers.size,
		};
	}
}

// Export singleton instance
export const teamCache = new TeamCache();

// Export types for use in components
export type { CacheConfig };
