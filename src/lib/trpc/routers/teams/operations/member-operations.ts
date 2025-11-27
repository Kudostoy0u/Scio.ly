import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamInvitations,
  newTeamMemberships,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

export const memberOperationsRouter = router({
  // Invite a member to the team
  inviteMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        email: z.string().email(),
        role: z.enum(["captain", "co_captain", "member", "observer"]).default("member"),
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

        const unitsResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(eq(newTeamUnits.groupId, groupId));

        if (unitsResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.map((row) => row.id);

        const membershipResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
            team_id: newTeamMemberships.teamId,
          })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              inArray(newTeamMemberships.teamId, teamUnitIds),
              eq(newTeamMemberships.status, "active")
            )
          );

        if (membershipResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        const hasPermission = membershipResult.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can invite members" });
        }

        const [invitedUser] = await dbPg
          .select({
            id: users.id,
            email: users.email,
            display_name: users.displayName,
          })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!invitedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        const existingMembership = await dbPg
          .select({ id: newTeamMemberships.id })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, invitedUser.id),
              inArray(newTeamMemberships.teamId, teamUnitIds),
              eq(newTeamMemberships.status, "active")
            )
          );

        if (existingMembership.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a team member" });
        }

        const existingInvitation = await dbPg
          .select({ id: newTeamInvitations.id })
          .from(newTeamInvitations)
          .where(
            and(
              inArray(newTeamInvitations.teamId, teamUnitIds),
              eq(newTeamInvitations.email, input.email),
              eq(newTeamInvitations.status, "pending")
            )
          );

        if (existingInvitation.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already sent" });
        }

        const targetTeamUnitId = membershipResult.find((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        )?.team_id;

        if (!targetTeamUnitId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No valid team unit found",
          });
        }

        const invitationCode = `INV${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await dbPg.insert(newTeamInvitations).values({
          teamId: targetTeamUnitId,
          invitedBy: ctx.user.id,
          email: input.email,
          role: input.role,
          invitationCode,
          expiresAt,
          status: "pending",
        });

        const result = {
          message: "Invitation sent successfully",
          invitationCode,
          expiresAt: expiresAt.toISOString(),
        };

        const validatedResult = z
          .object({
            message: z.string(),
            invitationCode: z.string(),
            expiresAt: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to invite member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite member",
        });
      }
    }),

  // Cancel an invitation
  cancelInvitation: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        invitationCode: z.string(),
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

        const unitsResult = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(eq(newTeamUnits.groupId, groupId));

        if (unitsResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.map((row) => row.id);

        const membershipResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
            team_id: newTeamMemberships.teamId,
          })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              inArray(newTeamMemberships.teamId, teamUnitIds),
              eq(newTeamMemberships.status, "active")
            )
          );

        if (membershipResult.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        const hasPermission = membershipResult.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only captains can cancel invitations",
          });
        }

        const invitationResult = await dbPg
          .select({
            id: newTeamInvitations.id,
            email: newTeamInvitations.email,
          })
          .from(newTeamInvitations)
          .where(
            and(
              eq(newTeamInvitations.invitationCode, input.invitationCode),
              inArray(newTeamInvitations.teamId, teamUnitIds),
              eq(newTeamInvitations.status, "pending")
            )
          );

        if (invitationResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found or already processed",
          });
        }

        await dbPg
          .update(newTeamInvitations)
          .set({ status: "cancelled" })
          .where(eq(newTeamInvitations.invitationCode, input.invitationCode));

        const result = { message: "Invitation cancelled successfully" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to cancel invitation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel invitation",
        });
      }
    }),

  // Remove a member from the team
  removeMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        userId: z.string(),
        subteamId: z.string().optional(),
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

        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can remove members" });
        }

        const memberToRemove = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [input.userId, teamUnitIds]
        );

        if (memberToRemove.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        const memberMembership = memberToRemove.rows[0];
        if (!memberMembership) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        if (memberMembership.role === "captain") {
          const captainCountResult = await queryCockroachDB<{ count: string }>(
            `SELECT COUNT(*) as count FROM new_team_memberships
             WHERE team_id = $1 AND role = 'captain' AND status = 'active'`,
            [memberMembership.team_id]
          );

          const countRow = captainCountResult.rows[0];
          if (!countRow) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to get captain count",
            });
          }
          if (Number.parseInt(countRow.count) <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot remove the last captain. Promote another member to captain first.",
            });
          }
        }

        await queryCockroachDB(
          `UPDATE new_team_memberships SET status = 'inactive', updated_at = NOW()
           WHERE user_id = $1 AND team_id = $2`,
          [input.userId, memberMembership.team_id]
        );

        const result = { message: "Member removed successfully" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to remove member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
        });
      }
    }),

  // Promote or change a member's role
  promoteMember: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        userId: z.string(),
        role: z.enum(["captain", "co_captain", "member", "observer"]),
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

        const unitsResult = await queryCockroachDB<{ id: string }>(
          "SELECT id FROM new_team_units WHERE group_id = $1",
          [groupId]
        );

        if (unitsResult.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = unitsResult.rows.map((row) => row.id);

        const membershipResult = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [ctx.user.id, teamUnitIds]
        );

        if (membershipResult.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a team member" });
        }

        const hasPermission = membershipResult.rows.some((membership) =>
          ["captain", "co_captain"].includes(membership.role)
        );

        if (!hasPermission) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only captains can promote members" });
        }

        const memberToPromote = await queryCockroachDB<{
          id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT id, role, team_id FROM new_team_memberships
           WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
          [input.userId, teamUnitIds]
        );

        if (memberToPromote.rows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        const memberMembership = memberToPromote.rows[0];
        if (!memberMembership) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this team" });
        }

        if (!["captain", "co_captain", "member", "observer"].includes(input.role)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid role specified" });
        }

        await queryCockroachDB(
          `UPDATE new_team_memberships SET role = $1, updated_at = NOW()
           WHERE user_id = $2 AND team_id = $3`,
          [input.role, input.userId, memberMembership.team_id]
        );

        const result = { message: "Member promoted successfully" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to promote member:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to promote member",
        });
      }
    }),
});
