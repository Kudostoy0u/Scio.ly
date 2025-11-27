import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamUnits } from "@/lib/db/schema/teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const subteamOperationsRouter = router({
  // Create a new subteam
  createSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        name: z.string().min(1, "Subteam name is required"),
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

        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can create subteams",
          });
        }

        const existingSubteam = await dbPg
          .select({ teamId: newTeamUnits.teamId })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.teamId, input.name)));

        if (existingSubteam.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A subteam with this name already exists",
          });
        }

        const [newSubteam] = await dbPg
          .insert(newTeamUnits)
          .values({
            groupId: groupId,
            teamId: input.name,
            description: input.name,
            captainCode: `CAP${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            userCode: `USR${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            createdBy: ctx.user.id,
          })
          .returning();

        if (!newSubteam) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create subteam",
          });
        }

        return {
          id: newSubteam.id,
          name: newSubteam.teamId,
          team_id: groupId,
          description: newSubteam.description || "",
          created_at: newSubteam.createdAt,
        };
      } catch (error) {
        logger.error("Failed to create subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create subteam",
        });
      }
    }),

  // Update a subteam
  updateSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
        name: z.string().min(1, "Subteam name is required"),
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

        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can update subteams",
          });
        }

        const [updatedSubteam] = await dbPg
          .update(newTeamUnits)
          .set({
            teamId: input.name,
            updatedAt: new Date(),
          })
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)))
          .returning();

        if (!updatedSubteam) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        return {
          id: updatedSubteam.id,
          name: updatedSubteam.description || `Team ${updatedSubteam.teamId}`,
          team_id: groupId,
          description: updatedSubteam.description || "",
          created_at: updatedSubteam.createdAt,
        };
      } catch (error) {
        logger.error("Failed to update subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update subteam",
        });
      }
    }),

  // Delete a subteam
  deleteSubteam: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string(),
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

        const hasLeadership =
          teamAccess.isCreator ||
          teamAccess.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role));

        if (!hasLeadership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains and co-captains can delete subteams",
          });
        }

        const [deletedSubteam] = await dbPg
          .update(newTeamUnits)
          .set({
            status: "deleted",
            updatedAt: new Date(),
          })
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)))
          .returning();

        if (!deletedSubteam) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Subteam not found",
          });
        }

        return { success: true };
      } catch (error) {
        logger.error("Failed to delete subteam:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete subteam",
        });
      }
    }),
});
