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

import { useAuth } from "@/app/contexts/authContext";
import { useTeamPageData } from "@/app/hooks/useTeamPageData";
import { useTeamStore } from "@/app/hooks/useTeamStore";
import type { RosterData } from "@/lib/schemas/teams.schema";
import type { Assignment, Subteam, TeamMember } from "@/lib/stores/teamStore";
import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface TeamDataLoaderProps {
  teamSlug: string;
  children: ReactNode;
}

export default function TeamDataLoader({ teamSlug, children }: TeamDataLoaderProps) {
  const hasLoadedRef = useRef(false);
  const { user } = useAuth();

  // Use the MULTIPLEXED endpoint that fetches EVERYTHING in one request
  const { userTeams, subteams, assignments, members, roster, rosterSubteamId, isLoading, error } =
    useTeamPageData(teamSlug);

  const { updateSubteams, updateAssignments, updateMembers, updateRoster, getCacheKey } =
    useTeamStore();

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

  // Helper functions to reduce complexity - wrapped in useCallback to satisfy dependencies
  const updateUserTeamsInStore = useCallback(
    (teams: typeof userTeams, userId: string) => {
      const { useTeamStore: store } = require("@/lib/stores/teamStore");
      const userTeamsFormatted = teams.map(
        (team: {
          id?: unknown;
          slug?: unknown;
          school?: unknown;
          division?: unknown;
          user_role?: unknown;
          role?: unknown;
          name?: unknown;
        }) => ({
          id: String(team.id ?? ""),
          slug: String(team.slug ?? ""),
          school: String(team.school ?? ""),
          division: (team.division ?? "B") as "B" | "C",
          user_role: String(team.user_role ?? team.role ?? "member"),
          name: String(team.name ?? ""),
        })
      );
      const cacheKey = getCacheKey("userTeams", userId);
      store.setState({
        userTeams: userTeamsFormatted,
        cacheTimestamps: { ...store.getState().cacheTimestamps, [cacheKey]: Date.now() },
      });
    },
    [getCacheKey]
  );

  const updateSubteamsInStore = useCallback(
    (teamSubteams: typeof subteams) => {
      const formatted: Subteam[] = teamSubteams.map(
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
      updateFunctionsRef.current.updateSubteams(teamSlug, formatted);
    },
    [teamSlug]
  );

  const updateAssignmentsInStore = useCallback(
    (teamAssignments: typeof assignments) => {
      const formatted: Assignment[] = teamAssignments.map((assignment) => {
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
      updateFunctionsRef.current.updateAssignments(teamSlug, formatted);
    },
    [teamSlug]
  );

  const updateMembersInStore = useCallback(
    (teamMembers: typeof members) => {
      const formatted: TeamMember[] = teamMembers.map((member) => {
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
      updateFunctionsRef.current.updateMembers(teamSlug, "all", formatted);
    },
    [teamSlug]
  );

  const updateRosterInStore = useCallback(
    (teamRoster: typeof roster, subteamId: string | null) => {
      if (!subteamId) {
        return;
      }
      const rosterData: RosterData = {
        roster: teamRoster,
        removed_events: [],
      };
      updateFunctionsRef.current.updateRoster(teamSlug, subteamId, rosterData);
    },
    [teamSlug]
  );

  // Update store with fetched data from MULTIPLEXED endpoint
  useEffect(() => {
    // Don't run if already loaded, still loading, or there's an error
    if (hasLoadedRef.current || isLoading || error) {
      return;
    }

    // Mark as loaded
    hasLoadedRef.current = true;

    try {
      if (userTeams.length > 0 && user?.id) {
        updateUserTeamsInStore(userTeams, user.id);
      }

      if (subteams.length > 0) {
        updateSubteamsInStore(subteams);
      }

      if (assignments.length > 0) {
        updateAssignmentsInStore(assignments);
      }

      if (members.length > 0) {
        updateMembersInStore(members);
      }

      if (Object.keys(roster).length > 0 && rosterSubteamId) {
        updateRosterInStore(roster, rosterSubteamId);
      }
    } catch (_error) {
      // Ignore errors
    }
  }, [
    isLoading,
    error,
    userTeams,
    subteams,
    assignments,
    members,
    roster,
    rosterSubteamId,
    user?.id,
    updateUserTeamsInStore,
    updateSubteamsInStore,
    updateAssignmentsInStore,
    updateMembersInStore,
    updateRosterInStore,
  ]);

  return <>{children}</>;
}
