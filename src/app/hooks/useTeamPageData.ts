import { trpc } from "@/lib/trpc/client";

/**
 * ULTIMATE OPTIMIZED HOOK - Single Request for Entire Team Page
 *
 * This hook replaces multiple separate API calls with ONE comprehensive request:
 * - getUserTeams (for sidebar)
 * - getSubteams (for subteam selector)
 * - getTeamDashboard (for main content)
 * - getRoster (for first subteam)
 *
 * Performance benefits:
 * - Reduces 3+ HTTP requests to 1
 * - Single auth check instead of 3
 * - Parallel database queries on backend
 * - Reduced network latency
 * - Faster initial page load
 */
export function useTeamPageData(
  teamSlug: string,
  options?: {
    includeRoster?: boolean;
    enabled?: boolean;
  }
) {
  const { data, isLoading, error, refetch, isError } = trpc.teams.getTeamPageData.useQuery(
    {
      teamSlug,
      includeRoster: options?.includeRoster ?? true,
    },
    {
      enabled: options?.enabled !== false && !!teamSlug,
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      // Enable deduplication for concurrent requests
      refetchOnMount: false,
    }
  );

  // Debug logging in development only
  if (process.env.NODE_ENV === "development" && data) {
    // Debug logging can be added here if needed
  }

  return {
    // All data in one place
    userTeams: data?.userTeams || [],
    currentTeam: data?.currentTeam,
    subteams: data?.subteams || [],
    assignments: data?.assignments || [],
    members: data?.members || [],
    roster: data?.roster || {},
    rosterSubteamId: data?.rosterSubteamId || null,
    auth: data?.auth,

    // Loading states
    isLoading,
    isError,
    error,

    // Actions
    refetch,

    // Computed values
    isCaptain: data?.auth?.role === "captain",
    hasAccess: data?.auth?.isAuthorized,
    firstSubteam: data?.subteams?.[0] || null,

    // Raw data for advanced use cases
    rawData: data,
  };
}
