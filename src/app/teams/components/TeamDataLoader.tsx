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

"use client";

import { useTeamPageData } from "@/app/hooks/useTeamPageData";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import type { RosterData } from "@/lib/schemas/teams.schema";
import type { Assignment, Subteam, TeamMember } from "@/lib/stores/teamStore";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface TeamDataLoaderProps {
  teamSlug: string;
  children: ReactNode;
}

export default function TeamDataLoader({ teamSlug, children }: TeamDataLoaderProps) {
  const hasLoadedRef = useRef(false);

  // Use the MULTIPLEXED endpoint that fetches EVERYTHING in one request
  const { subteams, assignments, members, roster, rosterSubteamId, isLoading, error } =
    useTeamPageData(teamSlug);

  const { updateSubteams, updateAssignments, updateMembers, updateRoster } = useTeamStore();

  // Store update functions in refs to avoid dependency changes
  const updateFunctionsRef = useRef({
    updateSubteams,
    updateAssignments,
    updateMembers,
    updateRoster,
  });

  // Update ref in effect to avoid updating during render
  useEffect(() => {
    updateFunctionsRef.current = { updateSubteams, updateAssignments, updateMembers, updateRoster };
  }, [updateSubteams, updateAssignments, updateMembers, updateRoster]);

  // Update store with fetched data from MULTIPLEXED endpoint
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Development-only code can go here
    }

    // Don't run if already loaded, still loading, or there's an error
    if (hasLoadedRef.current || isLoading || error) {
      return;
    }

    // Mark as loaded
    hasLoadedRef.current = true;

    try {
      // Note: User teams are now included in the multiplexed response
      // The teamStore will be updated via the sidebar component that uses the same data
      // This eliminates a separate getUserTeams request

      // Update subteams
      if (subteams.length > 0) {
        const teamSubteams: Subteam[] = subteams.map(
          (subteam: {
            id: string;
            name: string;
            team_id: string;
            description: string;
            created_at: string;
          }) => ({
            id: subteam.id,
            name: subteam.name,
            team_id: subteam.team_id,
            description: subteam.description,
            created_at: subteam.created_at,
          })
        );
        updateFunctionsRef.current.updateSubteams(teamSlug, teamSubteams);
        if (process.env.NODE_ENV === "development") {
          // Development-only code can go here
        }
      }

      // Update assignments
      if (assignments.length > 0) {
        const teamAssignments: Assignment[] = assignments.map((assignment) => {
          const assignmentRecord = assignment as {
            id: string;
            title: string;
            description: string | null;
            dueDate: Date | null;
            createdBy: string;
            createdAt: Date | null;
          };
          return {
            id: assignmentRecord.id,
            title: assignmentRecord.title,
            description: assignmentRecord.description || "",
            due_date: assignmentRecord.dueDate?.toISOString() || new Date().toISOString(),
            assigned_to: [],
            created_by: assignmentRecord.createdBy,
            created_at: assignmentRecord.createdAt?.toISOString() || new Date().toISOString(),
          };
        });
        updateFunctionsRef.current.updateAssignments(teamSlug, teamAssignments);
        if (process.env.NODE_ENV === "development") {
          // Development-only code can go here
        }
      }

      // Update members
      if (members.length > 0) {
        const teamMembers: TeamMember[] = members.map((member) => {
          const memberRecord = member as {
            userId?: string;
            displayFirstName: string;
            email?: string;
            role: string;
            subteamId?: string;
            isLinked?: boolean;
          };
          return {
            id: memberRecord.userId || `unlinked-${Math.random()}`,
            name: memberRecord.displayFirstName,
            email: memberRecord.email || "",
            events: [],
            isPendingInvitation: false,
            role: memberRecord.role,
            subteamId: memberRecord.subteamId,
            isLinked: memberRecord.isLinked ?? false,
          };
        });
        updateFunctionsRef.current.updateMembers(teamSlug, "all", teamMembers);
        if (process.env.NODE_ENV === "development") {
          // Development-only code can go here
        }
      }

      // Update roster for the first subteam
      if (Object.keys(roster).length > 0 && rosterSubteamId) {
        const rosterData: RosterData = {
          roster,
          removed_events: [],
        };
        updateFunctionsRef.current.updateRoster(teamSlug, rosterSubteamId, rosterData);
        if (process.env.NODE_ENV === "development") {
          // Development-only code can go here
        }
      }

      if (process.env.NODE_ENV === "development") {
        // Development-only code can go here
      }
    } catch (_error) {
      // Ignore errors
    }
  }, [teamSlug, isLoading, error, subteams, assignments, members, roster, rosterSubteamId]);

  return <>{children}</>;
}
