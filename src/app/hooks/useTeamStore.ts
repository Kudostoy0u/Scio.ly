/**
 * React Hook for Team Store
 * 
 * This hook provides a clean interface to the team store with:
 * - Automatic data loading
 * - Loading states
 * - Error handling
 * - Optimistic updates
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTeamStore as useTeamStoreBase } from '@/lib/stores/teamStore';
import { toast } from 'react-toastify';

export function useTeamStore() {
  const { user } = useAuth();
  
  // Get store state and actions
  const {
    userTeams,
    subteams,
    roster,
    members,
    stream,
    assignments,
    tournaments,
    timers,
    loading,
    errors,
    fetchUserTeams,
    fetchSubteams,
    fetchRoster,
    fetchMembers,
    fetchStream,
    fetchAssignments,
    fetchTournaments,
    fetchTimers,
    fetchStreamData,
    updateRoster,
    updateMembers,
    addStreamPost,
    addAssignment,
    updateTimer,
    addSubteam,
    updateSubteam,
    deleteSubteam,
    invalidateCache,
    preloadData,
    getCacheKey,
  } = useTeamStoreBase();

  // Auto-load user teams when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserTeams(user.id).catch(error => {
        console.error('Failed to load user teams:', error);
      });
    }
  }, [user?.id, fetchUserTeams]);

  // Helper functions for components
  const loadSubteams = useCallback(async (teamSlug: string) => {
    try {
      await fetchSubteams(teamSlug);
    } catch (error) {
      console.error('Failed to load subteams:', error);
      toast.error('Failed to load subteams');
    }
  }, [fetchSubteams]);

  const loadRoster = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      await fetchRoster(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load roster:', error);
      toast.error('Failed to load roster');
    }
  }, [fetchRoster]);

  const loadMembers = useCallback(async (teamSlug: string, subteamId?: string) => {
    try {
      await fetchMembers(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load members');
    }
  }, [fetchMembers]);

  const loadStream = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      await fetchStream(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load stream:', error);
      toast.error('Failed to load stream');
    }
  }, [fetchStream]);

  const loadAssignments = useCallback(async (teamSlug: string) => {
    try {
      await fetchAssignments(teamSlug);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    }
  }, [fetchAssignments]);

  const loadTournaments = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      await fetchTournaments(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      toast.error('Failed to load tournaments');
    }
  }, [fetchTournaments]);

  const loadTimers = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      await fetchTimers(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load timers:', error);
      toast.error('Failed to load timers');
    }
  }, [fetchTimers]);

  const loadStreamData = useCallback(async (teamSlug: string, subteamId: string) => {
    try {
      await fetchStreamData(teamSlug, subteamId);
    } catch (error) {
      console.error('Failed to load stream data:', error);
      toast.error('Failed to load stream data');
    }
  }, [fetchStreamData]);

  // Preload data for a team
  const preloadTeamData = useCallback(async (teamSlug: string) => {
    if (!user?.id) return;
    
    try {
      await preloadData(user.id, teamSlug);
    } catch (error) {
      console.error('Failed to preload team data:', error);
    }
  }, [user?.id, preloadData]);

  // Get data for specific keys
  const getSubteams = useCallback((teamSlug: string) => {
    return subteams[teamSlug] || [];
  }, [subteams]);

  const getRoster = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('roster', teamSlug, subteamId);
    return roster[key] || { roster: {}, removedEvents: [] };
  }, [roster, getCacheKey]);

  const getMembers = useCallback((teamSlug: string, subteamId: string = 'all') => {
    const key = getCacheKey('members', teamSlug, subteamId);
    return members[key] || [];
  }, [members, getCacheKey]);

  const getStream = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('stream', teamSlug, subteamId);
    return stream[key] || [];
  }, [stream, getCacheKey]);

  const getAssignments = useCallback((teamSlug: string) => {
    const key = getCacheKey('assignments', teamSlug);
    return assignments[key] || [];
  }, [assignments, getCacheKey]);

  const getTournaments = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('tournaments', teamSlug, subteamId);
    return tournaments[key] || [];
  }, [tournaments, getCacheKey]);

  const getTimers = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('timers', teamSlug, subteamId);
    return timers[key] || [];
  }, [timers, getCacheKey]);

  // Get loading states (unused but kept for future use)
  // const _getLoadingState = useCallback((type: string, ...params: string[]) => {
  //   const _key = getCacheKey(type, ...params);
  //   return loading[type as keyof typeof loading] || false;
  // }, [loading, getCacheKey]);

  const isSubteamsLoading = useCallback((teamSlug: string) => {
    return loading.subteams[teamSlug] || false;
  }, [loading.subteams]);

  const isRosterLoading = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('roster', teamSlug, subteamId);
    return loading.roster[key] || false;
  }, [loading.roster, getCacheKey]);

  const isMembersLoading = useCallback((teamSlug: string, subteamId: string = 'all') => {
    const key = getCacheKey('members', teamSlug, subteamId);
    return loading.members[key] || false;
  }, [loading.members, getCacheKey]);

  const isStreamLoading = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('stream', teamSlug, subteamId);
    return loading.stream[key] || false;
  }, [loading.stream, getCacheKey]);

  const isAssignmentsLoading = useCallback((teamSlug: string) => {
    const key = getCacheKey('assignments', teamSlug);
    return loading.assignments[key] || false;
  }, [loading.assignments, getCacheKey]);

  const isTournamentsLoading = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('tournaments', teamSlug, subteamId);
    return loading.tournaments[key] || false;
  }, [loading.tournaments, getCacheKey]);

  const isTimersLoading = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('timers', teamSlug, subteamId);
    return loading.timers[key] || false;
  }, [loading.timers, getCacheKey]);

  // Get error states (unused but kept for future use)
  // const _getError = useCallback((type: string, ...params: string[]) => {
  //   const _key = getCacheKey(type, ...params);
  //   return errors[type as keyof typeof errors] || null;
  // }, [errors, getCacheKey]);

  const getSubteamsError = useCallback((teamSlug: string) => {
    return errors.subteams[teamSlug] || null;
  }, [errors.subteams]);

  const getRosterError = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('roster', teamSlug, subteamId);
    return errors.roster[key] || null;
  }, [errors.roster, getCacheKey]);

  const getMembersError = useCallback((teamSlug: string, subteamId: string = 'all') => {
    const key = getCacheKey('members', teamSlug, subteamId);
    return errors.members[key] || null;
  }, [errors.members, getCacheKey]);

  const getStreamError = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('stream', teamSlug, subteamId);
    return errors.stream[key] || null;
  }, [errors.stream, getCacheKey]);

  const getAssignmentsError = useCallback((teamSlug: string) => {
    const key = getCacheKey('assignments', teamSlug);
    return errors.assignments[key] || null;
  }, [errors.assignments, getCacheKey]);

  const getTournamentsError = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('tournaments', teamSlug, subteamId);
    return errors.tournaments[key] || null;
  }, [errors.tournaments, getCacheKey]);

  const getTimersError = useCallback((teamSlug: string, subteamId: string) => {
    const key = getCacheKey('timers', teamSlug, subteamId);
    return errors.timers[key] || null;
  }, [errors.timers, getCacheKey]);

  return {
    // Data
    userTeams,
    getSubteams,
    getRoster,
    getMembers,
    getStream,
    getAssignments,
    getTournaments,
    getTimers,
    
    // Loading functions
    loadSubteams,
    loadRoster,
    loadMembers,
    loadStream,
    loadAssignments,
    loadTournaments,
    loadTimers,
    loadStreamData,
    preloadTeamData,
    
    // Loading states
    isUserTeamsLoading: loading.userTeams,
    isSubteamsLoading,
    isRosterLoading,
    isMembersLoading,
    isStreamLoading,
    isAssignmentsLoading,
    isTournamentsLoading,
    isTimersLoading,
    
    // Error states
    userTeamsError: errors.userTeams,
    getSubteamsError,
    getRosterError,
    getMembersError,
    getStreamError,
    getAssignmentsError,
    getTournamentsError,
    getTimersError,
    
    // Update functions
    updateRoster,
    updateMembers,
    addStreamPost,
    addAssignment,
    updateTimer,
    addSubteam,
    updateSubteam,
    deleteSubteam,
    
    // Cache management
    invalidateCache,
  };
}
