/**
 * Centralized Team Cache Hook
 * 
 * This hook provides a clean interface to the centralized cache manager
 * and eliminates the scattered cache logic throughout the app.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTeamStore } from '../../lib/stores/teamStore';
import { 
  teamCacheManager, 
  fetchWithCache, 
  invalidateCache, 
  updateCache, 
  forceRefresh 
} from '../../lib/cache/teamCacheManager';

export interface UseTeamCacheOptions {
  teamSlug: string;
  subteamId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTeamCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
  update: (newData: T) => void;
}

/**
 * Hook for managing team members cache
 */
export function useTeamMembers(options: UseTeamCacheOptions) {
  const { teamSlug, subteamId = 'all', autoRefresh = false, refreshInterval = 30000 } = options;
  
  const store = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = teamCacheManager.getCacheKey('members', teamSlug, subteamId);
  const data = store.members[cacheKey] || null;

  const fetchMembers = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await fetchWithCache(
        'members',
        async () => {
          const subteamParam = subteamId && subteamId !== 'all' ? `?subteamId=${subteamId}` : '';
          const response = await fetch(`/api/teams/${teamSlug}/members${subteamParam}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          return result.members || [];
        },
        teamSlug,
        subteamId
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, subteamId, isLoading]);

  const refresh = useCallback(async () => {
    await forceRefresh(
      'members',
      async () => {
        const subteamParam = subteamId && subteamId !== 'all' ? `?subteamId=${subteamId}` : '';
        const response = await fetch(`/api/teams/${teamSlug}/members${subteamParam}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        return result.members || [];
      },
      teamSlug,
      subteamId
    );
  }, [teamSlug, subteamId]);

  const invalidate = useCallback(() => {
    invalidateCache('members', teamSlug, subteamId);
  }, [teamSlug, subteamId]);

  const update = useCallback((newData: any) => {
    updateCache('members', newData, teamSlug, subteamId);
  }, [teamSlug, subteamId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial fetch
  useEffect(() => {
    if (!data && !isLoading) {
      fetchMembers();
    }
  }, [data, isLoading, fetchMembers]);

  return {
    data,
    isLoading,
    error,
    refresh,
    invalidate,
    update
  };
}

/**
 * Hook for managing team roster cache
 */
export function useTeamRoster(options: UseTeamCacheOptions) {
  const { teamSlug, subteamId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const store = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = teamCacheManager.getCacheKey('roster', teamSlug, subteamId || '');
  const data = store.roster[cacheKey] || null;

  const fetchRoster = useCallback(async () => {
    if (isLoading || !subteamId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await fetchWithCache(
        'roster',
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/roster?subteamId=${subteamId}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          return {
            roster: result.roster || {},
            removedEvents: result.removedEvents || []
          };
        },
        teamSlug,
        subteamId
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roster');
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, subteamId, isLoading]);

  const refresh = useCallback(async () => {
    if (!subteamId) return;
    
    await forceRefresh(
      'roster',
      async () => {
        const response = await fetch(`/api/teams/${teamSlug}/roster?subteamId=${subteamId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        return {
          roster: result.roster || {},
          removedEvents: result.removedEvents || []
        };
      },
      teamSlug,
      subteamId
    );
  }, [teamSlug, subteamId]);

  const invalidate = useCallback(() => {
    if (subteamId) {
      invalidateCache('roster', teamSlug, subteamId);
    }
  }, [teamSlug, subteamId]);

  const update = useCallback((newData: any) => {
    if (subteamId) {
      updateCache('roster', newData, teamSlug, subteamId);
    }
  }, [teamSlug, subteamId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !subteamId) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh, subteamId]);

  // Initial fetch
  useEffect(() => {
    if (!data && !isLoading && subteamId) {
      fetchRoster();
    }
  }, [data, isLoading, fetchRoster, subteamId]);

  return {
    data,
    isLoading,
    error,
    refresh,
    invalidate,
    update
  };
}

/**
 * Hook for managing team subteams cache
 */
export function useTeamSubteams(options: Pick<UseTeamCacheOptions, 'teamSlug'>) {
  const { teamSlug } = options;
  
  const store = useTeamStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = store.subteams[teamSlug] || null;

  const fetchSubteams = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await fetchWithCache(
        'subteams',
        async () => {
          const response = await fetch(`/api/teams/${teamSlug}/subteams`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          return result.subteams || [];
        },
        teamSlug
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subteams');
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, isLoading]);

  const refresh = useCallback(async () => {
    await forceRefresh(
      'subteams',
      async () => {
        const response = await fetch(`/api/teams/${teamSlug}/subteams`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        return result.subteams || [];
      },
      teamSlug
    );
  }, [teamSlug]);

  const invalidate = useCallback(() => {
    invalidateCache('subteams', teamSlug);
  }, [teamSlug]);

  const update = useCallback((newData: any) => {
    updateCache('subteams', newData, teamSlug);
  }, [teamSlug]);

  // Initial fetch
  useEffect(() => {
    if (!data && !isLoading) {
      fetchSubteams();
    }
  }, [data, isLoading, fetchSubteams]);

  return {
    data,
    isLoading,
    error,
    refresh,
    invalidate,
    update
  };
}

/**
 * Generic hook for any team data type
 */
export function useTeamData<T>(
  type: string,
  fetcher: () => Promise<T>,
  options: UseTeamCacheOptions
): UseTeamCacheResult<T> {
  const { teamSlug, subteamId = 'all' } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWithCache(type, fetcher, teamSlug, subteamId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [type, fetcher, teamSlug, subteamId, isLoading]);

  const refresh = useCallback(async () => {
    const result = await forceRefresh(type, fetcher, teamSlug, subteamId);
    setData(result);
  }, [type, fetcher, teamSlug, subteamId]);

  const invalidate = useCallback(() => {
    invalidateCache(type, teamSlug, subteamId);
  }, [type, teamSlug, subteamId]);

  const update = useCallback((newData: T) => {
    updateCache(type, newData, teamSlug, subteamId);
    setData(newData);
  }, [type, teamSlug, subteamId]);

  // Initial fetch
  useEffect(() => {
    if (!data && !isLoading) {
      fetchData();
    }
  }, [data, isLoading, fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
    invalidate,
    update
  };
}
