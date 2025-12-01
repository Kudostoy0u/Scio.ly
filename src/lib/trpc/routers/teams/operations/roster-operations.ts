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
  syncPeopleFromRosterForSubteam,
  validateSubteamBelongsToGroup,
} from "../helpers";

const InsertRosterDataSchema = createInsertSchema(newTeamRosterData);

// Helper function to delete roster entries by userId
async function deleteRosterByUserId(
  userId: string,
  eventName: string | undefined,
  subteamId: string | undefined,
  groupId: string
): Promise<{ removedEntries: number; affectedSubteamIds: Set<string> }> {
  const affectedSubteamIds = new Set<string>();
  let removedEntries = 0;

  if (eventName?.trim() && subteamId) {
    // Remove specific event for user from specific subteam
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          eq(newTeamRosterData.userId, userId),
          eq(newTeamRosterData.eventName, eventName.trim()),
          eq(newTeamRosterData.teamUnitId, subteamId)
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    affectedSubteamIds.add(subteamId);
  } else if (eventName?.trim()) {
    // Remove specific event for user from ALL subteams in group
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          eq(newTeamRosterData.userId, userId),
          eq(newTeamRosterData.eventName, eventName.trim()),
          sql`${newTeamRosterData.teamUnitId} IN (
            SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
          )`
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    for (const r of result) {
      affectedSubteamIds.add(r.teamUnitId);
    }
  } else if (subteamId) {
    // Remove roster entries for this user from specific subteam
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(and(eq(newTeamRosterData.userId, userId), eq(newTeamRosterData.teamUnitId, subteamId)))
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    affectedSubteamIds.add(subteamId);
  } else {
    // Remove all roster entries for this user
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          eq(newTeamRosterData.userId, userId),
          sql`${newTeamRosterData.teamUnitId} IN (
            SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
          )`
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    for (const r of result) {
      affectedSubteamIds.add(r.teamUnitId);
    }
  }

  return { removedEntries, affectedSubteamIds };
}

// Helper function to delete roster entries by studentName
async function deleteRosterByStudentName(
  studentName: string,
  eventName: string | undefined,
  subteamId: string | undefined,
  groupId: string
): Promise<{ removedEntries: number; affectedSubteamIds: Set<string> }> {
  const affectedSubteamIds = new Set<string>();
  let removedEntries = 0;
  const trimmedName = studentName.trim();

  if (eventName?.trim() && subteamId) {
    // Remove specific event for unlinked person from specific subteam
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          sql`LOWER(COALESCE(${newTeamRosterData.studentName},'')) = LOWER(${trimmedName})`,
          eq(newTeamRosterData.eventName, eventName.trim()),
          eq(newTeamRosterData.teamUnitId, subteamId)
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    affectedSubteamIds.add(subteamId);
  } else if (subteamId) {
    // Remove all entries for unlinked person from specific subteam
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          sql`LOWER(COALESCE(${newTeamRosterData.studentName},'')) = LOWER(${trimmedName})`,
          eq(newTeamRosterData.teamUnitId, subteamId)
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    affectedSubteamIds.add(subteamId);
  } else {
    // Remove all entries for unlinked person from ALL subteams
    const result = await dbPg
      .delete(newTeamRosterData)
      .where(
        and(
          sql`LOWER(COALESCE(${newTeamRosterData.studentName},'')) = LOWER(${trimmedName})`,
          sql`${newTeamRosterData.teamUnitId} IN (
            SELECT id FROM new_team_units WHERE group_id = ${groupId} AND status = 'active'
          )`
        )
      )
      .returning({ teamUnitId: newTeamRosterData.teamUnitId });

    removedEntries = result.length;
    for (const r of result) {
      affectedSubteamIds.add(r.teamUnitId);
    }
  }

  return { removedEntries, affectedSubteamIds };
}

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

        // Sync people table with roster changes
        await syncPeopleFromRosterForSubteam(input.subteamId);

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

        // CRITICAL: Delete all existing roster entries for this subteam first
        // This ensures that cleared entries (empty slots) are actually removed
        await dbPg
          .delete(newTeamRosterData)
          .where(eq(newTeamRosterData.teamUnitId, input.subteamId));

        // Then insert only the new non-empty entries
        if (rosterEntriesToInsert.length > 0) {
          await dbPg.insert(newTeamRosterData).values(rosterEntriesToInsert);
        }

        // Sync people table with roster changes (this will remove orphaned people entries)
        await syncPeopleFromRosterForSubteam(input.subteamId);

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
        const affectedSubteamIds = new Set<string>();

        if (input.userId) {
          // NOTE: Do NOT remove membership - membership is separate from roster!
          const result = await deleteRosterByUserId(
            input.userId,
            input.eventName,
            input.subteamId,
            groupId
          );
          removedEntries = result.removedEntries;
          for (const id of result.affectedSubteamIds) {
            affectedSubteamIds.add(id);
          }
        } else if (input.studentName?.trim()) {
          const result = await deleteRosterByStudentName(
            input.studentName,
            input.eventName,
            input.subteamId,
            groupId
          );
          removedEntries = result.removedEntries;
          for (const id of result.affectedSubteamIds) {
            affectedSubteamIds.add(id);
          }
        }

        // Sync people table for all affected subteams
        for (const subteamId of Array.from(affectedSubteamIds)) {
          await syncPeopleFromRosterForSubteam(subteamId);
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
