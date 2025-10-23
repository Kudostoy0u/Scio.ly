/**
 * OPTIMIZED Team Data Loader Component
 *
 * This component uses a single tRPC endpoint to fetch ALL team data at once,
 * eliminating multiple API calls and improving performance significantly.
 *
 * Performance improvements:
 * - Single API call instead of 5-10 separate calls
 * - Parallel database queries on the backend
 * - Auth check happens only once
 * - Reduced network overhead
 */

'use client';

import { useEffect, useRef } from 'react';
import { useTeamStore } from '@/app/hooks/useTeamStore';
import { useTeamDashboard } from '@/app/hooks/useTeamDashboard';
import type { TeamMember, Subteam, Assignment } from '@/lib/stores/teamStore';
import type { RosterData } from '@/lib/schemas/teams.schema';

interface TeamDataLoaderProps {
  teamSlug: string;
  children: React.ReactNode;
}

export default function TeamDataLoader({ teamSlug, children }: TeamDataLoaderProps) {
  const hasLoadedRef = useRef(false);
  
  // Use the optimized dashboard hook that fetches everything in one request
  const { 
    subteams, 
    assignments, 
    members, 
    roster, 
    isLoading, 
    error 
  } = useTeamDashboard(teamSlug);

  const { updateSubteams, updateAssignments, updateMembers, updateRoster } = useTeamStore();

  // Update store with fetched data
  useEffect(() => {
    if (hasLoadedRef.current || isLoading || error) return;
    hasLoadedRef.current = true;

    try {
      // Update store with all the data from single request
      if (subteams.length > 0) {
        // Convert dashboard subteams to Subteam format
        const teamSubteams: Subteam[] = subteams.map(subteam => ({
          id: subteam.id,
          name: subteam.name,
          team_id: subteam.team_id,
          description: subteam.name, // Use name as description
          created_at: subteam.created_at?.toISOString() || new Date().toISOString()
        }));
        updateSubteams(teamSlug, teamSubteams);
      }
      
      if (assignments.length > 0) {
        // Convert dashboard assignments to Assignment format
        const teamAssignments: Assignment[] = assignments.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.dueDate?.toISOString() || new Date().toISOString(),
          assigned_to: [], // Dashboard doesn't provide this
          created_by: assignment.createdBy,
          created_at: assignment.createdAt?.toISOString() || new Date().toISOString()
        }));
        updateAssignments(teamSlug, teamAssignments);
      }
      
      if (members.length > 0) {
        // Convert dashboard members to TeamMember format
        const teamMembers: TeamMember[] = members.map(member => ({
          id: member.userId || `unlinked-${Math.random()}`,
          name: member.displayFirstName,
          email: '',
          events: [],
          isPendingInvitation: false,
          ...member
        }));
        updateMembers(teamSlug, 'all', teamMembers);
      }
      
      if (Object.keys(roster).length > 0) {
        // Update roster for the first subteam (or all if no specific subteam)
        const firstSubteam = subteams[0];
        if (firstSubteam) {
          const rosterData: RosterData = {
            roster,
            removed_events: []
          };
          updateRoster(teamSlug, firstSubteam.id, rosterData);
        }
      }

      console.log(`✅ [Team Data Loader] All data loaded for team: ${teamSlug} (single optimized request)`);
    } catch (error) {
      console.error('[Team Data Loader] Failed to update store:', error);
    }
  }, [teamSlug, subteams, assignments, members, roster, isLoading, error, updateSubteams, updateAssignments, updateMembers, updateRoster]);

  return <>{children}</>;
}