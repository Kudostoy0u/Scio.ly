import { trpc } from "@/lib/trpc/client";

/**
 * Optimized hook that fetches all team data in a single request
 * This replaces multiple individual API calls with one comprehensive endpoint
 */
export function useTeamDashboard(teamSlug: string, subteamId?: string) {
  const { data, isLoading, error, refetch } = trpc.teams.getTeamDashboard.useQuery(
    { teamSlug, subteamId },
    {
      enabled: !!teamSlug,
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes (replaces cacheTime)
    }
  );

  return {
    // Raw data
    subteams: data?.subteams || [],
    assignments: data?.assignments || [],
    members: data?.members || [],
    roster: data?.roster || {},
    auth: data?.auth,

    // Loading states
    isLoading,
    error,

    // Actions
    refetch,

    // Computed values
    isCaptain: data?.auth?.role === "captain",
    hasAccess: data?.auth?.isAuthorized,
  };
}
