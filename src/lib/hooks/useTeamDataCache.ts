/**
 * Centralized Team Data Cache
 *
 * This hook provides a single source of truth for all team data.
 * It loads all data once per page load and serves from cache thereafter.
 *
 * Usage:
 * - Call once at the app/page level to initialize cache
 * - All components read from the cache via useTeamStore
 * - API calls happen only once per reload
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTeamStore } from '@/lib/stores/teamStore';

interface UseTeamDataCacheOptions {
  teamSlug?: string;
  subteamId?: string;
  loadAll?: boolean; // Load all data for the team
}

/**
 * Hook to manage centralized team data cache
 * Call this once at the top level of your team pages
 */
export function useTeamDataCache(options: UseTeamDataCacheOptions = {}) {
  const { teamSlug, subteamId, loadAll = false } = options;
  const hasLoadedRef = useRef(false);
  const store = useTeamStore();

  // Load data once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!teamSlug && !loadAll) return;

    hasLoadedRef.current = true;

    const loadTeamData = async () => {
      try {
        if (teamSlug) {
          // Load subteams
          await store.fetchSubteams(teamSlug);

          // If subteamId is provided, load data for that subteam
          if (subteamId) {
            await Promise.all([
              store.fetchRoster(teamSlug, subteamId),
              store.fetchMembers(teamSlug, subteamId),
              store.fetchStreamData(teamSlug, subteamId),
            ]);
          } else {
            // Load all members for the team
            await store.fetchMembers(teamSlug, 'all');
          }

          // Load team-wide data
          await store.fetchAssignments(teamSlug);
        }
      } catch (error) {
        console.error('[Team Data Cache] Failed to load team data:', error);
      }
    };

    loadTeamData();
  }, [teamSlug, subteamId, loadAll, store]);

  return {
    invalidate: (key?: string) => store.invalidateCache(key),
    clearAll: () => store.clearAllCache(),
  };
}

/**
 * Hook to preload data for a specific subteam
 * Use this when switching subteams to ensure data is ready
 */
export function useSubteamDataPreload(teamSlug: string, subteamId: string) {
  const store = useTeamStore();
  const hasLoadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!teamSlug || !subteamId) return;

    const cacheKey = `${teamSlug}-${subteamId}`;
    if (hasLoadedRef.current.has(cacheKey)) return;

    hasLoadedRef.current.add(cacheKey);

    const loadSubteamData = async () => {
      try {
        // Check if data is already fresh in cache
        const rosterKey = store.getCacheKey('roster', teamSlug, subteamId);
        const isRosterFresh = store.isDataFresh(rosterKey, 5 * 60 * 1000);

        if (!isRosterFresh) {
          // Load data in parallel
          await Promise.all([
            store.fetchRoster(teamSlug, subteamId),
            store.fetchMembers(teamSlug, subteamId),
            store.fetchStreamData(teamSlug, subteamId),
          ]);
        }
      } catch (error) {
        console.error('[Subteam Data Preload] Failed to load subteam data:', error);
      }
    };

    loadSubteamData();
  }, [teamSlug, subteamId, store]);
}
