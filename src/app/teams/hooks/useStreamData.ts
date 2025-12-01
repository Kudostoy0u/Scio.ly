/**
 * useStreamData Hook
 *
 * This hook uses tRPC to fetch stream data (posts, timers, tournaments)
 * in a single batched request, reducing edge requests.
 *
 * Usage:
 * const { data, isLoading, error, refetch } = useStreamData(teamSlug, subteamId);
 */

import { trpc } from "@/lib/trpc/client";

export interface UseStreamDataOptions {
  enabled?: boolean;
}

export function useStreamData(
  teamSlug: string | undefined,
  subteamId: string | undefined,
  options: UseStreamDataOptions = {}
) {
  const { enabled = true } = options;

  // Use the batched endpoint that fetches stream, timers, and tournaments in one request
  const query = trpc.teams.getStreamData.useQuery(
    {
      teamSlug: teamSlug ?? "",
      subteamId: subteamId ?? "",
    },
    {
      enabled: enabled && !!teamSlug && !!subteamId,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  return {
    // Data
    posts: query.data?.posts ?? [],
    timers: query.data?.timers ?? [],
    events: query.data?.events ?? [],

    // Query state
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,

    // Actions
    refetch: query.refetch,
  };
}

/**
 * useStream Hook
 *
 * Fetches only stream posts for a subteam.
 */
export function useStream(
  teamSlug: string | undefined,
  subteamId: string | undefined,
  options: UseStreamDataOptions = {}
) {
  const { enabled = true } = options;

  const query = trpc.teams.getStream.useQuery(
    {
      teamSlug: teamSlug ?? "",
      subteamId: subteamId ?? "",
    },
    {
      enabled: enabled && !!teamSlug && !!subteamId,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    posts: query.data?.posts ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * useTimers Hook
 *
 * Fetches only active timers for a subteam.
 */
export function useTimers(
  teamSlug: string | undefined,
  subteamId: string | undefined,
  options: UseStreamDataOptions = {}
) {
  const { enabled = true } = options;

  const query = trpc.teams.getTimers.useQuery(
    {
      teamSlug: teamSlug ?? "",
      subteamId: subteamId ?? "",
    },
    {
      enabled: enabled && !!teamSlug && !!subteamId,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    timers: query.data?.timers ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * useTournaments Hook
 *
 * Fetches upcoming tournaments/events for a subteam.
 */
export function useTournaments(
  teamSlug: string | undefined,
  subteamId: string | undefined,
  options: UseStreamDataOptions = {}
) {
  const { enabled = true } = options;

  const query = trpc.teams.getTournaments.useQuery(
    {
      teamSlug: teamSlug ?? "",
      subteamId: subteamId ?? "",
    },
    {
      enabled: enabled && !!teamSlug && !!subteamId,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    events: query.data?.events ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
