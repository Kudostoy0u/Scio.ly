import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { GetTeamDataRequest, TeamDataResponse } from '@/lib/schemas/team';

/**
 * Streamlined Team Data Hook
 * 
 * This hook provides:
 * - Single API call for all team data
 * - Intelligent caching with background refresh
 * - Request deduplication
 * - Optimistic updates
 * - Error handling and retry logic
 * - Server-side hydration support
 */

interface UseStreamlinedTeamDataOptions {
  teamSlug?: string;
  includeSubteams?: boolean;
  includeMembers?: boolean;
  includeRoster?: boolean;
  includeStream?: boolean;
  includeAssignments?: boolean;
  subteamId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseStreamlinedTeamDataReturn {
  data: TeamDataResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  updateData: (updater: (data: TeamDataResponse) => TeamDataResponse) => void;
}

// Global cache for request deduplication
const globalCache = new Map<string, { 
  data: TeamDataResponse | null; 
  timestamp: number; 
  promise?: Promise<TeamDataResponse>;
  subscribers: Set<() => void>;
}>();

// Background refresh intervals
const backgroundRefreshIntervals = new Map<string, NodeJS.Timeout>();

export function useStreamlinedTeamData(options: UseStreamlinedTeamDataOptions = {}): UseStreamlinedTeamDataReturn {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TeamDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Build cache key
  const cacheKey = `team-data-${options.teamSlug}-${user?.id}-${JSON.stringify({
    includeSubteams: options.includeSubteams ?? true,
    includeMembers: options.includeMembers ?? true,
    includeRoster: options.includeRoster ?? false,
    includeStream: options.includeStream ?? false,
    includeAssignments: options.includeAssignments ?? false,
    subteamId: options.subteamId
  })}`;

  // Fetch team data
  const fetchTeamData = useCallback(async (): Promise<TeamDataResponse> => {
    if (!user?.id || !options.teamSlug) {
      throw new Error('User not authenticated or team slug not provided');
    }

    const request: GetTeamDataRequest = {
      teamSlug: options.teamSlug,
      includeSubteams: options.includeSubteams ?? true,
      includeMembers: options.includeMembers ?? true,
      includeRoster: options.includeRoster ?? false,
      includeStream: options.includeStream ?? false,
      includeAssignments: options.includeAssignments ?? false,
      subteamId: options.subteamId
    };

    const response = await fetch('/api/teams/data?' + new URLSearchParams({
      teamSlug: request.teamSlug,
      includeSubteams: request.includeSubteams.toString(),
      includeMembers: request.includeMembers.toString(),
      includeRoster: request.includeRoster.toString(),
      includeStream: request.includeStream.toString(),
      includeAssignments: request.includeAssignments.toString(),
      ...(request.subteamId && { subteamId: request.subteamId })
    }));

    if (!response.ok) {
      if (response.status === 403) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Not authorized to access this team');
      }
      if (response.status === 404) {
        throw new Error('Team not found');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }, [user?.id, options.teamSlug, options.includeSubteams, options.includeMembers, options.includeRoster, options.includeStream, options.includeAssignments, options.subteamId]);

  // Fetch with caching and deduplication
  const fetchWithCache = useCallback(async (): Promise<TeamDataResponse> => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Check cache
    const cached = globalCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data!;
    }

    // Return existing promise if already fetching
    if (cached?.promise) {
      return cached.promise;
    }

    // Create new fetch promise
    const promise = fetchTeamData().then(result => {
      globalCache.set(cacheKey, { 
        data: result, 
        timestamp: now,
        subscribers: cached?.subscribers || new Set()
      });
      return result;
    }).catch(err => {
      globalCache.delete(cacheKey);
      throw err;
    });

    // Store promise to prevent duplicate requests
    globalCache.set(cacheKey, { 
      data: cached?.data || null, 
      timestamp: cached?.timestamp || 0, 
      promise,
      subscribers: cached?.subscribers || new Set()
    });

    return promise;
  }, [cacheKey, fetchTeamData]);

  // Refetch data
  const refetch = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchWithCache();
      
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team data';
        setError(errorMessage);
        
        if (errorMessage.includes('Not authorized')) {
          toast.error('You are not authorized to access this team');
          router.push('/teams');
        } else if (errorMessage.includes('Team not found')) {
          toast.error('Team not found');
          router.push('/teams');
        } else {
          toast.error('Failed to load team data');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchWithCache, router]);

  // Update data optimistically
  const updateData = useCallback((updater: (data: TeamDataResponse) => TeamDataResponse) => {
    if (data) {
      const updatedData = updater(data);
      setData(updatedData);
      
      // Update cache
      const cached = globalCache.get(cacheKey);
      if (cached) {
        cached.data = updatedData;
        cached.timestamp = Date.now();
      }
    }
  }, [data, cacheKey]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    globalCache.delete(cacheKey);
    setData(null);
  }, [cacheKey]);

  // Start background refresh
  const startBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshIntervals.has(cacheKey)) {
      return; // Already refreshing
    }

    const interval = setInterval(async () => {
      try {
        const result = await fetchWithCache();
        if (isMountedRef.current) {
          setData(result);
        }
      } catch (err) {
        console.error('Background refresh failed:', err);
      }
    }, options.refreshInterval || 2 * 60 * 1000); // 2 minutes default

    backgroundRefreshIntervals.set(cacheKey, interval);
  }, [cacheKey, fetchWithCache, options.refreshInterval]);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    const interval = backgroundRefreshIntervals.get(cacheKey);
    if (interval) {
      clearInterval(interval);
      backgroundRefreshIntervals.delete(cacheKey);
    }
  }, [cacheKey]);

  // Initial data load
  useEffect(() => {
    if (options.teamSlug && user?.id) {
      refetch();
    }
  }, [options.teamSlug, user?.id, refetch]);

  // Start/stop background refresh
  useEffect(() => {
    if (options.autoRefresh && options.teamSlug && user?.id) {
      startBackgroundRefresh();
    } else {
      stopBackgroundRefresh();
    }

    return () => {
      stopBackgroundRefresh();
    };
  }, [options.autoRefresh, options.teamSlug, user?.id, startBackgroundRefresh, stopBackgroundRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopBackgroundRefresh();
    };
  }, [stopBackgroundRefresh]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    updateData
  };
}

// Hook for user teams
export function useUserTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTeams = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teams/user-teams');
      if (!response.ok) {
        throw new Error('Failed to fetch user teams');
      }

      const result = await response.json();
      setTeams(result.teams || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user teams';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserTeams();
  }, [fetchUserTeams]);

  return {
    teams,
    loading,
    error,
    refetch: fetchUserTeams
  };
}

// Hook for batch team data requests
export function useBatchTeamData(requests: GetTeamDataRequest[]) {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchData = useCallback(async () => {
    if (!user?.id || requests.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/teams/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch batch team data');
      }

      const result = await response.json();
      setResults(result.results || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch team data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, requests]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  return {
    results,
    loading,
    error,
    refetch: fetchBatchData
  };
}
