import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  getActiveSubteams,
  getAllTeamMembersForDashboard,
  getAssignmentsForSubteams,
  getGroupBySlug,
  getRosterDataForSubteam,
  processMembersData,
  processMembersDataWithSubteam,
  processRosterData,
  processRosterDataForDisplay,
  resolveTeamSlugToGroupId,
} from "../helpers";

export const dashboardQueriesRouter = router({
  // Batch load all team data
  batchLoadTeamData: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().optional(),
        includeRoster: z.boolean().optional(),
      })
    )
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

        const [subteamsResult, membersResult, rosterResult] = await Promise.allSettled([
          dbPg
            .select({
              id: newTeamUnits.id,
              teamId: newTeamUnits.teamId,
              description: newTeamUnits.description,
              createdAt: newTeamUnits.createdAt,
            })
            .from(newTeamUnits)
            .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")))
            .orderBy(newTeamUnits.createdAt)
            .then((subteams) => ({
              subteams: subteams.map((s) => ({
                id: s.id,
                name: s.teamId,
                team_id: groupId,
                description: s.description || "",
                created_at: s.createdAt?.toISOString() || new Date().toISOString(),
              })),
            })),

          input.subteamId && input.subteamId !== "all"
            ? (async () => {
                const members = await dbPg
                  .select({
                    userId: users.id,
                    displayName: users.displayName,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    role: newTeamMemberships.role,
                    joinedAt: newTeamMemberships.joinedAt,
                    subteamId: newTeamUnits.id,
                  })
                  .from(users)
                  .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
                  .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
                  .where(
                    and(
                      eq(newTeamUnits.groupId, groupId),
                      eq(newTeamUnits.status, "active"),
                      eq(newTeamMemberships.status, "active"),
                      eq(newTeamMemberships.teamId, input.subteamId ?? "")
                    )
                  );

                return { members: members.map((m) => ({ ...m, isLinked: true })) };
              })()
            : Promise.resolve(null),

          input.includeRoster && input.subteamId && input.subteamId !== "all"
            ? dbPg
                .select({
                  eventName: newTeamRosterData.eventName,
                  slotIndex: newTeamRosterData.slotIndex,
                  studentName: newTeamRosterData.studentName,
                  userId: newTeamRosterData.userId,
                })
                .from(newTeamRosterData)
                .where(eq(newTeamRosterData.teamUnitId, input.subteamId))
                .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex)
                .then((rosterRows) => {
                  const roster: Record<string, string[]> = {};
                  for (const row of rosterRows) {
                    const displayEventName = row.eventName.replace(/and/g, "&");
                    if (!roster[displayEventName]) {
                      roster[displayEventName] = [];
                    }
                    roster[displayEventName][row.slotIndex] = row.studentName || "";
                  }
                  return { roster, removedEvents: [] };
                })
            : Promise.resolve(null),
        ]);

        return {
          subteams: subteamsResult.status === "fulfilled" ? subteamsResult.value.subteams : null,
          members:
            membersResult.status === "fulfilled" ? membersResult.value?.members || null : null,
          roster: rosterResult.status === "fulfilled" ? rosterResult.value?.roster || null : null,
        };
      } catch (error) {
        logger.error(
          "Failed to batch load team data",
          error instanceof Error ? error : new Error(String(error)),
          {
            teamSlug: input.teamSlug,
          }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to batch load team data: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get team dashboard
  getTeamDashboard: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const groupId = await resolveTeamSlugToGroupId(input.teamSlug);
        const authResult = await checkTeamGroupAccessCockroach(ctx.user.id, groupId);
        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        const subteams = await getActiveSubteams(groupId);
        const subteamIds = subteams.map((s) => s.id);

        const [assignments, allMembers, rosterData] = await Promise.all([
          getAssignmentsForSubteams(subteamIds),
          getAllTeamMembersForDashboard(groupId),
          getRosterDataForSubteam(input.subteamId),
        ]);

        const processedRoster = processRosterData(rosterData);
        const processedMembers = processMembersData(allMembers);

        return {
          subteams: subteams.map((s) => ({
            id: s.id,
            name: s.description || s.teamId,
            team_id: s.teamId,
            created_at: s.createdAt,
          })),
          assignments,
          members: processedMembers,
          roster: processedRoster,
          auth: {
            isAuthorized: authResult.isAuthorized,
            hasMembership: authResult.hasMembership,
            hasRosterEntry: authResult.hasRosterEntry,
            role: authResult.role,
          },
        };
      } catch (error) {
        logger.error("Failed to get team dashboard:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get team dashboard",
        });
      }
    }),

  // Get team page data (multiplexed)
  getTeamPageData: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        includeRoster: z.boolean().optional().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const group = await getGroupBySlug(input.teamSlug);
        const groupId = group.id;

        const [userTeamsResult, authResult] = await Promise.all([
          cockroachDBTeamsService.getUserTeams(ctx.user.id),
          checkTeamGroupAccessCockroach(ctx.user.id, groupId),
        ]);

        if (!authResult.isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to access this team",
          });
        }

        const subteams = await getActiveSubteams(groupId);
        const subteamIds = subteams.map((s) => s.id);
        const firstSubteamId = subteams[0]?.id;

        const [assignments, allMembers, rosterData] = await Promise.all([
          getAssignmentsForSubteams(subteamIds),
          getAllTeamMembersForDashboard(groupId),
          input.includeRoster && firstSubteamId ? getRosterDataForSubteam(firstSubteamId) : [],
        ]);

        const processedRoster = processRosterDataForDisplay(rosterData);
        const processedMembers = processMembersDataWithSubteam(allMembers);

        return {
          userTeams: userTeamsResult,
          currentTeam: {
            id: groupId,
            school: group.school,
            division: group.division as "B" | "C",
            slug: group.slug,
          },
          subteams: subteams.map((s) => ({
            id: s.id,
            name: s.teamId,
            team_id: groupId,
            description: s.description || "",
            created_at: s.createdAt?.toISOString() || new Date().toISOString(),
          })),
          assignments,
          members: processedMembers,
          roster: processedRoster,
          rosterSubteamId: firstSubteamId || null,
          auth: {
            isAuthorized: authResult.isAuthorized,
            hasMembership: authResult.hasMembership,
            hasRosterEntry: authResult.hasRosterEntry,
            role: authResult.role,
          },
        };
      } catch (error) {
        logger.error("Failed to get team page data:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get team page data",
        });
      }
    }),
});
