/**
 * ULTIMATE OPTIMIZED Team Data Loader Component
 *
 * This component uses the MULTIPLEXED tRPC endpoint to fetch ALL team page data in ONE request:
 * - User teams (for sidebar)
 * - Subteams (for subteam selector)
 * - Team dashboard data (assignments, members)
 * - Roster data (for first subteam)
 *
 * Performance improvements over previous version:
 * - Reduced from 3 separate HTTP requests to 1
 * - Single auth check instead of 3
 * - Parallel database queries on the backend
 * - Auth check happens only once
 * - Reduced network overhead by ~66%
 * - Faster initial page load
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTeamStore } from '@/app/hooks/useTeamStore';
import { useTeamPageData } from '@/app/hooks/useTeamPageData';
import type { TeamMember, Subteam, Assignment } from '@/lib/stores/teamStore';
import type { RosterData } from '@/lib/schemas/teams.schema';

interface TeamDataLoaderProps {
  teamSlug: string;
  children: React.ReactNode;
}

export default function TeamDataLoader({ teamSlug, children }: TeamDataLoaderProps) {
  const hasLoadedRef = useRef(false);

  // Use the MULTIPLEXED endpoint that fetches EVERYTHING in one request
  const {
    userTeams,
    subteams,
    assignments,
    members,
    roster,
    rosterSubteamId,
    isLoading,
    error
  } = useTeamPageData(teamSlug);

  const {
    updateSubteams,
    updateAssignments,
    updateMembers,
    updateRoster
  } = useTeamStore();

  // Update store with fetched data from MULTIPLEXED endpoint
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [TeamDataLoader] MULTIPLEXED effect triggered:', {
        teamSlug,
        hasLoaded: hasLoadedRef.current,
        isLoading,
        error,
        userTeamsLength: userTeams?.length,
        subteamsLength: subteams?.length,
        assignmentsLength: assignments?.length,
        membersLength: members?.length,
        rosterEventsCount: Object.keys(roster || {}).length
      });
    }

    if (hasLoadedRef.current || isLoading || error) return;
    hasLoadedRef.current = true;

    try {
      // Note: User teams are now included in the multiplexed response
      // The teamStore will be updated via the sidebar component that uses the same data
      // This eliminates a separate getUserTeams request

      // Update subteams
      if (subteams.length > 0) {
        const teamSubteams: Subteam[] = subteams.map(subteam => ({
          id: subteam.id,
          name: subteam.name,
          team_id: subteam.team_id,
          description: subteam.description,
          created_at: subteam.created_at
        }));
        updateSubteams(teamSlug, teamSubteams);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [TeamDataLoader] Updated subteams:', teamSubteams.length);
        }
      }

      // Update assignments
      if (assignments.length > 0) {
        const teamAssignments: Assignment[] = assignments.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.dueDate?.toISOString() || new Date().toISOString(),
          assigned_to: [],
          created_by: assignment.createdBy,
          created_at: assignment.createdAt?.toISOString() || new Date().toISOString()
        }));
        updateAssignments(teamSlug, teamAssignments);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [TeamDataLoader] Updated assignments:', teamAssignments.length);
        }
      }

      // Update members
      if (members.length > 0) {
        const teamMembers: TeamMember[] = members.map(member => ({
          id: member.userId || `unlinked-${Math.random()}`,
          name: member.displayFirstName,
          email: member.email || '',
          events: [],
          isPendingInvitation: false,
          role: member.role as any,
          subteamId: member.subteamId,
          isLinked: member.isLinked
        }));
        updateMembers(teamSlug, 'all', teamMembers);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [TeamDataLoader] Updated members:', teamMembers.length);
        }
      }

      // Update roster for the first subteam
      if (Object.keys(roster).length > 0 && rosterSubteamId) {
        const rosterData: RosterData = {
          roster,
          removed_events: []
        };
        updateRoster(teamSlug, rosterSubteamId, rosterData);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [TeamDataLoader] Updated roster for subteam:', rosterSubteamId);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 [TeamDataLoader] MULTIPLEXED data loaded successfully for team: ${teamSlug}`);
        console.log('📊 Performance: Reduced 3+ requests to 1 unified request');
      }
    } catch (error) {
      console.error('[TeamDataLoader] Failed to update store:', error);
    }
  }, [
    teamSlug,
    subteams,
    assignments,
    members,
    roster,
    rosterSubteamId,
    isLoading,
    error,
    userTeams?.length,
    updateSubteams,
    updateAssignments,
    updateMembers,
    updateRoster
  ]);

  return <>{children}</>;
}