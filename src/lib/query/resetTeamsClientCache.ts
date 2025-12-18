import { queryClient } from "@/lib/query/client";
import { clearQueryCache } from "@/lib/query/persister";
import { globalApiCache } from "@/lib/utils/storage/globalApiCache";

/**
 * Clears all client-side cached team data.
 *
 * This intentionally wipes the persisted React Query cache (Dexie) and in-memory
 * QueryClient cache to prevent cross-account data/role leakage after auth changes.
 */
export async function resetTeamsClientCache() {
	// Clear localStorage-based caches used by some teams features.
	globalApiCache.invalidate();

	// Clear in-memory react-query cache (affects tRPC queries too).
	queryClient.clear();

	// Clear persisted react-query cache in IndexedDB (Dexie).
	await clearQueryCache();
}
