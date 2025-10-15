'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

interface TeamDataPreloaderProps {
  teamSlug?: string;
}

/**
 * Preloads critical team data using tRPC batching to avoid multiple API requests on page load
 * This component should be mounted early in the component tree
 */
export default function TeamDataPreloader({ teamSlug }: TeamDataPreloaderProps) {
  const utils = trpc.useUtils();
  
  // Prefetch subteams for the team
  trpc.teams.getSubteams.useQuery(
    { teamSlug: teamSlug! },
    {
      enabled: !!teamSlug,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  useEffect(() => {
    if (teamSlug) {
      // Prefetch all critical data in parallel - tRPC will batch these automatically
      Promise.all([
        utils.teams.getSubteams.prefetch({ teamSlug }),
        utils.teams.getMembers.prefetch({ teamSlug, subteamId: 'all' }),
      ]).catch(error => {
        console.error('Error preloading team data:', error);
      });
    }
  }, [teamSlug, utils]);

  // This component doesn't render anything
  return null;
}