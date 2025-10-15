'use client';

import { trpc } from '@/lib/trpc/client';

/**
 * Hook for fetching team data using tRPC with automatic batching
 * This replaces multiple individual API calls with a single batched request
 */
export function useTeamDataBatch(teamSlug: string, subteamId?: string, includeRoster = false) {
  return trpc.teams.batchLoadTeamData.useQuery(
    { 
      teamSlug, 
      subteamId, 
      includeRoster 
    },
    {
      enabled: !!teamSlug,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
}

/**
 * Individual query hooks (these will automatically batch when called together)
 */
export function useUserTeams() {
  return trpc.teams.getUserTeams.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSubteams(teamSlug: string) {
  return trpc.teams.getSubteams.useQuery(
    { teamSlug },
    {
      enabled: !!teamSlug,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
}

export function useMembers(teamSlug: string, subteamId?: string) {
  return trpc.teams.getMembers.useQuery(
    { teamSlug, subteamId },
    {
      enabled: !!teamSlug,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
}

export function useRoster(teamSlug: string, subteamId: string) {
  return trpc.teams.getRoster.useQuery(
    { teamSlug, subteamId },
    {
      enabled: !!teamSlug && !!subteamId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
}

