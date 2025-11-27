/**
 * Data Fetching Actions for Team Store
 */
import { trpcClient } from "../client";
import type {
  Assignment,
  RosterData,
  StreamPost,
  Subteam,
  TeamMember,
  TeamStoreActions,
  TeamStoreState,
  Timer,
  Tournament,
  UserTeam,
} from "../types";
import { CACHE_DURATIONS } from "../types";
import { fetchWithDeduplication, handleApiError } from "../utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchActions = (
  get: () => StoreSlice,
  set: (partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>)) => void
): Partial<TeamStoreActions> => {
  const getCacheKey = (type: string, ...params: string[]) => `${type}-${params.join("-")}`;

  const isDataFresh = (key: string, maxAge: number = 5 * 60 * 1000) => {
    const timestamp = get().cacheTimestamps[key];
    if (!timestamp) {
      return false;
    }
    return Date.now() - timestamp < maxAge;
  };

  const fetchUserTeams = async (userId: string): Promise<UserTeam[]> => {
    const key = getCacheKey("userTeams", userId);

    if (isDataFresh(key, CACHE_DURATIONS.userTeams) && get().userTeams.length > 0) {
      return get().userTeams;
    }

    set((state) => ({
      loading: { ...state.loading, userTeams: true },
      errors: { ...state.errors, userTeams: null },
    }));

    try {
      const teams = await fetchWithDeduplication(key, async () => {
        const result = await (
          trpcClient.teams.getUserTeams as { query: () => Promise<{ teams: unknown[] }> }
        ).query();
        return (result.teams || []).map((team: unknown) => {
          const t = team as {
            id: unknown;
            slug: unknown;
            school: unknown;
            division: unknown;
            user_role?: unknown;
            role?: unknown;
            name: unknown;
          };
          return {
            id: String(t.id ?? ""),
            slug: String(t.slug ?? ""),
            school: String(t.school ?? ""),
            division: (t.division ?? "B") as "B" | "C",
            user_role: String(t.user_role ?? t.role ?? "member"),
            name: String(t.name ?? ""),
          };
        }) as UserTeam[];
      });

      set((state) => ({
        userTeams: teams,
        loading: { ...state.loading, userTeams: false },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return teams;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchUserTeams");
      set((state) => ({
        loading: { ...state.loading, userTeams: false },
        errors: { ...state.errors, userTeams: errorMessage },
      }));
      throw error;
    }
  };

  const fetchSubteams = async (teamSlug: string): Promise<Subteam[]> => {
    const key = getCacheKey("subteams", teamSlug);

    if (isDataFresh(key, CACHE_DURATIONS.subteams) && get().subteams[teamSlug]) {
      return get().subteams[teamSlug] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        subteams: { ...state.loading.subteams, [teamSlug]: true },
      },
      errors: {
        ...state.errors,
        subteams: { ...state.errors.subteams, [teamSlug]: null },
      },
    }));

    try {
      const subteams = (await fetchWithDeduplication(key, async () => {
        const result = await (
          trpcClient.teams.getSubteams as {
            query: (input: { teamSlug: string }) => Promise<{ subteams: unknown[] }>;
          }
        ).query({ teamSlug });
        return ((result.subteams || []) as Record<string, unknown>[]).map(
          (subteam: Record<string, unknown>) => ({
            id: subteam.id,
            name: subteam.name,
            team_id: subteam.team_id,
            description: subteam.description || "",
            created_at: subteam.created_at,
          })
        ) as Subteam[];
      })) as Subteam[];

      set((state) => ({
        subteams: { ...state.subteams, [teamSlug]: subteams },
        loading: {
          ...state.loading,
          subteams: { ...state.loading.subteams, [teamSlug]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return subteams;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchSubteams");
      set((state) => ({
        loading: {
          ...state.loading,
          subteams: { ...state.loading.subteams, [teamSlug]: false },
        },
        errors: {
          ...state.errors,
          subteams: { ...state.errors.subteams, [teamSlug]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchRoster = async (teamSlug: string, subteamId: string): Promise<RosterData> => {
    const key = getCacheKey("roster", teamSlug, subteamId);
    const cachedRoster = get().roster[key];
    const isFresh = isDataFresh(key, CACHE_DURATIONS.roster);
    const hasData = cachedRoster && Object.keys(cachedRoster.roster || {}).length > 0;

    if (isFresh && hasData) {
      return cachedRoster;
    }

    set((state) => ({
      loading: {
        ...state.loading,
        roster: { ...state.loading.roster, [key]: true },
      },
      errors: {
        ...state.errors,
        roster: { ...state.errors.roster, [key]: null },
      },
    }));

    try {
      const rosterData = await fetchWithDeduplication(key, async () => {
        const result = await (
          trpcClient.teams.getRoster as {
            query: (input: { teamSlug: string; subteamId: string }) => Promise<{
              roster: Record<string, string[]>;
              removedEvents: string[];
            }>;
          }
        ).query({ teamSlug, subteamId });
        return {
          roster: result.roster || {},
          removed_events: result.removedEvents || [],
        };
      });

      set((state) => ({
        roster: { ...state.roster, [key]: rosterData },
        loading: {
          ...state.loading,
          roster: { ...state.loading.roster, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return rosterData;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchRoster");
      set((state) => ({
        loading: {
          ...state.loading,
          roster: { ...state.loading.roster, [key]: false },
        },
        errors: {
          ...state.errors,
          roster: { ...state.errors.roster, [key]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchMembers = async (teamSlug: string, subteamId = "all"): Promise<TeamMember[]> => {
    const key = getCacheKey("members", teamSlug, subteamId);

    if (isDataFresh(key, CACHE_DURATIONS.members) && get().members[key]) {
      return get().members[key] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        members: { ...state.loading.members, [key]: true },
      },
      errors: {
        ...state.errors,
        members: { ...state.errors.members, [key]: null },
      },
    }));

    try {
      const members = (await fetchWithDeduplication(key, async () => {
        const result = await (
          trpcClient.teams.getMembers as {
            query: (input: { teamSlug: string; subteamId?: string }) => Promise<{
              members: TeamMember[];
            }>;
          }
        ).query({
          teamSlug,
          subteamId: subteamId && subteamId !== "all" ? subteamId : undefined,
        });
        return result.members || [];
      })) as TeamMember[];

      set((state) => ({
        members: { ...state.members, [key]: members },
        loading: {
          ...state.loading,
          members: { ...state.loading.members, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return members;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchMembers");
      set((state) => ({
        loading: {
          ...state.loading,
          members: { ...state.loading.members, [key]: false },
        },
        errors: {
          ...state.errors,
          members: { ...state.errors.members, [key]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchStream = async (teamSlug: string, subteamId: string): Promise<StreamPost[]> => {
    const key = getCacheKey("stream", teamSlug, subteamId);

    if (isDataFresh(key, CACHE_DURATIONS.stream) && get().stream[key]) {
      return get().stream[key] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        stream: { ...state.loading.stream, [key]: true },
      },
      errors: {
        ...state.errors,
        stream: { ...state.errors.stream, [key]: null },
      },
    }));

    try {
      const stream = await fetchWithDeduplication(key, async () => {
        const response = await fetch(`/api/teams/${teamSlug}/stream?subteamId=${subteamId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        return (result.posts || []) as StreamPost[];
      });

      const finalStream: StreamPost[] = stream || [];

      set((state) => ({
        stream: { ...state.stream, [key]: finalStream },
        loading: {
          ...state.loading,
          stream: { ...state.loading.stream, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return finalStream;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchStream");
      set((state) => ({
        loading: {
          ...state.loading,
          stream: { ...state.loading.stream, [key]: false },
        },
        errors: {
          ...state.errors,
          stream: { ...state.errors.stream, [key]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchAssignments = async (teamSlug: string): Promise<Assignment[]> => {
    const key = getCacheKey("assignments", teamSlug);

    if (isDataFresh(key, CACHE_DURATIONS.assignments) && get().assignments[key]) {
      return get().assignments[key] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        assignments: { ...state.loading.assignments, [key]: true },
      },
      errors: {
        ...state.errors,
        assignments: { ...state.errors.assignments, [key]: null },
      },
    }));

    try {
      const assignments = await fetchWithDeduplication(key, async () => {
        const response = await fetch("/api/trpc/teams.getAssignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: { teamSlug },
            meta: { values: { teamSlug: [undefined] } },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        return (result.result?.data?.assignments || []) as Assignment[];
      });

      const finalAssignments: Assignment[] = assignments || [];

      set((state) => ({
        assignments: { ...state.assignments, [key]: finalAssignments },
        loading: {
          ...state.loading,
          assignments: { ...state.loading.assignments, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return finalAssignments;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchAssignments");
      set((state) => ({
        loading: {
          ...state.loading,
          assignments: { ...state.loading.assignments, [key]: false },
        },
        errors: {
          ...state.errors,
          assignments: { ...state.errors.assignments, [key]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchTournaments = async (teamSlug: string, subteamId: string): Promise<Tournament[]> => {
    const key = getCacheKey("tournaments", teamSlug, subteamId);

    if (isDataFresh(key, CACHE_DURATIONS.tournaments) && get().tournaments[key]) {
      return get().tournaments[key] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        tournaments: { ...state.loading.tournaments, [key]: true },
      },
      errors: {
        ...state.errors,
        tournaments: { ...state.errors.tournaments, [key]: null },
      },
    }));

    try {
      const tournaments = await fetchWithDeduplication(key, async () => {
        const response = await fetch(`/api/teams/${teamSlug}/tournaments?subteamId=${subteamId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        return (result.events || []) as Tournament[];
      });

      const finalTournaments: Tournament[] = tournaments || [];

      set((state) => ({
        tournaments: { ...state.tournaments, [key]: finalTournaments },
        loading: {
          ...state.loading,
          tournaments: { ...state.loading.tournaments, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return finalTournaments;
    } catch (error) {
      const _errorMessage = handleApiError(error, "fetchTournaments");
      set((state) => ({
        loading: {
          ...state.loading,
          tournaments: { ...state.loading.tournaments, [key]: false },
        },
        errors: {
          ...state.errors,
          tournaments: { ...state.errors.tournaments, [key]: _errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchTimers = async (teamSlug: string, subteamId: string): Promise<Timer[]> => {
    const key = getCacheKey("timers", teamSlug, subteamId);

    if (isDataFresh(key, CACHE_DURATIONS.timers) && get().timers[key]) {
      return get().timers[key] || [];
    }

    set((state) => ({
      loading: {
        ...state.loading,
        timers: { ...state.loading.timers, [key]: true },
      },
      errors: {
        ...state.errors,
        timers: { ...state.errors.timers, [key]: null },
      },
    }));

    try {
      const timers = await fetchWithDeduplication(key, async () => {
        const response = await fetch(`/api/teams/${teamSlug}/timers?subteamId=${subteamId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        return (result.timers || []) as Timer[];
      });

      const finalTimers: Timer[] = timers || [];

      set((state) => ({
        timers: { ...state.timers, [key]: finalTimers },
        loading: {
          ...state.loading,
          timers: { ...state.loading.timers, [key]: false },
        },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));

      return finalTimers;
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchTimers");
      set((state) => ({
        loading: {
          ...state.loading,
          timers: { ...state.loading.timers, [key]: false },
        },
        errors: {
          ...state.errors,
          timers: { ...state.errors.timers, [key]: errorMessage },
        },
      }));
      throw error;
    }
  };

  const fetchStreamData = async (
    teamSlug: string,
    subteamId: string
  ): Promise<{
    stream: StreamPost[];
    tournaments: Tournament[];
    timers: Timer[];
  }> => {
    const key = getCacheKey("stream-data", teamSlug, subteamId);

    if (isDataFresh(key, CACHE_DURATIONS.stream) && get().stream[key]) {
      const streamKey = getCacheKey("stream", teamSlug, subteamId);
      const tournamentsKey = getCacheKey("tournaments", teamSlug, subteamId);
      const timersKey = getCacheKey("timers", teamSlug, subteamId);

      return {
        stream: get().stream[streamKey] || [],
        tournaments: get().tournaments[tournamentsKey] || [],
        timers: get().timers[timersKey] || [],
      };
    }

    const streamKey = getCacheKey("stream", teamSlug, subteamId);
    const tournamentsKey = getCacheKey("tournaments", teamSlug, subteamId);
    const timersKey = getCacheKey("timers", teamSlug, subteamId);

    set((state) => ({
      loading: {
        ...state.loading,
        stream: { ...state.loading.stream, [streamKey]: true },
        tournaments: { ...state.loading.tournaments, [tournamentsKey]: true },
        timers: { ...state.loading.timers, [timersKey]: true },
      },
      errors: {
        ...state.errors,
        stream: { ...state.errors.stream, [streamKey]: null },
        tournaments: { ...state.errors.tournaments, [tournamentsKey]: null },
        timers: { ...state.errors.timers, [timersKey]: null },
      },
    }));

    try {
      const { stream, tournaments, timers } = await fetchWithDeduplication(key, async () => {
        const [streamRes, tournamentsRes, timersRes] = await Promise.all([
          fetch(`/api/teams/${teamSlug}/stream?subteamId=${subteamId}`),
          fetch(`/api/teams/${teamSlug}/tournaments?subteamId=${subteamId}`),
          fetch(`/api/teams/${teamSlug}/timers?subteamId=${subteamId}`),
        ]);

        if (!streamRes.ok) {
          throw new Error(`HTTP ${streamRes.status}`);
        }
        if (!tournamentsRes.ok) {
          throw new Error(`HTTP ${tournamentsRes.status}`);
        }
        if (!timersRes.ok) {
          throw new Error(`HTTP ${timersRes.status}`);
        }

        const [streamJson, tournamentsJson, timersJson] = await Promise.all([
          streamRes.json(),
          tournamentsRes.json(),
          timersRes.json(),
        ]);

        return {
          stream: streamJson.posts || [],
          tournaments: tournamentsJson.events || [],
          timers: timersJson.timers || [],
        };
      });

      set((state) => ({
        stream: { ...state.stream, [streamKey]: stream },
        tournaments: { ...state.tournaments, [tournamentsKey]: tournaments },
        timers: { ...state.timers, [timersKey]: timers },
        loading: {
          ...state.loading,
          stream: { ...state.loading.stream, [streamKey]: false },
          tournaments: { ...state.loading.tournaments, [tournamentsKey]: false },
          timers: { ...state.loading.timers, [timersKey]: false },
        },
        cacheTimestamps: {
          ...state.cacheTimestamps,
          [streamKey]: Date.now(),
          [tournamentsKey]: Date.now(),
          [timersKey]: Date.now(),
        },
      }));

      return { stream, tournaments, timers };
    } catch (error) {
      const errorMessage = handleApiError(error, "fetchStreamData");
      set((state) => ({
        loading: {
          ...state.loading,
          stream: { ...state.loading.stream, [streamKey]: false },
          tournaments: { ...state.loading.tournaments, [tournamentsKey]: false },
          timers: { ...state.loading.timers, [timersKey]: false },
        },
        errors: {
          ...state.errors,
          stream: { ...state.errors.stream, [streamKey]: errorMessage },
          tournaments: { ...state.errors.tournaments, [tournamentsKey]: errorMessage },
          timers: { ...state.errors.timers, [timersKey]: errorMessage },
        },
      }));
      throw error;
    }
  };

  return {
    fetchUserTeams,
    fetchSubteams,
    fetchRoster,
    fetchMembers,
    fetchStream,
    fetchAssignments,
    fetchTournaments,
    fetchTimers,
    fetchStreamData,
  };
};
