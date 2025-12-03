/**
 * React Query Client Configuration
 *
 * Centralized React Query setup with persistence.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Data is considered fresh for 5 minutes
			staleTime: 5 * 60 * 1000,
			// Cache data for 30 minutes
			gcTime: 30 * 60 * 1000,
			// Retry failed requests
			retry: 1,
			// Don't refetch on window focus by default (user must reload)
			refetchOnWindowFocus: false,
			// Don't refetch on mount (use cached data)
			refetchOnMount: false,
			// Don't refetch on reconnect
			refetchOnReconnect: false,
		},
	},
});
