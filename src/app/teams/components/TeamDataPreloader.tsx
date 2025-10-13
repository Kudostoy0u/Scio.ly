'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTeamStore } from '@/app/hooks/useTeamStore';

interface TeamDataPreloaderProps {
  teamSlug?: string;
}

/**
 * Preloads critical team data to avoid multiple API requests on page load
 * This component should be mounted early in the component tree
 */
export default function TeamDataPreloader({ teamSlug }: TeamDataPreloaderProps) {
  const { user } = useAuth();
  const { preloadTeamData } = useTeamStore();

  useEffect(() => {
    if (user?.id && teamSlug) {
      // Preload critical data immediately
      preloadTeamData(teamSlug).catch(error => {
        console.error('Error preloading team data:', error);
      });
    }
  }, [user?.id, teamSlug, preloadTeamData]);

  // This component doesn't render anything
  return null;
}