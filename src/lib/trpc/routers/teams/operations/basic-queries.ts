import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamRosterData, newTeamUnits } from "@/lib/db/schema/teams";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  UUID_REGEX,
  buildSubteamWhereCondition,
  checkTeamAccessOrThrow,
  getActiveSubteams,
  getActiveTeamUnitIds,
  getAssignmentsForSubteams,
  getMembersWithSubteamMemberships,
  resolveTeamSlugToGroupId,
} from "../helpers";

const RosterDataSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())),
  removedEvents: z.array(z.string()),
});

// Helper function to build member events map from roster data
function buildMemberEventsMap(
  rosterData: Array<{
    eventName: string | null;
    studentName: string | null;
    userId: string | null;
    teamUnitId: string;
  }>
): Map<string, Map<string, string[]>> {
  const memberEventsMap = new Map<string, Map<string, string[]>>();
  for (const rd of rosterData) {
    if (rd.userId && rd.eventName) {
      if (!memberEventsMap.has(rd.userId)) {
        memberEventsMap.set(rd.userId, new Map());
      }
      const subteamEvents = memberEventsMap.get(rd.userId);
      if (!subteamEvents) {
        continue;
      }
      if (!subteamEvents.has(rd.teamUnitId)) {
        subteamEvents.set(rd.teamUnitId, []);
      }
      const events = subteamEvents.get(rd.teamUnitId);
      if (!events) {
        continue;
      }
      if (!events.includes(rd.eventName)) {
        events.push(rd.eventName);
      }
    }
  }
  return memberEventsMap;
}

// Helper function to flatten member events
function flattenMemberEvents(
  memberEventsMap: Map<string, Map<string, string[]>>
): Map<string, string[]> {
  const memberEventsFlat = new Map<string, string[]>();
  for (const [userId, subteamEvents] of memberEventsMap) {
    const allEvents: string[] = [];
    for (const events of subteamEvents.values()) {
      for (const e of events) {
        if (!allEvents.includes(e)) {
          allEvents.push(e);
        }
      }
    }
    memberEventsFlat.set(userId, allEvents);
  }
  return memberEventsFlat;
}

// Helper function to get display name from membership
function getDisplayNameFromMembership(membership: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  userId: string;
}): string {
  return (
    membership.displayName ||
    (membership.firstName && membership.lastName
      ? `${membership.firstName} ${membership.lastName}`
      : membership.firstName ||
        membership.lastName ||
        membership.username ||
        `User ${membership.userId.substring(0, 8)}`)
  );
}

// Helper function to build members from memberships
function buildMembersFromMemberships(
  memberships: Array<{
    userId: string;
    role: string;
    joinedAt: Date | null;
    subteamId: string | null;
    subteamName: string | null;
    email: string | null;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  }>,
  memberEventsFlat: Map<string, string[]>
): Array<{
  userId: string | null;
  role: string;
  joinedAt: Date | null;
  subteamId: string | null;
  subteamName: string | null;
  email: string | null;
  displayFirstName: string | null;
  displayLastName: string;
  hasRosterEntry: boolean;
  hasPendingInvite: boolean;
  events: string[];
  isLinked: boolean;
}> {
  const processedUserIds = new Set<string>();
  const members: Array<{
    userId: string | null;
    role: string;
    joinedAt: Date | null;
    subteamId: string | null;
    subteamName: string | null;
    email: string | null;
    displayFirstName: string | null;
    displayLastName: string;
    hasRosterEntry: boolean;
    hasPendingInvite: boolean;
    events: string[];
    isLinked: boolean;
  }> = [];

  for (const membership of memberships) {
    if (processedUserIds.has(membership.userId)) {
      continue;
    }
    processedUserIds.add(membership.userId);

    const displayName = getDisplayNameFromMembership(membership);
    const userEvents = memberEventsFlat.get(membership.userId) || [];
    const hasRosterEntry = userEvents.length > 0;

    // CRITICAL: If user has no roster entries, show "set team?" (null subteam)
    // This ensures captains without roster entries show "set team?" not their membership subteam
    const subteamId = hasRosterEntry ? membership.subteamId || null : null;
    const subteamName = hasRosterEntry ? membership.subteamName || null : null;

    members.push({
      userId: membership.userId,
      role: membership.role,
      joinedAt: membership.joinedAt || null,
      subteamId,
      subteamName,
      email: membership.email || null,
      displayFirstName: displayName,
      displayLastName: "",
      hasRosterEntry,
      hasPendingInvite: false,
      events: userEvents,
      isLinked: true,
    });
  }

  return members;
}

// Helper function to build unlinked people map
// Key includes subteamId to handle same name across different subteams
function buildUnlinkedPeopleMap(
  rosterData: Array<{
    eventName: string | null;
    studentName: string | null;
    userId: string | null;
    teamUnitId: string;
  }>
): Map<
  string,
  {
    name: string;
    events: string[];
    subteamId: string;
  }
> {
  const unlinkedPeopleMap = new Map<
    string,
    {
      name: string;
      events: string[];
      subteamId: string;
    }
  >();

  for (const rd of rosterData) {
    if (!rd.userId && rd.studentName) {
      // Include subteamId in key to handle same name across different subteams
      const nameKey = `${rd.studentName.toLowerCase().trim()}:${rd.teamUnitId}`;

      if (!unlinkedPeopleMap.has(nameKey)) {
        unlinkedPeopleMap.set(nameKey, {
          name: rd.studentName,
          events: [],
          subteamId: rd.teamUnitId,
        });
      }

      const person = unlinkedPeopleMap.get(nameKey);
      if (person && rd.eventName && !person.events.includes(rd.eventName)) {
        person.events.push(rd.eventName);
      }
    }
  }

  return unlinkedPeopleMap;
}

export const basicQueriesRouter: ReturnType<typeof router> = router({
  // Get user teams
  getUserTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      const teams = await cockroachDBTeamsService.getUserTeams(ctx.user.id);
      return { teams };
    } catch (error) {
      logger.error(
        "Failed to fetch user teams",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: ctx.user.id,
        }
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to fetch user teams: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),

  // Get subteams for a team
  getSubteams: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        const subteamsResult = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
            description: newTeamUnits.description,
            createdAt: newTeamUnits.createdAt,
            order: newTeamUnits.displayOrder,
          })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")))
          .orderBy(newTeamUnits.displayOrder, newTeamUnits.createdAt);

        const subteams = subteamsResult.map((subteam) => ({
          id: subteam.id,
          name: subteam.description || `Team ${subteam.teamId}`,
          team_id: groupId,
          description: subteam.description || "",
          created_at: subteam.createdAt?.toISOString() || new Date().toISOString(),
        }));

        return { subteams };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch subteams",
        });
      }
    }),

  // Get roster for a subteam
  getRoster: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!UUID_REGEX.test(input.subteamId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid subteam ID format" });
        }

        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug))
          .limit(1);

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        const rosterResult = await dbPg
          .select({
            eventName: newTeamRosterData.eventName,
            slotIndex: newTeamRosterData.slotIndex,
            studentName: newTeamRosterData.studentName,
            userId: newTeamRosterData.userId,
          })
          .from(newTeamRosterData)
          .where(eq(newTeamRosterData.teamUnitId, input.subteamId))
          .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);

        const roster: Record<string, string[]> = {};
        for (const row of rosterResult) {
          const displayEventName = row.eventName.replace(/and/g, "&");
          if (!roster[displayEventName]) {
            roster[displayEventName] = [];
          }
          roster[displayEventName][row.slotIndex] = row.studentName || "";
        }

        const removedEvents: string[] = [];

        const result = { roster, removedEvents };

        const validatedResult = RosterDataSchema.parse(result);

        return validatedResult;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch roster data",
        });
      }
    }),

  // Get assignments
  getAssignments: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const groupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (groupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = groupResult[0]?.id;
        if (!groupId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        const subteams = await getActiveSubteams(groupId);
        const subteamIds = subteams.map((s) => s.id);

        if (subteamIds.length === 0) {
          return { assignments: [] };
        }

        const assignments = await getAssignmentsForSubteams(subteamIds);

        return { assignments };
      } catch (error) {
        logger.error("Failed to get assignments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get assignments",
        });
      }
    }),

  // Get people/members for a subteam (or all subteams if subteamId is not provided)
  //
  // KEY CONCEPTS:
  // 1. Team Membership (new_team_memberships): Official team members with roles (captain, member)
  //    - A user can be a member without being on any roster (e.g., captain who doesn't compete)
  //    - Membership determines role and subteam assignment
  // 2. Roster Entries (new_team_roster_data): Event assignments
  //    - Can be linked (userId set) or unlinked (just a name)
  //    - Shows which events a person is assigned to
  // 3. Unlinked People: Names on roster that aren't linked to a user account
  //    - These should appear separately with option to invite/link
  //
  // NEVER remove membership when removing from roster - they are separate concepts!
  getPeople: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        logger.dev.structured("info", "getPeople: Starting request", {
          teamSlug: input.teamSlug,
          subteamId: input.subteamId,
          userId: ctx.user.id,
        });

        const groupId = await resolveTeamSlugToGroupId(input.teamSlug);
        await checkTeamAccessOrThrow(ctx.user.id, groupId);

        const teamUnitIds = await getActiveTeamUnitIds(groupId);

        // If no subteams exist, return empty result early
        if (teamUnitIds.length === 0) {
          logger.dev.structured("info", "getPeople: No subteams found");
          return { members: [] };
        }

        // Build subteam name lookup
        const subteamNamesResult = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
            description: newTeamUnits.description,
          })
          .from(newTeamUnits)
          .where(inArray(newTeamUnits.id, teamUnitIds));

        const subteamNameMap = new Map(
          subteamNamesResult.map((s) => [s.id, s.description || `Team ${s.teamId}`])
        );

        // 1. Get team memberships for this group (official team members)
        // If subteamId is provided, filter to that subteam; otherwise get all
        const memberships = await getMembersWithSubteamMemberships(
          buildSubteamWhereCondition(groupId, input.subteamId ?? undefined)
        );

        logger.dev.structured("info", "getPeople: Got memberships", {
          count: memberships.length,
        });

        // 2. Get roster entries for event assignments
        // If subteamId is provided, filter to that subteam; otherwise get all subteams
        const rosterDataWhere = input.subteamId
          ? and(
              inArray(newTeamRosterData.teamUnitId, teamUnitIds),
              eq(newTeamRosterData.teamUnitId, input.subteamId)
            )
          : inArray(newTeamRosterData.teamUnitId, teamUnitIds);

        const rosterData = await dbPg
          .select({
            eventName: newTeamRosterData.eventName,
            studentName: newTeamRosterData.studentName,
            userId: newTeamRosterData.userId,
            teamUnitId: newTeamRosterData.teamUnitId,
          })
          .from(newTeamRosterData)
          .where(rosterDataWhere);

        logger.dev.structured("info", "getPeople: Got roster data", {
          count: rosterData.length,
        });

        // Build events lookup: userId -> { subteamId -> events[] }
        const memberEventsMap = buildMemberEventsMap(rosterData);

        // Get all unique events per user (flattened)
        const memberEventsFlat = flattenMemberEvents(memberEventsMap);

        // 3. Build member list from memberships (linked users)
        const members = buildMembersFromMemberships(memberships, memberEventsFlat);
        const processedUserIds = new Set(members.map((m) => m.userId).filter(Boolean) as string[]);

        // 4. Add UNLINKED roster entries (people on roster without user accounts)
        const unlinkedPeopleMap = buildUnlinkedPeopleMap(rosterData);

        // Add unlinked people to members list
        for (const person of unlinkedPeopleMap.values()) {
          members.push({
            userId: null,
            role: "member",
            joinedAt: null,
            subteamId: person.subteamId,
            subteamName: subteamNameMap.get(person.subteamId) || "Unknown",
            email: null,
            displayFirstName: person.name,
            displayLastName: "",
            hasRosterEntry: person.events.length > 0,
            hasPendingInvite: false,
            events: person.events,
            isLinked: false,
          });
        }

        logger.dev.structured("info", "getPeople: Returning members", {
          linkedCount: processedUserIds.size,
          unlinkedCount: unlinkedPeopleMap.size,
          totalCount: members.length,
        });

        return { members };
      } catch (error) {
        logger.error("getPeople: Failed to fetch team members", error, {
          teamSlug: input.teamSlug,
          subteamId: input.subteamId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch team members: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get members (alias for getPeople)
  getMembers: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }): Promise<{ members: unknown[] }> => {
      try {
        logger.dev.structured("info", "getMembers: Starting request", {
          teamSlug: input.teamSlug,
          subteamId: input.subteamId,
          userId: ctx.user.id,
        });

      const caller = basicQueriesRouter.createCaller({ user: ctx.user, headers: undefined });

        // Normalize the input - pass undefined instead of null
        const normalizedInput = {
          teamSlug: input.teamSlug,
          subteamId: input.subteamId || undefined,
        };

      const peopleResult = (await (
        caller.getPeople as (input: unknown) => Promise<{ members: unknown[] }>
        )?.(normalizedInput)) || { members: [] };

        logger.dev.structured("info", "getMembers: Got people result", {
          membersCount: peopleResult.members?.length || 0,
        });

      const validatedMembers: unknown[] = ((peopleResult.members as unknown[]) || []).map(
        (member: unknown) => {
          const m = member as {
            userId?: string | null;
            displayFirstName?: string | null;
            email?: string | null;
            role?: string;
            events?: unknown[];
            hasPendingInvite?: boolean;
            subteamId?: string | null;
            isLinked?: boolean;
            subteamName?: string | null;
            joinedAt?: string | null;
          };
          return {
            id: m.userId || null,
            name: m.displayFirstName || null,
            email: m.email || null,
            role: m.role || "member",
            events: m.events || [],
            isPendingInvitation: m.hasPendingInvite,
            subteamId: m.subteamId,
            isUnlinked: !m.isLinked,
            username: null,
            subteam: m.subteamName
              ? {
                  id: m.subteamId || "",
                  name: m.subteamName,
                  description: m.subteamName,
                }
              : undefined,
            joinedAt: m.joinedAt || null,
            isCreator: false,
          };
        }
      );

        logger.dev.structured("info", "getMembers: Returning members", {
          count: validatedMembers.length,
        });

      return { members: validatedMembers };
      } catch (error) {
        logger.error("getMembers: Failed to fetch members", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch team members: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
