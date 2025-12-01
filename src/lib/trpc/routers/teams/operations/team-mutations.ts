import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamUnits } from "@/lib/db/schema/teams";
import { newTeamMemberships, newTeamRosterData } from "@/lib/db/schema/teams";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { getTeamAccess } from "@/lib/utils/team-auth-v2";
import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { ensureUserDisplayName } from "../helpers";

const CreateTeamInputSchema = z.object({
  school: z.string().min(1, "School name is required"),
  division: z.literal("B").or(z.literal("C")),
});

const JoinTeamInputSchema = z.object({
  code: z.string().min(1, "Team code is required"),
});

export const teamMutationsRouter = router({
  // Create a new team
  createTeam: protectedProcedure.input(CreateTeamInputSchema).mutation(async ({ ctx, input }) => {
    try {
      await ensureUserDisplayName(ctx.user.id, ctx.user.email);

      const baseSlug = `${input.school.toLowerCase().replace(/\s+/g, "-")}-${input.division.toLowerCase()}`;
      const timestamp = Date.now().toString(36);
      const slug = `${baseSlug}-${timestamp}`;

      const group = await cockroachDBTeamsService.createTeamGroup({
        school: input.school,
        division: input.division,
        slug,
        createdBy: ctx.user.id,
      });

      const team = await cockroachDBTeamsService.createTeamUnit({
        groupId: group.id,
        teamId: "A",
        captainCode: `CAP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        userCode: `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        description: "Team A",
        createdBy: ctx.user.id,
      });

      await cockroachDBTeamsService.createTeamMembership({
        userId: ctx.user.id,
        teamId: team.id,
        role: "captain",
        status: "active",
      });

      const members = await cockroachDBTeamsService.getTeamMembers(team.id);

      return {
        id: team.id,
        name: team.name,
        slug: group.slug,
        school: group.school,
        division: group.division as "B" | "C",
        description: team.description || null,
        captainCode: team.captain_code,
        userCode: team.user_code,
        userRole: "captain",
        members: await Promise.all(
          members.map(async (m) => {
            const supabase = await createSupabaseServerClient();
            const { data: userProfile } = await supabase
              .from("users")
              .select("display_name, first_name, last_name, email")
              .eq("id", m.user_id)
              .single();

            const userProfileTyped = userProfile as {
              display_name?: string;
              first_name?: string;
              last_name?: string;
              email?: string;
            } | null;
            return {
              id: m.user_id,
              name:
                userProfileTyped?.display_name ||
                (userProfileTyped?.first_name && userProfileTyped?.last_name
                  ? `${userProfileTyped.first_name} ${userProfileTyped.last_name}`
                  : `User ${m.user_id.substring(0, 8)}`),
              email: userProfileTyped?.email || `user-${m.user_id.substring(0, 8)}@example.com`,
              role: m.role as "captain" | "co_captain" | "member" | "observer",
              joinedAt: m.joined_at,
              subteamId: team.id,
              subteamName: team.name,
              events: [],
              isLinked: true,
            };
          })
        ),
        wasReactivated: team.created_at !== team.updated_at,
      };
    } catch (error) {
      logger.error(
        "Failed to create team",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: ctx.user.id,
        }
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create team: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),

  // Join a team by code
  joinTeam: protectedProcedure.input(JoinTeamInputSchema).mutation(async ({ ctx, input }) => {
    try {
      await ensureUserDisplayName(ctx.user.id, ctx.user.email);

      const team = await cockroachDBTeamsService.joinTeamByCode(ctx.user.id, input.code);

      if (!team) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid team code",
        });
      }

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        school: team.school,
        division: team.division as "B" | "C",
        description: team.description || null,
        captainCode: team.captain_code,
        userCode: team.user_code,
        userRole: team.user_role || null,
        members: team.members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role as "captain" | "co_captain" | "member" | "observer",
          joinedAt: m.joined_at,
          subteamId: team.id,
          subteamName: team.name,
          events: [],
          isLinked: true,
        })),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to join team",
      });
    }
  }),

  // Exit a subteam
  exitSubteam: protectedProcedure
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

        const subteamResult = await dbPg
          .select({ id: newTeamUnits.id, status: newTeamUnits.status })
          .from(newTeamUnits)
          .where(and(eq(newTeamUnits.id, input.subteamId), eq(newTeamUnits.groupId, groupId)));

        if (subteamResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        // Get all active memberships for this user in this group
        const allMembershipsResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
            teamId: newTeamMemberships.teamId,
          })
          .from(newTeamMemberships)
          .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamMemberships.status, "active")
            )
          );

        const membershipToExit = allMembershipsResult.find((m) => m.teamId === input.subteamId);

        if (!membershipToExit) {
          // No membership to exit, just remove roster entries
          await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                eq(newTeamRosterData.userId, ctx.user.id),
                eq(newTeamRosterData.teamUnitId, input.subteamId)
              )
            );

          // Sync people table
          const { syncPeopleFromRosterForSubteam } = await import("../helpers/people-sync");
          await syncPeopleFromRosterForSubteam(input.subteamId);

          return { message: "Successfully exited subteam" };
        }

        // Check if user is a captain/co_captain and if this is their only membership
        const isCaptain = ["captain", "co_captain"].includes(membershipToExit.role);
        const hasOtherMemberships = allMembershipsResult.length > 1;

        // CRITICAL: If captain/co_captain with only one membership, don't deactivate it
        // Just remove roster entries - they stay as captain but not on roster
        if (isCaptain && !hasOtherMemberships) {
          await dbPg
            .delete(newTeamRosterData)
            .where(
              and(
                eq(newTeamRosterData.userId, ctx.user.id),
                eq(newTeamRosterData.teamUnitId, input.subteamId)
              )
            );

          // Sync people table
          const { syncPeopleFromRosterForSubteam } = await import("../helpers/people-sync");
          await syncPeopleFromRosterForSubteam(input.subteamId);

          return { message: "Removed from roster, but kept captain status" };
        }

        // For regular members or captains with multiple memberships, deactivate the membership
        const updateResult = await dbPg
          .update(newTeamMemberships)
          .set({ status: "inactive" })
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              eq(newTeamMemberships.teamId, input.subteamId),
              eq(newTeamMemberships.status, "active")
            )
          )
          .returning({ id: newTeamMemberships.id });

        await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, ctx.user.id),
              eq(newTeamRosterData.teamUnitId, input.subteamId)
            )
          );

        // Sync people table for affected subteam
        const { syncPeopleFromRosterForSubteam } = await import("../helpers/people-sync");
        await syncPeopleFromRosterForSubteam(input.subteamId);

        if (process.env.NODE_ENV === "development") {
          logger.info("exitSubteam completed", {
            membershipUpdated: updateResult.length,
            subteamId: input.subteamId,
            userId: ctx.user.id,
          });
        }

        const result = { message: "Successfully exited subteam" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to exit subteam:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exit subteam",
        });
      }
    }),

  // Exit entire team
  exitTeam: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const exitGroupResult = await dbPg
          .select({ id: newTeamGroups.id })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.slug, input.teamSlug));

        if (exitGroupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        }

        const groupId = exitGroupResult[0]?.id;
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
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

        if (unitsResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active team units found for this group",
          });
        }

        const teamUnitIds = unitsResult.map((row) => row.id);

        const membershipResult = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
            teamId: newTeamMemberships.teamId,
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

        const memberships = membershipResult;

        const captainMemberships = memberships.filter((m) => m.role === "captain");

        if (captainMemberships.length > 0) {
          for (const membership of captainMemberships) {
            const captainCountResult = await dbPg
              .select({ count: count() })
              .from(newTeamMemberships)
              .where(
                and(
                  eq(newTeamMemberships.teamId, membership.teamId),
                  eq(newTeamMemberships.role, "captain"),
                  eq(newTeamMemberships.status, "active")
                )
              );

            const captainCount = captainCountResult[0]?.count || 0;
            if (captainCount <= 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Cannot exit team as the only captain. Promote another member to captain first.",
              });
            }
          }
        }

        await dbPg
          .update(newTeamMemberships)
          .set({ status: "inactive" })
          .where(
            and(
              eq(newTeamMemberships.userId, ctx.user.id),
              inArray(newTeamMemberships.teamId, teamUnitIds)
            )
          );

        await dbPg
          .delete(newTeamRosterData)
          .where(
            and(
              eq(newTeamRosterData.userId, ctx.user.id),
              inArray(newTeamRosterData.teamUnitId, teamUnitIds)
            )
          );

        const result = { message: "Successfully exited team" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to exit team:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to exit team. Please try again.",
        });
      }
    }),

  // Archive team
  archiveTeam: protectedProcedure
    .input(z.object({ teamSlug: z.string() }))
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

        const teamUnits = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(eq(newTeamUnits.groupId, groupId));

        if (teamUnits.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No team units found for this group" });
        }

        const teamUnitIds = teamUnits.map((unit) => unit.id);

        const archiveGroupResult = await dbPg
          .select({ createdBy: newTeamGroups.createdBy })
          .from(newTeamGroups)
          .where(eq(newTeamGroups.id, groupId))
          .limit(1);

        if (archiveGroupResult.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        const groupCreator = archiveGroupResult[0]?.createdBy;
        if (!groupCreator) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
        }

        if (groupCreator !== ctx.user.id) {
          const captainCheck = await dbPg
            .select({ role: newTeamMemberships.role })
            .from(newTeamMemberships)
            .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
            .where(
              and(
                eq(newTeamMemberships.userId, ctx.user.id),
                eq(newTeamUnits.groupId, groupId),
                eq(newTeamMemberships.status, "active")
              )
            )
            .limit(1);

          if (captainCheck.length === 0) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }

          const captainCheckResult = captainCheck[0];
          if (!captainCheckResult) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }
          const userRole = captainCheckResult.role;
          if (!["captain", "co_captain"].includes(userRole)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the team creator or captains can archive the team",
            });
          }
        }

        await dbPg
          .update(newTeamGroups)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(newTeamGroups.id, groupId));

        await dbPg
          .update(newTeamUnits)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(newTeamUnits.groupId, groupId));

        await dbPg
          .update(newTeamMemberships)
          .set({ status: "archived" })
          .where(inArray(newTeamMemberships.teamId, teamUnitIds));

        const result = { message: "Team successfully archived" };

        const validatedResult = z
          .object({
            message: z.string(),
          })
          .parse(result);

        return validatedResult;
      } catch (error) {
        logger.error("Failed to archive team:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to archive team. Please try again.",
        });
      }
    }),
});
