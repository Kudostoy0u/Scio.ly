/**
 * Centralized Team Cache Manager
 *
 * This module provides a clean, API-driven cache management system that:
 * - Only updates cache when API returns new data
 * - Handles all cache operations in one place
 * - Provides reliable cache invalidation
 * - Eliminates race conditions and timing issues
 */

import { useTeamStore } from "@/lib/stores/teamStore";
import type { RosterData, Subteam, TeamMember } from "@/lib/stores/teamStore";
import logger from "@/lib/utils/logging/logger";

export interface CacheUpdateResult {
	success: boolean;
	data?: unknown;
	error?: string;
}

export interface CacheOperation {
	type: "fetch" | "invalidate" | "update";
	key: string;
	data?: unknown;
	timestamp?: number;
}

class TeamCacheManager {
	private static instance: TeamCacheManager;
	private pendingOperations: Map<string, Promise<unknown>> = new Map();
	private cacheUpdateQueue: CacheOperation[] = [];
	private isProcessingQueue = false;

	private constructor() {}

	static getInstance(): TeamCacheManager {
		if (!TeamCacheManager.instance) {
			TeamCacheManager.instance = new TeamCacheManager();
		}
		return TeamCacheManager.instance;
	}

	/**
	 * Get cache key for any data type
	 */
	getCacheKey(type: string, ...params: string[]): string {
		return `${type}-${params.join("-")}`;
	}

	/**
	 * Check if data is fresh based on timestamp
	 */
	isDataFresh(key: string, maxAge: number = 2 * 60 * 1000): boolean {
		const store = useTeamStore.getState();
		const timestamp = store.cacheTimestamps[key];
		if (!timestamp) {
			return false;
		}
		return Date.now() - timestamp < maxAge;
	}

	/**
	 * Queue a cache operation for processing
	 */
	private queueOperation(operation: CacheOperation): void {
		this.cacheUpdateQueue.push(operation);
		this.processQueue();
	}

	/**
	 * Process the cache update queue
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue || this.cacheUpdateQueue.length === 0) {
			return;
		}

		this.isProcessingQueue = true;

		while (this.cacheUpdateQueue.length > 0) {
			const operation = this.cacheUpdateQueue.shift();
			if (!operation) {
				continue;
			}

			try {
				await this.executeOperation(operation);
			} catch (error) {
				logger.error(
					"Failed to execute cache operation",
					error instanceof Error ? error : new Error(String(error)),
					{
						operationType: operation.type,
					},
				);
				// Ignore errors to avoid breaking the main flow
			}
		}

		this.isProcessingQueue = false;
	}

	/**
	 * Execute a cache operation
	 */
	private executeOperation(operation: CacheOperation): Promise<void> {
		// const store = useTeamStore.getState();

		switch (operation.type) {
			case "fetch":
				// Only update if we have new data
				if (operation.data) {
					this.updateCacheData(
						operation.key,
						operation.data,
						operation.timestamp,
					);
				}
				break;

			case "invalidate":
				this.invalidateCacheKey(operation.key);
				break;

			case "update":
				if (operation.data) {
					this.updateCacheData(
						operation.key,
						operation.data,
						operation.timestamp,
					);
				}
				break;

			default:
				// Unknown operation type, ignore
				break;
		}
		return Promise.resolve();
	}

	/**
	 * Update cache data with new information
	 */
	private updateCacheData(
		key: string,
		data: unknown,
		timestamp?: number,
	): void {
		const updateTimestamp = timestamp || Date.now();

		// Determine data type from key
		const [type] = key.split("-");

		switch (type) {
			case "members":
				// const teamSlug = this.extractTeamSlug(key);
				// const subteamId = this.extractSubteamId(key);

				// Update the team store directly
				useTeamStore.setState((state) => ({
					...state,
					members: { ...state.members, [key]: data as TeamMember[] },
					cacheTimestamps: { ...state.cacheTimestamps, [key]: updateTimestamp },
				}));
				break;
			case "roster":
				// const rosterTeamSlug = this.extractTeamSlug(key);
				// const rosterSubteamId = this.extractSubteamId(key);

				useTeamStore.setState((state) => ({
					...state,
					roster: { ...state.roster, [key]: data as RosterData },
					cacheTimestamps: { ...state.cacheTimestamps, [key]: updateTimestamp },
				}));
				break;
			case "subteams": {
				// Update subteams cache
				const subteamsSlug = this.extractTeamSlug(key);
				useTeamStore.setState((state) => ({
					...state,
					subteams: {
						...state.subteams,
						[subteamsSlug]: data as Subteam[],
					},
					cacheTimestamps: { ...state.cacheTimestamps, [key]: updateTimestamp },
				}));
				break;
			}
			default:
				// Generic cache update
				useTeamStore.setState((state) => ({
					cacheTimestamps: { ...state.cacheTimestamps, [key]: updateTimestamp },
				}));
		}
	}

	/**
	 * Invalidate a specific cache key
	 */
	private invalidateCacheKey(key: string): void {
		useTeamStore.setState((state) => {
			const newCacheTimestamps = { ...state.cacheTimestamps };
			delete newCacheTimestamps[key];
			return { cacheTimestamps: newCacheTimestamps };
		});
	}

	/**
	 * Extract team slug from cache key
	 */
	private extractTeamSlug(key: string): string {
		const parts = key.split("-");
		return parts[1] || "";
	}

	/**
	 * Fetch data with proper cache management
	 */
	async fetchData<T>(
		type: string,
		fetcher: () => Promise<T>,
		...params: string[]
	): Promise<T> {
		const key = this.getCacheKey(type, ...params);

		// Check if data is fresh
		if (this.isDataFresh(key) && this.hasCachedData(key)) {
			return this.getCachedData(key) as T;
		}

		// Check if request is already in flight
		const pending = this.pendingOperations.get(key);
		if (pending) {
			return pending as T;
		}

		// Create new request
		const request = fetcher()
			.then((data) => {
				// Queue cache update with new data
				this.queueOperation({
					type: "fetch",
					key,
					data,
					timestamp: Date.now(),
				});
				return data;
			})
			.finally(() => {
				this.pendingOperations.delete(key);
			});

		this.pendingOperations.set(key, request);
		return request;
	}

	/**
	 * Check if we have cached data for a key
	 */
	private hasCachedData(key: string): boolean {
		const store = useTeamStore.getState();
		const [type] = key.split("-");

		switch (type) {
			case "members":
				return !!store.members[key];
			case "roster":
				return !!store.roster[key];
			case "subteams": {
				const teamSlug = this.extractTeamSlug(key);
				return !!store.subteams[teamSlug];
			}
			default:
				return false;
		}
	}

	/**
	 * Get cached data for a key
	 */
	private getCachedData(key: string): unknown {
		const store = useTeamStore.getState();
		const [type] = key.split("-");

		switch (type) {
			case "members":
				return store.members[key];
			case "roster":
				return store.roster[key];
			case "subteams": {
				const teamSlug = this.extractTeamSlug(key);
				return store.subteams[teamSlug];
			}
			default:
				return null;
		}
	}

	/**
	 * Invalidate cache after successful API operation
	 */
	invalidateAfterOperation(type: string, ...params: string[]): void {
		const key = this.getCacheKey(type, ...params);
		this.queueOperation({
			type: "invalidate",
			key,
		});
	}

	/**
	 * Update cache with new data from API
	 */
	updateCache(type: string, data: unknown, ...params: string[]): void {
		const key = this.getCacheKey(type, ...params);
		this.queueOperation({
			type: "update",
			key,
			data,
			timestamp: Date.now(),
		});
	}

	/**
	 * Force refresh data by invalidating cache and fetching fresh data
	 */
	async forceRefresh<T>(
		type: string,
		fetcher: () => Promise<T>,
		...params: string[]
	): Promise<T> {
		// const key = this.getCacheKey(type, ...params);

		// Invalidate cache first
		this.invalidateAfterOperation(type, ...params);

		// Wait a moment for invalidation to process
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Fetch fresh data
		return this.fetchData(type, fetcher, ...params);
	}

	/**
	 * Clear all cache
	 */
	clearAllCache(): void {
		useTeamStore.getState().clearAllCache();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		totalKeys: number;
		freshKeys: number;
		staleKeys: number;
		pendingOperations: number;
	} {
		const store = useTeamStore.getState();
		const now = Date.now();
		const maxAge = 2 * 60 * 1000; // 2 minutes

		const keys = Object.keys(store.cacheTimestamps);
		const freshKeys = keys.filter((key) => {
			const timestamp = store.cacheTimestamps[key];
			return timestamp && now - timestamp < maxAge;
		});

		return {
			totalKeys: keys.length,
			freshKeys: freshKeys.length,
			staleKeys: keys.length - freshKeys.length,
			pendingOperations: this.pendingOperations.size,
		};
	}
}

// Export singleton instance
export const teamCacheManager = TeamCacheManager.getInstance();

// Export convenience functions
export const getCacheKey = (type: string, ...params: string[]) =>
	teamCacheManager.getCacheKey(type, ...params);

export const fetchWithCache = <T>(
	type: string,
	fetcher: () => Promise<T>,
	...params: string[]
) => teamCacheManager.fetchData(type, fetcher, ...params);

export const invalidateCache = (type: string, ...params: string[]) =>
	teamCacheManager.invalidateAfterOperation(type, ...params);

export const updateCache = (type: string, data: unknown, ...params: string[]) =>
	teamCacheManager.updateCache(type, data, ...params);

export const forceRefresh = <T>(
	type: string,
	fetcher: () => Promise<T>,
	...params: string[]
) => teamCacheManager.forceRefresh(type, fetcher, ...params);

export const clearAllCache = () => teamCacheManager.clearAllCache();

export const getCacheStats = () => teamCacheManager.getCacheStats();
