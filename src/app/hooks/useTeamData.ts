import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

interface UserTeam {
  id: string;
  slug: string;
  school: string;
  division: string;
  user_role: string;
  team_name: string;
  is_archived: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  joinedAt: string;
  subteam: {
    id: string;
    name: string;
    teamId: string;
  };
  events: string[];
  eventCount: number;
  avatar?: string;
  isOnline: boolean;
  isPendingInvitation?: boolean;
  hasPendingInvite?: boolean;
  hasPendingLinkInvite?: boolean;
  invitationCode?: string;
}

interface TeamData {
  userTeams: UserTeam[];
  subteams: any[];
  roster: Record<string, string[]>;
  members: TeamMember[];
}

// Global cache to prevent duplicate requests across components
const globalCache = new Map<string, { data: any; timestamp: number; promise?: Promise<any> }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export function useTeamData() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<TeamData>({
    userTeams: [],
    subteams: [],
    roster: {},
    members: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handle403Error = useCallback((errorMessage: string = 'You are not a member of this team') => {
    toast.error(errorMessage);
    router.push('/dashboard');
  }, [router]);

  const fetchWithCache = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheDuration = CACHE_DURATION
  ): Promise<T> => {
    const now = Date.now();
    const cached = globalCache.get(key);
    
    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < cacheDuration) {
      return cached.data;
    }
    
    // Return existing promise if already fetching
    if (cached?.promise) {
      return cached.promise;
    }
    
    // Create new fetch promise
    const promise = fetcher().then(result => {
      globalCache.set(key, { data: result, timestamp: now });
      return result;
    }).catch(err => {
      globalCache.delete(key);
      throw err;
    });
    
    // Store the promise to prevent duplicate requests
    globalCache.set(key, { data: cached?.data, timestamp: cached?.timestamp || 0, promise });
    
    return promise;
  }, []);

  const fetchUserTeams = useCallback(async (): Promise<UserTeam[]> => {
    if (!user?.id) return [];
    
    return fetchWithCache(
      `user-teams-${user.id}`,
      async () => {
        const response = await fetch('/api/teams/user-teams');
        if (!response.ok) throw new Error('Failed to fetch user teams');
        const result = await response.json();
        return result.teams || [];
      }
    );
  }, [user?.id, fetchWithCache]);

  const fetchSubteams = useCallback(async (teamSlug: string): Promise<any[]> => {
    if (!teamSlug) return [];
    
    return fetchWithCache(
      `subteams-${teamSlug}`,
      async () => {
        const response = await fetch(`/api/teams/${teamSlug}/subteams`);
        if (response.status === 403) {
          const errorData = await response.json();
          handle403Error(errorData.error || 'You are not a member of this team');
          return [];
        }
        if (!response.ok) throw new Error('Failed to fetch subteams');
        const result = await response.json();
        return result.subteams || [];
      }
    );
  }, [fetchWithCache, handle403Error]);

  const fetchRoster = useCallback(async (teamSlug: string, subteamId: string): Promise<Record<string, string[]>> => {
    if (!teamSlug || !subteamId) return {};
    
    return fetchWithCache(
      `roster-${teamSlug}-${subteamId}`,
      async () => {
        const response = await fetch(`/api/teams/${teamSlug}/roster?subteamId=${subteamId}`);
        if (response.status === 403) {
          const errorData = await response.json();
          handle403Error(errorData.error || 'You are not a member of this team');
          return {};
        }
        if (!response.ok) throw new Error('Failed to fetch roster');
        const result = await response.json();
        return result.roster || {};
      },
      5 * 60 * 1000 // 5 minutes for roster data
    );
  }, [fetchWithCache, handle403Error]);

  const fetchMembers = useCallback(async (teamSlug: string, subteamId?: string): Promise<TeamMember[]> => {
    if (!teamSlug) return [];
    
    const subteamParam = subteamId && subteamId !== 'all' ? `?subteamId=${subteamId}` : '';
    const cacheKey = `members-${teamSlug}-${subteamId || 'all'}`;
    
    return fetchWithCache(
      cacheKey,
      async () => {
        const response = await fetch(`/api/teams/${teamSlug}/members${subteamParam}`);
        if (response.status === 403) {
          const errorData = await response.json();
          handle403Error(errorData.error || 'You are not a member of this team');
          return [];
        }
        if (!response.ok) throw new Error('Failed to fetch members');
        const result = await response.json();
        return result.members || [];
      },
      2 * 60 * 1000 // 2 minutes for members data
    );
  }, [fetchWithCache, handle403Error]);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [userTeams] = await Promise.all([
        fetchUserTeams()
      ]);

      setData(prev => ({
        ...prev,
        userTeams
      }));
    } catch (err) {
      console.error('Error loading team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserTeams]);

  const loadSubteams = useCallback(async (teamSlug: string) => {
    try {
      const subteams = await fetchSubteams(teamSlug);
      setData(prev => ({
        ...prev,
        subteams
      }));
    } catch (err) {
      console.error('Error loading subteams:', err);
    }
  }, [fetchSubteams]);

  const loadRoster = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      const roster = await fetchRoster(teamSlug, subteamId);
      setData(prev => ({
        ...prev,
        roster
      }));
    } catch (err) {
      console.error('Error loading roster:', err);
    }
  }, [fetchRoster]);

  const loadMembers = useCallback(async (teamSlug: string, subteamId?: string) => {
    try {
      const members = await fetchMembers(teamSlug, subteamId);
      setData(prev => ({
        ...prev,
        members
      }));
    } catch (err) {
      console.error('Error loading members:', err);
    }
  }, [fetchMembers]);

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      globalCache.delete(key);
    } else {
      globalCache.clear();
    }
  }, []);

  // Check for refresh parameter and clear cache
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam) {
      console.log('Refresh parameter detected, clearing team data cache');
      globalCache.clear();
      // Remove the refresh parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('refresh');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    loading,
    error,
    loadSubteams,
    loadRoster,
    loadMembers,
    invalidateCache,
    refetch: loadData
  };
}
