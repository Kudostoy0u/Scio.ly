/**
 * React Query Persister using Dexie
 *
 * Persists React Query cache to IndexedDB for offline support
 * and instant page loads.
 */

import Dexie from "dexie";

import type {
	PersistedClient,
	Persister,
} from "@tanstack/query-persist-client-core";

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

const PERSIST_KEY = "REACT_QUERY_OFFLINE_CACHE";

// Async persister backed by Dexie, implementing TanStack Persister interface
export const queryPersister: Persister = {
	persistClient: async (client: PersistedClient) => {
		const serialized = JSON.stringify(client);
		await db.queryCache.put({ key: PERSIST_KEY, value: serialized });
	},
	restoreClient: async () => {
		const record = await db.queryCache.get(PERSIST_KEY);
		if (!record?.value) {
			return undefined;
		}
		return JSON.parse(record.value) as PersistedClient;
	},
	removeClient: async () => {
		await db.queryCache.delete(PERSIST_KEY);
	},
};

/**
 * Clear all persisted query cache
 */
export async function clearQueryCache(): Promise<void> {
	await db.queryCache.clear();
}
