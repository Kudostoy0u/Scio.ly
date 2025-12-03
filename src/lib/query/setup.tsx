/**
 * React Query Setup with Dexie Persistence
 *
 * Provides persistent caching for team data across page reloads.
 */

"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Dexie from "dexie";
import type { ReactNode } from "react";

// ============================================================================
// DEXIE SETUP
// ============================================================================

class QueryCacheDB extends Dexie {
	queryCache!: Dexie.Table<
		{ key: string; value: string; timestamp: number },
		string
	>;

	constructor() {
		super("ReactQueryCache");
		this.version(1).stores({
			queryCache: "key, timestamp",
		});
	}
}

const db = new QueryCacheDB();

// ============================================================================
// STORAGE PERSISTER
// ============================================================================

/**
 * Synchronous storage interface backed by Dexie
 * Uses in-memory cache for sync reads, async persistence to IndexedDB
 */
const createDexieStorage = () => {
	const memCache = new Map<string, string>();

	// Initialize: Load from Dexie on startup
	(async () => {
		try {
			const items = await db.queryCache.toArray();
			for (const item of items) {
				memCache.set(item.key, item.value);
			}
		} catch {
			// ignore load failures
		}
	})();

	return {
		getItem: (key: string) => {
			return memCache.get(key) ?? null;
		},
		setItem: (key: string, value: string) => {
			memCache.set(key, value);
			// Async persist to Dexie
			db.queryCache.put({ key, value, timestamp: Date.now() }).catch(() => {});
		},
		removeItem: (key: string) => {
			memCache.delete(key);
			db.queryCache.delete(key).catch(() => {});
		},
	};
};

const persister = createSyncStoragePersister({
	storage: createDexieStorage(),
	key: "TEAM_QUERY_CACHE",
});

// ============================================================================
// QUERY CLIENT
// ============================================================================

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Data is fresh for 5 minutes
			staleTime: 5 * 60 * 1000,
			// Keep data in cache for 30 minutes
			gcTime: 30 * 60 * 1000,
			// Retry once on failure
			retry: 1,
			// Don't refetch on window focus (require manual refresh)
			refetchOnWindowFocus: false,
			// Use cached data on mount (don't refetch immediately)
			refetchOnMount: false,
			// Don't refetch on reconnect
			refetchOnReconnect: false,
		},
	},
});

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface QueryProviderProps {
	children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				maxAge: 24 * 60 * 60 * 1000, // 24 hours
				buster: "v1", // Increment to force cache invalidation
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}

/**
 * Export query client for use outside React
 */
export { queryClient };

/**
 * Clear all persisted cache (useful for debugging/logout)
 */
export async function clearPersistedCache() {
	await db.queryCache.clear();
	queryClient.clear();
}
