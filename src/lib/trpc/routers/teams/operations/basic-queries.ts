import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamRosterData, newTeamUnits } from "@/lib/db/schema/teams";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import {
  UUID_REGEX,
  buildMemberEventsLookup,
  buildSubteamWhereCondition,
  checkTeamAccessOrThrow,
  getActiveSubteams,
  getActiveTeamUnitIds,
  getAssignmentsForSubteams,
  getMembersWithSubteamMemberships,
  getUsersWithRosterEntries,
  getUsersWithoutSubteam,
  mapUsersToMembers,
  resolveTeamSlugToGroupId,
} from "../helpers";

const RosterDataSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())),
  removedEvents: z.array(z.string()),
});

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
          })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")))
          .orderBy(newTeamUnits.createdAt);

        const subteams = subteamsResult.map((subteam) => ({
          id: subteam.id,
          name: subteam.teamId,
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

  // Get people/members for a subteam
  getPeople: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const groupId = await resolveTeamSlugToGroupId(input.teamSlug);
        await checkTeamAccessOrThrow(ctx.user.id, groupId);

        const teamUnitIds = await getActiveTeamUnitIds(groupId);
        const whereCondition = buildSubteamWhereCondition(groupId, input.subteamId);
        const userIdsWithRoster = await getUsersWithRosterEntries(groupId);

        const results = await getMembersWithSubteamMemberships(whereCondition);

        const membershipsUserIds = new Set(results.map((r) => r.userId));
        const userIdsWithoutSubteam = Array.from(userIdsWithRoster).filter(
          (id) => !membershipsUserIds.has(id)
        );

        const usersWithoutSubteam = await getUsersWithoutSubteam(userIdsWithoutSubteam);
        const membersWithoutSubteam = mapUsersToMembers(usersWithoutSubteam);

        const rosterData = await dbPg
          .select({
            eventName: newTeamRosterData.eventName,
            studentName: newTeamRosterData.studentName,
            userId: newTeamRosterData.userId,
            teamUnitId: newTeamRosterData.teamUnitId,
          })
          .from(newTeamRosterData)
          .where(
            input.subteamId
              ? eq(newTeamRosterData.teamUnitId, input.subteamId)
              : inArray(newTeamRosterData.teamUnitId, teamUnitIds)
          );

        const rosterEntries = await dbPg
          .select({
            name: sql<string>`new_team_people.name`,
            userId: sql<string | null>`new_team_people.user_id`,
            events: sql<string[]>`new_team_people.events`,
            teamUnitId: sql<string>`new_team_people.team_unit_id`,
            subteamName: newTeamUnits.teamId,
          })
          .from(sql`new_team_people`)
          .leftJoin(newTeamUnits, sql`new_team_people.team_unit_id = ${newTeamUnits.id}`)
          .where(
            input.subteamId
              ? sql`new_team_people.team_unit_id = ${input.subteamId}`
              : sql`new_team_people.team_unit_id IN (${teamUnitIds})`
          );

        const subteamNames = await dbPg
          .select({
            id: newTeamUnits.id,
            teamId: newTeamUnits.teamId,
          })
          .from(newTeamUnits)
          .where(
            input.subteamId
              ? eq(newTeamUnits.id, input.subteamId)
              : inArray(newTeamUnits.id, teamUnitIds)
          );

        const subteamNameMap = new Map(subteamNames.map((s) => [s.id, s.teamId]));

        const unlinkedRosterPeople = rosterData
          .filter((rd) => !rd.userId && rd.studentName)
          .map((rd) => ({
            name: rd.studentName,
            userId: null,
            events: [rd.eventName],
            teamUnitId: rd.teamUnitId,
            subteamName: subteamNameMap.get(rd.teamUnitId) || "Unknown",
          }));

        const allRosterEntries = [...rosterEntries, ...unlinkedRosterPeople];

        const memberEvents = buildMemberEventsLookup(rosterData);

        const linkedMembers = results.map((result) => {
          const displayName =
            result.displayName ||
            (result.firstName && result.lastName
              ? `${result.firstName} ${result.lastName}`
              : result.firstName ||
                result.lastName ||
                result.username ||
                `User ${result.userId.substring(0, 8)}`);

          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt || null,
            subteamId: result.subteamId || null,
            subteamName: result.subteamName || null,
            email: result.email || null,
            displayFirstName: displayName,
            displayLastName: "",
            hasRosterEntry: result.userId ? (memberEvents[result.userId]?.length ?? 0) > 0 : false,
            hasPendingInvite: false,
            events: memberEvents[result.userId] || [],
            isLinked: true,
          };
        });

        const membersWithoutSubteamProcessed = membersWithoutSubteam.map((result) => {
          return {
            userId: result.userId,
            role: result.role,
            joinedAt: result.joinedAt || null,
            subteamId: null,
            subteamName: null,
            email: result.email || null,
            displayFirstName: result.displayName || null,
            displayLastName: "",
            hasRosterEntry: result.userId ? (memberEvents[result.userId]?.length ?? 0) > 0 : false,
            hasPendingInvite: false,
            events: memberEvents[result.userId] || [],
            isLinked: true,
          };
        });

        const rosterMembers = allRosterEntries.map((entry) => {
          const events = Array.isArray(entry.events) ? entry.events : [];
          return {
            userId: entry.userId,
            role: "member",
            joinedAt: null,
            subteamId: entry.teamUnitId,
            subteamName: entry.subteamName || "Unknown",
            email: null,
            displayFirstName: entry.name,
            displayLastName: "",
            hasRosterEntry: events.length > 0,
            hasPendingInvite: false,
            events: events,
            isLinked: !!entry.userId,
          };
        });

        const linkedUserIds = new Set(linkedMembers.map((m) => m.userId));
        const uniqueRosterMembers = rosterMembers.filter(
          (entry) => !(entry.userId && linkedUserIds.has(entry.userId))
        );

        const membersWithRosterData = linkedMembers.map((linkedMember) => {
          const rosterEntry = rosterMembers.find((entry) => entry.userId === linkedMember.userId);
          if (rosterEntry) {
            return {
              ...linkedMember,
              events: [...(linkedMember.events || []), ...(rosterEntry.events || [])],
              hasRosterEntry: true,
            };
          }
          return linkedMember;
        });

        const members = [
          ...membersWithRosterData,
          ...membersWithoutSubteamProcessed,
          ...uniqueRosterMembers,
        ];

        return { members };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch team members",
        });
      }
    }),

  // Get members (alias for getPeople)
  getMembers: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<{ members: unknown[] }> => {
      const caller = basicQueriesRouter.createCaller({ user: ctx.user, headers: undefined });
      const peopleResult = (await (
        caller.getPeople as (input: unknown) => Promise<{ members: unknown[] }>
      )?.(input)) || { members: [] };

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

      return { members: validatedMembers };
    }),
});
