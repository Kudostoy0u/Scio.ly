import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import {
  checkTeamGroupAccessCockroach,
  checkTeamGroupLeadershipCockroach,
} from "@/lib/utils/team-auth";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  checkTeamGroupAccessOrThrow,
  determineUserIdToLink,
  normalizeEventName,
  resolveTeamSlugToGroupId,
  validateSubteamBelongsToGroup,
} from "../helpers";

const InsertRosterDataSchema = createInsertSchema(newTeamRosterData);

export const rosterOperationsRouter = router({
  // Update a single roster entry
  updateRoster: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid("Invalid subteam ID format"),
        eventName: z.string().min(1, "Event name is required"),
        slotIndex: z.number().int().min(0, "Slot index must be non-negative"),
        studentName: z.string().min(1, "Student name is required"),
        userId: z.string().uuid("Invalid user ID format").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const groupId = await resolveTeamSlugToGroupId(input.teamSlug);
        await checkTeamGroupAccessOrThrow(ctx.user.id, groupId);
        await validateSubteamBelongsToGroup(input.subteamId, groupId);

        const normalizedEventName = normalizeEventName(input.eventName);
        const userIdToLink = await determineUserIdToLink(input.userId, input.studentName, groupId);

        const rosterDataToInsert = InsertRosterDataSchema.parse({
          teamUnitId: input.subteamId,
          eventName: normalizedEventName,
          slotIndex: input.slotIndex,
          studentName: input.studentName || null,
          userId: userIdToLink,
          updatedAt: new Date(),
        });

        await dbPg
          .insert(newTeamRosterData)
          .values(rosterDataToInsert)
          .onConflictDoUpdate({
            target: [
              newTeamRosterData.teamUnitId,
              newTeamRosterData.eventName,
              newTeamRosterData.slotIndex,
            ],
            set: {
              studentName: input.studentName || null,
              userId: userIdToLink,
              updatedAt: new Date(),
            },
          });

        const result = { message: "Roster data saved successfully" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to update roster:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update roster",
        });
      }
    }),

  // Bulk update roster entries
  updateRosterBulk: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string().min(1, "Team slug is required"),
        subteamId: z.string().uuid("Invalid subteam ID format"),
        rosterEntries: z.array(
          z.object({
            eventName: z.string().min(1, "Event name is required"),
            slotIndex: z.number().int().min(0, "Slot index must be non-negative"),
            studentName: z.string().min(1, "Student name is required"),
            userId: z.string().uuid("Invalid user ID format").optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

        const subteamResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(
            and(
              eq(newTeamUnits.id, input.subteamId),
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamUnits.status, "active")
            )
          );

        if (subteamResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        const teamMembersResult = await dbPg
          .select({
            userId: users.id,
            displayName: users.displayName,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
          .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
          .where(
            and(
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamMemberships.status, "active"),
              eq(newTeamUnits.status, "active")
            )
          );

        const memberLookup = new Map<string, string>();
        for (const member of teamMembersResult) {
          const displayName =
            member.displayName ||
            (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : "");

          if (displayName) {
            memberLookup.set(displayName.toLowerCase().trim(), member.userId);
          }
        }

        const rosterEntriesToInsert = input.rosterEntries.map((entry) => {
          const normalizedEventName = entry.eventName.replace(/&/g, "and");

          let userIdToLink: string | null = null;
          if (entry.userId) {
            userIdToLink = entry.userId;
          } else if (entry.studentName?.trim()) {
            const studentNameLower = entry.studentName.toLowerCase().trim();
            userIdToLink = memberLookup.get(studentNameLower) || null;
          }

          return {
            teamUnitId: input.subteamId,
            eventName: normalizedEventName,
            slotIndex: entry.slotIndex,
            studentName: entry.studentName || null,
            userId: userIdToLink,
            updatedAt: new Date(),
          };
        });

        if (rosterEntriesToInsert.length > 0) {
          await dbPg
            .insert(newTeamRosterData)
            .values(rosterEntriesToInsert)
            .onConflictDoUpdate({
              target: [
                newTeamRosterData.teamUnitId,
                newTeamRosterData.eventName,
                newTeamRosterData.slotIndex,
              ],
              set: {
                studentName: sql`excluded.student_name`,
                userId: sql`excluded.user_id`,
                updatedAt: new Date(),
              },
            });
        }

        return {
          message: `Bulk roster update completed for ${rosterEntriesToInsert.length} entries`,
        };
      } catch (error) {
        logger.error("Failed to update roster bulk:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update roster bulk",
        });
      }
    }),

  // Remove roster entry
  removeRosterEntry: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
        eventName: z.string(),
        userId: z.string().optional(),
        studentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

        const teamAccess = await getTeamAccess(ctx.user.id, groupId);
        if (!teamAccess.hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this team" });
        }

        const leadershipResult = await checkTeamGroupLeadershipCockroach(ctx.user.id, groupId);
        if (!leadershipResult.hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can modify roster",
          });
        }

        let removedEntries = 0;

        if (input.userId) {
          if (input.eventName?.trim()) {
            const deleteByUserEvent = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  eq(newTeamRosterData.eventName, input.eventName.trim()),
                  sql`${newTeamRosterData.teamUnitId} IN (
                    SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                  )`
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUserEvent.length;
          } else if (input.subteamId) {
            const deleteByUserSubteam = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  eq(newTeamRosterData.teamUnitId, input.subteamId)
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUserSubteam.length;

            await dbPg
              .delete(newTeamMemberships)
              .where(
                and(
                  eq(newTeamMemberships.userId, input.userId),
                  eq(newTeamMemberships.teamId, input.subteamId)
                )
              );
          } else {
            const deleteByUser = await dbPg
              .delete(newTeamRosterData)
              .where(
                and(
                  eq(newTeamRosterData.userId, input.userId),
                  sql`${newTeamRosterData.teamUnitId} IN (
                      SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                    )`
                )
              )
              .returning({ teamUnitId: newTeamRosterData.teamUnitId });

            removedEntries = deleteByUser.length;

            await dbPg.delete(newTeamMemberships).where(
              sql`${newTeamMemberships.teamId} IN (
                    SELECT id FROM new_team_units WHERE group_id = ${groupId}
                  )`
            );
          }
        } else if (input.studentName?.trim()) {
          const deleteByName = await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                sql`LOWER(COALESCE(${newTeamRosterData.studentName},'')) = LOWER(${input.studentName.trim()})`,
                sql`${newTeamRosterData.teamUnitId} IN (
                  SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
                )`
              )
            )
            .returning({ teamUnitId: newTeamRosterData.teamUnitId });

          removedEntries = deleteByName.length;
        }

        return { removedEntries };
      } catch (error) {
        logger.error("Failed to remove roster entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove roster entry",
        });
      }
    }),
});
