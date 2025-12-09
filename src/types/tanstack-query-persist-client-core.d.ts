declare module "@tanstack/query-persist-client-core" {
	export interface PersistedClient {
		buster?: string;
		clientState: unknown;
		timestamp: number;
	}

	export interface Persister {
		persistClient: (client: PersistedClient) => Promise<void>;
		restoreClient: () => Promise<PersistedClient | undefined>;
		removeClient: () => Promise<void>;
	}
}
