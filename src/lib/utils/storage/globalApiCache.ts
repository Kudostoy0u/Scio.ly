import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";
/**
 * Global API cache system to eliminate duplicate requests across the entire application
 * This replaces all individual caching systems with a single, unified cache
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

// Global cache configurations
const CACHE_CONFIGS: Record<string, CacheConfig> = {
	"user-teams": {
		duration: 5 * 60 * 1000, // 5 minutes
		backgroundRefresh: false,
		backgroundRefreshInterval: 0,
	},
	subteams: {
		duration: 10 * 60 * 1000, // 10 minutes
		backgroundRefresh: false,
		backgroundRefreshInterval: 0,
	},
	roster: {
		duration: 5 * 60 * 1000, // 5 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 2 * 60 * 1000, // 2 minutes
	},
	members: {
		duration: 2 * 60 * 1000, // 2 minutes
		backgroundRefresh: true,
		backgroundRefreshInterval: 1 * 60 * 1000, // 1 minute
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

class GlobalApiCache {
	private memoryCache = new Map<string, CacheEntry<unknown>>();
	private backgroundRefreshTimers = new Map<string, NodeJS.Timeout>();
	private readonly STORAGE_PREFIX = "scioly_global_cache_";

	/**
	 * Get cache key for localStorage
	 */
	private getStorageKey(key: string): string {
		return `${this.STORAGE_PREFIX}${key}`;
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
				return parsed.data as T;
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
			// Ignore storage errors
		}
	}

	/**
	 * Extract data type from cache key
	 */
	private getDataTypeFromKey(key: string): string {
		if (key.includes("user-teams")) {
			return "user-teams";
		}
		if (key.includes("subteams")) {
			return "subteams";
		}
		if (key.includes("roster")) {
			return "roster";
		}
		if (key.includes("members")) {
			return "members";
		}
		if (key.includes("stream")) {
			return "stream";
		}
		if (key.includes("assignments")) {
			return "assignments";
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
	 * This is the main method that eliminates duplicate requests
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
				// Ignore storage errors to avoid breaking the main flow
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
	 * Invalidate cache entry
	 */
	invalidate(key?: string): void {
		if (key) {
			this.memoryCache.delete(key);
			SyncLocalStorage.removeItem(this.getStorageKey(key));
			this.stopBackgroundRefresh(key);
		} else {
			// Clear all caches
			this.memoryCache.clear();
			for (const timer of this.backgroundRefreshTimers.values()) {
				clearInterval(timer);
			}
			this.backgroundRefreshTimers.clear();

			// Clear localStorage
			if (typeof localStorage !== "undefined") {
				try {
					const keys = Object.keys(localStorage);
					for (const storageKey of keys) {
						if (storageKey.startsWith(this.STORAGE_PREFIX)) {
							SyncLocalStorage.removeItem(storageKey);
						}
					}
				} catch {
					// If we can't iterate over keys, just clear all
					SyncLocalStorage.clear();
				}
			}
		}
	}

	/**
	 * Clear all calendar-related caches for a specific team or user
	 */
	clearCalendarCache(teamSlug?: string, userId?: string): void {
		if (teamSlug) {
			// Clear team calendar cache
			this.invalidate(`calendar_${teamSlug}_events`);
			this.invalidate(`calendar_${teamSlug}_recurring`);
		}

		if (userId) {
			// Clear user personal calendar cache
			this.invalidate(`calendar_user_${userId}_events`);
			this.invalidate(`calendar_user_${userId}_recurring`);
		}

		// Clear all calendar-related caches if no specific identifiers provided
		if (!(teamSlug || userId)) {
			const keysToDelete: string[] = [];
			for (const [key] of this.memoryCache.entries()) {
				if (
					key.includes("calendar_") &&
					(key.includes("_events") || key.includes("_recurring"))
				) {
					keysToDelete.push(key);
				}
			}

			for (const key of keysToDelete) {
				this.invalidate(key);
			}
		}
	}

	/**
	 * Force clear all calendar-related localStorage entries
	 */
	forceClearCalendarLocalStorage(): void {
		if (typeof localStorage !== "undefined") {
			try {
				const keys = Object.keys(localStorage);
				for (const storageKey of keys) {
					if (
						storageKey.startsWith(this.STORAGE_PREFIX) &&
						storageKey.includes("calendar_") &&
						(storageKey.includes("_events") ||
							storageKey.includes("_recurring"))
					) {
						SyncLocalStorage.removeItem(storageKey);
					}
				}
			} catch (error) {
				logger.debug(
					"Failed to clear calendar localStorage",
					error instanceof Error ? error : new Error(String(error)),
				);
				// Ignore storage errors
			}
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

	/**
	 * Preload critical data to avoid multiple requests on page load
	 */
	async preloadCriticalData(userId: string, teamSlug?: string): Promise<void> {
		const promises: Promise<unknown>[] = [];

		// Always preload user teams
		promises.push(
			this.fetchWithCache(
				`user-teams-${userId}`,
				async () => {
					const response = await fetch("/api/teams/user-teams");
					if (!response.ok) {
						throw new Error("Failed to fetch user teams");
					}
					const result = await response.json();
					return result.teams || [];
				},
				"user-teams",
			),
		);

		// If we have a team slug, preload team-specific data
		if (teamSlug) {
			// Preload subteams
			promises.push(
				this.fetchWithCache(
					`subteams-${teamSlug}`,
					async () => {
						const response = await fetch(`/api/teams/${teamSlug}/subteams`);
						if (!response.ok) {
							throw new Error("Failed to fetch subteams");
						}
						const result = await response.json();
						return result.subteams || [];
					},
					"subteams",
				),
			);
		}

		// Wait for all critical data to load
		await Promise.allSettled(promises);
	}
}

// Export singleton instance
export const globalApiCache = new GlobalApiCache();

// Export types for use in components
export type { CacheConfig };
