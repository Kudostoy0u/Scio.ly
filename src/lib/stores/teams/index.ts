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

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createCacheActions } from "./actions/cache-actions";
import { createFetchActions } from "./actions/fetch-actions";
import { createOptimisticActions } from "./actions/optimistic-actions";
import { createUpdateActions } from "./actions/update-actions";
import type { TeamStoreActions, TeamStoreState } from "./types";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const useTeamStore = create<StoreSlice>()(
  subscribeWithSelector((set, get) => {
    const fetchActions = createFetchActions(get, set);
    const updateActions = createUpdateActions(get, set);
    const optimisticActions = createOptimisticActions(get, set);
    const cacheActions = createCacheActions(get, set);

    return {
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

      // Combine all actions - ensure all required actions are present
      ...fetchActions,
      ...updateActions,
      ...optimisticActions,
      ...cacheActions,
    } as StoreSlice;
  })
);

// Re-export types for convenience
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
} from "./types";

export type { TeamStoreState, TeamStoreActions } from "./types";
