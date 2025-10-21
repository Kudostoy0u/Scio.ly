'use client';

import React, { createContext, useContext } from 'react';
import { useTeamStore } from '@/app/hooks/useTeamStore';
import type {
  TeamUserTeam,
  TeamSubteam,
  TeamMemberType,
  TeamStreamPost,
  TeamAssignment,
  TeamTournament,
  TeamTimer
} from '@/lib/stores/teamStore';

interface TeamDataContextType {
  // All team data from centralized cache
  team: {
    id: string;
    name: string;
    slug: string;
    school: string;
    division: 'B' | 'C';
  } | null;
  userTeams: TeamUserTeam[];
  subteams: TeamSubteam[];
  members: TeamMemberType[];
  roster: Record<string, string[]>;
  stream: TeamStreamPost[];
  assignments: TeamAssignment[];
  tournaments: TeamTournament[];
  timers: TeamTimer[];

  // Methods
  invalidateCache: (pattern?: string) => void;
}

const TeamDataContext = createContext<TeamDataContextType | null>(null);

interface TeamDataProviderProps {
  children: React.ReactNode;
  teamSlug: string;
  activeSubteamId?: string;
}

export function TeamDataProvider({ children, teamSlug, activeSubteamId }: TeamDataProviderProps) {
  // Use centralized team store - data is loaded by TeamDataLoader
  const {
    userTeams,
    getSubteams,
    getMembers,
    getRoster,
    getStream,
    getAssignments,
    getTournaments,
    getTimers,
    invalidateCache
  } = useTeamStore();

  const contextValue: TeamDataContextType = {
    team: null, // Team info should come from userTeams
    userTeams,
    subteams: getSubteams(teamSlug),
    members: activeSubteamId ? getMembers(teamSlug, activeSubteamId) : [],
    roster: activeSubteamId ? getRoster(teamSlug, activeSubteamId).roster : {},
    stream: activeSubteamId ? getStream(teamSlug, activeSubteamId) : [],
    assignments: getAssignments(teamSlug),
    tournaments: activeSubteamId ? getTournaments(teamSlug, activeSubteamId) : [],
    timers: activeSubteamId ? getTimers(teamSlug, activeSubteamId) : [],
    invalidateCache
  };

  return (
    <TeamDataContext.Provider value={contextValue}>
      {children}
    </TeamDataContext.Provider>
  );
}

export function useTeamData() {
  const context = useContext(TeamDataContext);
  if (!context) {
    throw new Error('useTeamData must be used within a TeamDataProvider');
  }
  return context;
}
