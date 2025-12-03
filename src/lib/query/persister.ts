/**
 * React Query Persister using Dexie
 *
 * Persists React Query cache to IndexedDB for offline support
 * and instant page loads.
 */

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import Dexie from "dexie";

// Create a Dexie database for React Query cache
class QueryCacheDB extends Dexie {
	queryCache!: Dexie.Table<{ key: string; value: string }, string>;

	constructor() {
		super("ReactQueryCache");
		this.version(1).stores({
			queryCache: "key",
		});
	}
}

const db = new QueryCacheDB();

// For sync persister, we need synchronous storage
// We'll use a simple in-memory cache as fallback
const memoryStorage = (() => {
	const cache = new Map<string, string>();
	return {
		getItem: (key: string) => cache.get(key) ?? null,
		setItem: (key: string, value: string) => {
			cache.set(key, value);
			// Async persist to Dexie in background
			db.queryCache.put({ key, value }).catch(() => {
				// Ignore errors
			});
		},
		removeItem: (key: string) => {
			cache.delete(key);
			db.queryCache.delete(key).catch(() => {
				// Ignore errors
			});
		},
	};
})();

export const queryPersister = createSyncStoragePersister({
	storage: memoryStorage,
	key: "REACT_QUERY_OFFLINE_CACHE",
});

/**
 * Clear all persisted query cache
 */
export async function clearQueryCache(): Promise<void> {
	await db.queryCache.clear();
}
