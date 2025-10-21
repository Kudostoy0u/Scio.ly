/**
 * Team Data Loader Component
 *
 * This component is responsible for loading ALL team data once when mounted.
 * It populates the centralized cache (teamStore) with all necessary data.
 *
 * Place this component at the top level of your team pages.
 * All child components will read from the cache without making API calls.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTeamStore } from '@/app/hooks/useTeamStore';

interface TeamDataLoaderProps {
  teamSlug: string;
  children: React.ReactNode;
}

export default function TeamDataLoader({ teamSlug, children }: TeamDataLoaderProps) {
  const hasLoadedRef = useRef(false);
  const {
    getSubteams,
    loadSubteams,
    loadRoster,
    loadMembers,
    loadStreamData,
    loadAssignments,
  } = useTeamStore();

  // Load all team data once on mount
  useEffect(() => {
    if (hasLoadedRef.current || !teamSlug) return;
    hasLoadedRef.current = true;

    const loadAllTeamData = async () => {
      try {
        // Step 1: Load subteams first
        await loadSubteams(teamSlug);
        const subteams = getSubteams(teamSlug);

        // Step 2: Load all members for the team
        await loadMembers(teamSlug, 'all');

        // Step 3: Load assignments (team-wide)
        await loadAssignments(teamSlug);

        // Step 4: Load data for each subteam in parallel
        if (subteams.length > 0) {
          await Promise.all(
            subteams.map(async (subteam) => {
              // Load roster, members, and stream data for each subteam
              await Promise.all([
                loadRoster(teamSlug, subteam.id),
                loadMembers(teamSlug, subteam.id),
                loadStreamData(teamSlug, subteam.id),
              ]);
            })
          );
        }

        console.log(`✅ [Team Data Loader] All data loaded for team: ${teamSlug}`);
      } catch (error) {
        console.error('[Team Data Loader] Failed to load team data:', error);
      }
    };

    loadAllTeamData();
  }, [teamSlug, loadSubteams, getSubteams, loadMembers, loadAssignments, loadRoster, loadStreamData]);

  return <>{children}</>;
}
