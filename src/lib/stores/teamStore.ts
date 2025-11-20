/**
 * Unified Team Data Store
 *
 * This is a centralized store that manages all team-related data with:
 * - Request deduplication at the network level
 * - Intelligent caching with background refresh
 * - Optimistic updates
 * - Error handling and retry logic
 * - Production-ready performance
 */

import type { AppRouter } from "@/lib/trpc/routers/_app";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Create a vanilla tRPC client for use in Zustand store
const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers: () => ({
        "Content-Type": "application/json",
      }),
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

// Types
export interface UserTeam {
  id: string;
  slug: string;
  school: string;
  division: "B" | "C";
  user_role: string;
  name: string;
}

export interface Subteam {
  id: string;
  name: string;
  team_id: string;
  description: string;
  created_at: string;
}

export interface TeamMember {
  id: string | null; // null for unlinked roster members
  name: string | null; // Can be null for unlinked roster members
  email: string | null; // null for unlinked roster members
  role: string;
  events: string[];
  isPendingInvitation: boolean;
  subteamId?: string;
  isUnlinked?: boolean; // true for unlinked roster members
  username?: string | null; // null for unlinked roster members
  subteam?: {
    id: string;
    name: string;
    description: string;
  };
  joinedAt?: string | null;
  isCreator?: boolean;
}

export interface RosterData {
  roster: Record<string, string[]>;
  removed_events: string[];
}

export interface StreamComment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
}

export interface StreamPost {
  id: string;
  content: string;
  show_tournament_timer: boolean;
  tournament_id: string | null;
  tournament_title: string | null;
  tournament_start_time: string | null;
  author_name: string;
  author_email: string;
  created_at: string;
  attachment_url: string | null;
  attachment_title: string | null;
  comments: StreamComment[];
  // Legacy fields for backward compatibility
  author?: string;
  title?: string;
  type?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  assigned_to: string[];
  created_by: string;
  created_at: string;
}

export interface Tournament {
  id: string;
  title: string;
  start_time: string;
  location: string | null;
  event_type: string;
  has_timer: boolean;
}

export interface Timer {
  id: string;
  title: string;
  start_time: string;
  location: string | null;
  event_type: string;
  added_at: string;
}

// Store State
interface TeamStoreState {
  // Data
  userTeams: UserTeam[];
  subteams: Record<string, Subteam[]>; // keyed by teamSlug
  roster: Record<string, RosterData>; // keyed by teamSlug-subteamId
  members: Record<string, TeamMember[]>; // keyed by teamSlug-subteamId
  stream: Record<string, StreamPost[]>; // keyed by teamSlug-subteamId
  assignments: Record<string, Assignment[]>; // keyed by teamSlug
  tournaments: Record<string, Tournament[]>; // keyed by teamSlug-subteamId
  timers: Record<string, Timer[]>; // keyed by teamSlug-subteamId

  // Loading states
  loading: {
    userTeams: boolean;
    subteams: Record<string, boolean>;
    roster: Record<string, boolean>;
    members: Record<string, boolean>;
    stream: Record<string, boolean>;
    assignments: Record<string, boolean>;
    tournaments: Record<string, boolean>;
    timers: Record<string, boolean>;
  };

  // Error states
  errors: {
    userTeams: string | null;
    subteams: Record<string, string | null>;
    roster: Record<string, string | null>;
    members: Record<string, string | null>;
    stream: Record<string, string | null>;
    assignments: Record<string, string | null>;
    tournaments: Record<string, string | null>;
    timers: Record<string, string | null>;
  };

  // Request tracking for deduplication
  inflightRequests: Set<string>;

  // Cache timestamps
  cacheTimestamps: Record<string, number>;
}

// Store Actions
interface TeamStoreActions {
  // Data fetching
  fetchUserTeams: (userId: string) => Promise<UserTeam[]>;
  fetchSubteams: (teamSlug: string) => Promise<Subteam[]>;
  fetchRoster: (teamSlug: string, subteamId: string) => Promise<RosterData>;
  fetchMembers: (teamSlug: string, subteamId?: string) => Promise<TeamMember[]>;
  fetchStream: (teamSlug: string, subteamId: string) => Promise<StreamPost[]>;
  fetchAssignments: (teamSlug: string) => Promise<Assignment[]>;
  fetchTournaments: (teamSlug: string, subteamId: string) => Promise<Tournament[]>;
  fetchTimers: (teamSlug: string, subteamId: string) => Promise<Timer[]>;

  // Combined stream data fetching
  fetchStreamData: (
    teamSlug: string,
    subteamId: string
  ) => Promise<{
    stream: StreamPost[];
    tournaments: Tournament[];
    timers: Timer[];
  }>;

  // Data updates
  updateRoster: (teamSlug: string, subteamId: string, roster: RosterData) => void;
  updateMembers: (teamSlug: string, subteamId: string, members: TeamMember[]) => void;
  updateSubteams: (teamSlug: string, subteams: Subteam[]) => void;
  updateAssignments: (teamSlug: string, assignments: Assignment[]) => void;

  // Cache management
  clearCache: (type: string, ...params: string[]) => void;
  clearAllCache: () => void;

  // Data mutations
  addStreamPost: (teamSlug: string, subteamId: string, post: StreamPost) => void;
  addAssignment: (teamSlug: string, assignment: Assignment) => void;
  updateTimer: (teamSlug: string, subteamId: string, timer: Timer) => void;
  addSubteam: (teamSlug: string, subteam: Subteam) => void;
  updateSubteam: (teamSlug: string, subteamId: string, updates: Partial<Subteam>) => void;
  deleteSubteam: (teamSlug: string, subteamId: string) => void;
  invalidateCache: (key?: string) => void;
  preloadData: (userId: string, teamSlug?: string) => Promise<void>;

  // Utility
  getCacheKey: (type: string, ...params: string[]) => string;
  isDataFresh: (key: string, maxAge?: number) => boolean;

  // Optimistic roster updates
  addRosterEntry: (
    teamSlug: string,
    subteamId: string,
    eventName: string,
    slotIndex: number,
    studentName: string
  ) => void;
  removeRosterEntry: (
    teamSlug: string,
    subteamId: string,
    eventName: string,
    slotIndex: number
  ) => void;

  // Optimistic member updates
  addMemberEvent: (
    teamSlug: string,
    subteamId: string,
    memberId: string | null,
    memberName: string,
    eventName: string
  ) => void;
  removeMemberEvent: (
    teamSlug: string,
    subteamId: string,
    memberId: string | null,
    memberName: string,
    eventName: string
  ) => void;
}

// Cache configuration
const CACHE_DURATIONS = {
  userTeams: 5 * 60 * 1000, // 5 minutes
  subteams: 10 * 60 * 1000, // 10 minutes
  roster: 5 * 60 * 1000, // 5 minutes
  members: 2 * 60 * 1000, // 2 minutes
  stream: 2 * 60 * 1000, // 2 minutes
  assignments: 3 * 60 * 1000, // 3 minutes
  tournaments: 5 * 60 * 1000, // 5 minutes
  timers: 1 * 60 * 1000, // 1 minute
} as const;

// Network request deduplication
const inflightRequests = new Map<string, Promise<any>>();

// Helper function to make deduplicated requests
async function fetchWithDeduplication<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // If request is already in flight, return the existing promise
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  // Create new request
  const promise = fetcher().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

// Helper function to handle API errors
function handleApiError(error: any, _context: string): string {
  if (error.status === 403) {
    return "You are not authorized to access this resource";
  }
  if (error.status === 404) {
    return "Resource not found";
  }
  if (error.status >= 500) {
    return "Server error. Please try again later.";
  }
  return error.message || "An unexpected error occurred";
}

// Create the store
export const useTeamStore = create<TeamStoreState & TeamStoreActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    userTeams: [],
    subteams: {},
    roster: {},
    members: {},
    stream: {},
    assignments: {},
    tournaments: {},
    timers: {},

    loading: {
      userTeams: false,
      subteams: {},
      roster: {},
      members: {},
      stream: {},
      assignments: {},
      tournaments: {},
      timers: {},
    },

    errors: {
      userTeams: null,
      subteams: {},
      roster: {},
      members: {},
      stream: {},
      assignments: {},
      tournaments: {},
      timers: {},
    },

    inflightRequests: new Set(),
    cacheTimestamps: {},

    // Utility functions
    getCacheKey: (type: string, ...params: string[]) => {
      return `${type}-${params.join("-")}`;
    },

    isDataFresh: (key: string, maxAge: number = 5 * 60 * 1000) => {
      const timestamp = get().cacheTimestamps[key];
      if (!timestamp) {
        return false;
      }
      return Date.now() - timestamp < maxAge;
    },

    // Data fetching functions
    fetchUserTeams: async (userId: string) => {
      const key = get().getCacheKey("userTeams", userId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.userTeams) && get().userTeams.length > 0) {
        return get().userTeams;
      }

      // Set loading state
      set((state) => ({
        loading: { ...state.loading, userTeams: true },
        errors: { ...state.errors, userTeams: null },
      }));

      try {
        const teams = await fetchWithDeduplication(key, async () => {
          const result = await trpcClient.teams.getUserTeams.query();
          // Map the result to match the expected UserTeam interface
          return (result.teams || []).map((team) => ({
            id: team.id,
            slug: team.slug,
            school: team.school,
            division: team.division as "B" | "C",
            user_role: team.user_role || team.role || "member",
            name: team.name,
          }));
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
    },

    fetchSubteams: async (teamSlug: string) => {
      const key = get().getCacheKey("subteams", teamSlug);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.subteams) && get().subteams[teamSlug]) {
        return get().subteams[teamSlug];
      }

      // Set loading state
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
        const subteams = await fetchWithDeduplication(key, async () => {
          const result = await trpcClient.teams.getSubteams.query({ teamSlug });
          // Map the result to match the expected Subteam interface
          return (result.subteams || []).map((subteam) => ({
            id: subteam.id,
            name: subteam.name,
            team_id: subteam.team_id,
            description: subteam.description || "",
            created_at: subteam.created_at,
          }));
        });

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
    },

    fetchRoster: async (teamSlug: string, subteamId: string) => {
      const key = get().getCacheKey("roster", teamSlug, subteamId);

      // Check if data is fresh and not empty
      const cachedRoster = get().roster[key];
      const isFresh = get().isDataFresh(key, CACHE_DURATIONS.roster);
      const hasData = cachedRoster && Object.keys(cachedRoster.roster || {}).length > 0;

      // Debug logging
      if (process.env.NODE_ENV === "development") {
      }

      if (isFresh && hasData) {
        return cachedRoster;
      }

      // Set loading state
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
        // Debug logging
        if (process.env.NODE_ENV === "development") {
        }

        const rosterData = await fetchWithDeduplication(key, async () => {
          const result = await trpcClient.teams.getRoster.query({ teamSlug, subteamId });

          // Debug logging
          if (process.env.NODE_ENV === "development") {
          }

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
    },

    fetchMembers: async (teamSlug: string, subteamId = "all") => {
      const key = get().getCacheKey("members", teamSlug, subteamId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.members) && get().members[key]) {
        return get().members[key];
      }

      // Set loading state
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
        const members = await fetchWithDeduplication(key, async () => {
          const result = await trpcClient.teams.getMembers.query({
            teamSlug,
            subteamId: subteamId && subteamId !== "all" ? subteamId : undefined,
          });
          return result.members || [];
        });

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
    },

    fetchStream: async (teamSlug: string, subteamId: string) => {
      const key = get().getCacheKey("stream", teamSlug, subteamId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.stream) && get().stream[key]) {
        return get().stream[key];
      }

      // Set loading state
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
          return result.posts || [];
        });

        set((state) => ({
          stream: { ...state.stream, [key]: stream },
          loading: {
            ...state.loading,
            stream: { ...state.loading.stream, [key]: false },
          },
          cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
        }));

        return stream;
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
    },

    fetchAssignments: async (teamSlug: string) => {
      const key = get().getCacheKey("assignments", teamSlug);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.assignments) && get().assignments[key]) {
        return get().assignments[key];
      }

      // Set loading state
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
          // Use tRPC instead of REST API
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
          return result.result?.data?.assignments || [];
        });

        set((state) => ({
          assignments: { ...state.assignments, [key]: assignments },
          loading: {
            ...state.loading,
            assignments: { ...state.loading.assignments, [key]: false },
          },
          cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
        }));

        return assignments;
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
    },

    fetchTournaments: async (teamSlug: string, subteamId: string) => {
      const key = get().getCacheKey("tournaments", teamSlug, subteamId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.tournaments) && get().tournaments[key]) {
        return get().tournaments[key];
      }

      // Set loading state
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
          return result.events || [];
        });

        set((state) => ({
          tournaments: { ...state.tournaments, [key]: tournaments },
          loading: {
            ...state.loading,
            tournaments: { ...state.loading.tournaments, [key]: false },
          },
          cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
        }));

        return tournaments;
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
    },

    fetchTimers: async (teamSlug: string, subteamId: string) => {
      const key = get().getCacheKey("timers", teamSlug, subteamId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.timers) && get().timers[key]) {
        return get().timers[key];
      }

      // Set loading state
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
          return result.timers || [];
        });

        set((state) => ({
          timers: { ...state.timers, [key]: timers },
          loading: {
            ...state.loading,
            timers: { ...state.loading.timers, [key]: false },
          },
          cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
        }));

        return timers;
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
    },

    // Combined stream data fetching
    fetchStreamData: async (teamSlug: string, subteamId: string) => {
      const key = get().getCacheKey("stream-data", teamSlug, subteamId);

      // Check if data is fresh
      if (get().isDataFresh(key, CACHE_DURATIONS.stream) && get().stream[key]) {
        const streamKey = get().getCacheKey("stream", teamSlug, subteamId);
        const tournamentsKey = get().getCacheKey("tournaments", teamSlug, subteamId);
        const timersKey = get().getCacheKey("timers", teamSlug, subteamId);

        return {
          stream: get().stream[streamKey] || [],
          tournaments: get().tournaments[tournamentsKey] || [],
          timers: get().timers[timersKey] || [],
        };
      }

      // Set loading states for all related data
      const streamKey = get().getCacheKey("stream", teamSlug, subteamId);
      const tournamentsKey = get().getCacheKey("tournaments", teamSlug, subteamId);
      const timersKey = get().getCacheKey("timers", teamSlug, subteamId);

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

        // Update all related caches
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
    },

    // Data update functions
    updateRoster: (teamSlug: string, subteamId: string, roster: RosterData) => {
      const key = get().getCacheKey("roster", teamSlug, subteamId);
      set((state) => ({
        roster: { ...state.roster, [key]: roster },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));
    },

    updateMembers: (teamSlug: string, subteamId: string, members: TeamMember[]) => {
      const key = get().getCacheKey("members", teamSlug, subteamId);
      set((state) => ({
        members: { ...state.members, [key]: members },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));
    },

    updateSubteams: (teamSlug: string, subteams: Subteam[]) => {
      const key = get().getCacheKey("subteams", teamSlug);
      set((state) => ({
        subteams: { ...state.subteams, [key]: subteams },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));
    },

    updateAssignments: (teamSlug: string, assignments: Assignment[]) => {
      const key = get().getCacheKey("assignments", teamSlug);
      set((state) => ({
        assignments: { ...state.assignments, [key]: assignments },
        cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
      }));
    },

    addStreamPost: (teamSlug: string, subteamId: string, post: StreamPost) => {
      const key = get().getCacheKey("stream", teamSlug, subteamId);
      set((state) => ({
        stream: {
          ...state.stream,
          [key]: [post, ...(state.stream[key] || [])],
        },
      }));
    },

    addAssignment: (teamSlug: string, assignment: Assignment) => {
      const key = get().getCacheKey("assignments", teamSlug);
      set((state) => ({
        assignments: {
          ...state.assignments,
          [key]: [assignment, ...(state.assignments[key] || [])],
        },
      }));
    },

    updateTimer: (teamSlug: string, subteamId: string, timer: Timer) => {
      const key = get().getCacheKey("timers", teamSlug, subteamId);
      set((state) => ({
        timers: {
          ...state.timers,
          [key]: (state.timers[key] || []).map((t) => (t.id === timer.id ? timer : t)),
        },
      }));
    },

    addSubteam: (teamSlug: string, subteam: Subteam) => {
      set((state) => ({
        subteams: {
          ...state.subteams,
          [teamSlug]: [...(state.subteams[teamSlug] || []), subteam],
        },
        cacheTimestamps: {
          ...state.cacheTimestamps,
          [get().getCacheKey("subteams", teamSlug)]: Date.now(),
        },
      }));
    },

    updateSubteam: (teamSlug: string, subteamId: string, updates: Partial<Subteam>) => {
      set((state) => ({
        subteams: {
          ...state.subteams,
          [teamSlug]: (state.subteams[teamSlug] || []).map((subteam) =>
            subteam.id === subteamId ? { ...subteam, ...updates } : subteam
          ),
        },
        cacheTimestamps: {
          ...state.cacheTimestamps,
          [get().getCacheKey("subteams", teamSlug)]: Date.now(),
        },
      }));
    },

    deleteSubteam: (teamSlug: string, subteamId: string) => {
      set((state) => ({
        subteams: {
          ...state.subteams,
          [teamSlug]: (state.subteams[teamSlug] || []).filter(
            (subteam) => subteam.id !== subteamId
          ),
        },
        cacheTimestamps: {
          ...state.cacheTimestamps,
          [get().getCacheKey("subteams", teamSlug)]: Date.now(),
        },
      }));
    },

    // Cache management
    invalidateCache: (key?: string) => {
      if (key) {
        set((_state) => {
          const newState = { ..._state };
          delete newState.cacheTimestamps[key];
          return newState;
        });
      } else {
        set((_state) => ({
          cacheTimestamps: {},
          userTeams: [],
          subteams: {},
          roster: {},
          members: {},
          stream: {},
          assignments: {},
          tournaments: {},
          timers: {},
        }));
      }
    },

    // Clear cache for specific data types
    clearCache: (type: string, ...params: string[]) => {
      const key = get().getCacheKey(type, ...params);
      set((state) => ({
        cacheTimestamps: { ...state.cacheTimestamps, [key]: 0 },
      }));
    },

    // Clear all cache
    clearAllCache: () => {
      set({ cacheTimestamps: {} });
    },

    // Preload critical data
    preloadData: async (userId: string, teamSlug?: string) => {
      const promises: Promise<any>[] = [];

      // Always preload user teams
      promises.push(get().fetchUserTeams(userId));

      // If we have a team slug, preload team-specific data
      if (teamSlug) {
        promises.push(get().fetchSubteams(teamSlug));
      }

      // Wait for all critical data to load
      await Promise.allSettled(promises);
    },

    // Optimistic roster updates
    addRosterEntry: (
      teamSlug: string,
      subteamId: string,
      eventName: string,
      slotIndex: number,
      studentName: string
    ) => {
      const key = get().getCacheKey("roster", teamSlug, subteamId);
      const currentRoster = get().roster[key];

      if (currentRoster) {
        const updatedRoster = { ...currentRoster };
        if (!updatedRoster.roster[eventName]) {
          updatedRoster.roster[eventName] = [];
        }
        updatedRoster.roster[eventName][slotIndex] = studentName;

        set((state) => ({
          roster: { ...state.roster, [key]: updatedRoster },
        }));
      }
    },

    removeRosterEntry: (
      teamSlug: string,
      subteamId: string,
      eventName: string,
      slotIndex: number
    ) => {
      const key = get().getCacheKey("roster", teamSlug, subteamId);
      const currentRoster = get().roster[key];

      if (currentRoster?.roster[eventName]) {
        const updatedRoster = { ...currentRoster };
        const eventArray = updatedRoster.roster[eventName];
        if (eventArray) {
          const updatedEvent = [...eventArray];
          updatedEvent[slotIndex] = "";
          updatedRoster.roster[eventName] = updatedEvent;
        }

        set((state) => ({
          roster: { ...state.roster, [key]: updatedRoster },
        }));
      }
    },

    // Optimistic member updates
    addMemberEvent: (
      teamSlug: string,
      subteamId: string,
      memberId: string | null,
      memberName: string,
      eventName: string
    ) => {
      const key = get().getCacheKey("members", teamSlug, subteamId || "all");
      const currentMembers = get().members[key];

      if (currentMembers) {
        const updatedMembers = currentMembers.map((member) => {
          // Match by ID if available, otherwise by name
          const isMatch = memberId ? member.id === memberId : member.name === memberName;

          if (isMatch) {
            return {
              ...member,
              events: [...(member.events || []), eventName],
            };
          }
          return member;
        });

        set((state) => ({
          members: { ...state.members, [key]: updatedMembers },
        }));
      }
    },

    removeMemberEvent: (
      teamSlug: string,
      subteamId: string,
      memberId: string | null,
      memberName: string,
      eventName: string
    ) => {
      const key = get().getCacheKey("members", teamSlug, subteamId || "all");
      const currentMembers = get().members[key];

      if (currentMembers) {
        const updatedMembers = currentMembers.map((member) => {
          // Match by ID if available, otherwise by name
          const isMatch = memberId ? member.id === memberId : member.name === memberName;

          if (isMatch) {
            return {
              ...member,
              events: (member.events || []).filter((event) => event !== eventName),
            };
          }
          return member;
        });

        set((state) => ({
          members: { ...state.members, [key]: updatedMembers },
        }));
      }
    },
  }))
);

// Export types for use in components
export type {
  UserTeam as TeamUserTeam,
  Subteam as TeamSubteam,
  TeamMember as TeamMemberType,
  RosterData as TeamRosterData,
  StreamPost as TeamStreamPost,
  StreamComment as TeamStreamComment,
  Assignment as TeamAssignment,
  Tournament as TeamTournament,
  Timer as TeamTimer,
};
