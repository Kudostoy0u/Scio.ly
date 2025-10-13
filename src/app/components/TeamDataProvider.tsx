'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useEnhancedTeamData } from '@/app/hooks/useEnhancedTeamData';

interface TeamDataContextValue {
  userTeams: any[];
  subteams: any[];
  roster: Record<string, string[]>;
  loading: boolean;
  error: string | null;
  loadSubteams: (teamSlug: string) => Promise<void>;
  loadRoster: (teamSlug: string, subteamId: string) => Promise<void>;
  invalidateCache: (key?: string) => void;
  refetch: () => Promise<void>;
}

const TeamDataContext = createContext<TeamDataContextValue | undefined>(undefined);

export function useTeamDataContext(): TeamDataContextValue {
  const context = useContext(TeamDataContext);
  if (!context) {
    throw new Error('useTeamDataContext must be used within a TeamDataProvider');
  }
  return context;
}

interface TeamDataProviderProps {
  children: ReactNode;
}

export function TeamDataProvider({ children }: TeamDataProviderProps) {
  const teamData = useEnhancedTeamData();

  return (
    <TeamDataContext.Provider value={teamData}>
      {children}
    </TeamDataContext.Provider>
  );
}
