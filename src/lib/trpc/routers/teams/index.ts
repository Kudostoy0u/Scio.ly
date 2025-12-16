import {
	acceptLinkInvitation,
	acceptPendingInvite,
	archiveTeam,
	cancelLinkInvitation,
	createInvitation,
	createLinkInvitation,
	createSubteam,
	createTeamWithDefaultSubteam,
	declineInvite,
	declineLinkInvitation,
	deleteSubteam,
	getTeamFullBySlug,
	getTeamMetaBySlug,
	joinTeamByCode,
	leaveTeam,
	listPendingInvitesForUser,
	listPendingLinkInvitesForUser,
	listTeamsForUser,
	promoteToRole,
	removeRosterEntry,
	renameSubteam,
	replaceRosterEntries,
	upsertRosterEntry,
} from "@/lib/server/teams-v2";
import { protectedProcedure, router } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const rosterEntrySchema = z.object({
	eventName: z.string().min(1),
	slotIndex: z.number().int().nonnegative().optional(),
	displayName: z.string().min(1),
	userId: z.string().uuid().optional().nullable(),
});

export const teamsRouter = router({
	listUserTeams: protectedProcedure.query(async ({ ctx }) => {
		try {
			console.log("[TRPC listUserTeams] Request:", { userId: ctx.user.id });
			const teams = await listTeamsForUser(ctx.user.id);
			console.log("[TRPC listUserTeams] Success:", { count: teams.length });
			return { teams };
		} catch (error) {
			console.error("[TRPC listUserTeams] Error:", error);
			throw error;
		}
	}),

	pendingInvites: protectedProcedure.query(async ({ ctx }) => {
		try {
			console.log("[TRPC pendingInvites] Request:", { userId: ctx.user.id });
			const invites = await listPendingInvitesForUser(ctx.user.id);
			console.log("[TRPC pendingInvites] Success:", { count: invites.length });
			return { invites };
		} catch (error) {
			console.error("[TRPC pendingInvites] Error:", error);
			throw error;
		}
	}),

	meta: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				console.log("[TRPC meta] Request:", {
					teamSlug: input.teamSlug,
					userId: ctx.user.id,
				});
				const result = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
				console.log("[TRPC meta] Success:", { teamId: result.teamId });
				return result;
			} catch (error) {
				console.error("[TRPC meta] Error:", error);
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						error instanceof Error ? error.message : "Unable to load team meta",
				});
			}
		}),

	full: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				console.log("[TRPC full] Request:", {
					teamSlug: input.teamSlug,
					userId: ctx.user.id,
				});
				const result = await getTeamFullBySlug(input.teamSlug, ctx.user.id);
				console.log("[TRPC full] Success:", {
					teamId: result.meta.teamId,
					memberCount: result.members.length,
					rosterEntryCount: result.rosterEntries.length,
				});
				return result;
			} catch (error) {
				console.error("[TRPC full] Error:", error);
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						error instanceof Error ? error.message : "Unable to load team data",
				});
			}
		}),

	createTeam: protectedProcedure
		.input(
			z.object({
				school: z.string().min(2),
				division: z.enum(["B", "C"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const created = await createTeamWithDefaultSubteam({
				school: input.school,
				division: input.division,
				createdBy: ctx.user.id,
				supabaseUser: ctx.user,
			});
			return created;
		}),

	joinTeam: protectedProcedure
		.input(z.object({ code: z.string().min(2) }))
		.mutation(async ({ ctx, input }) => {
			const joined = await joinTeamByCode(input.code, ctx.user.id);
			return joined;
		}),

	acceptInvite: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return acceptPendingInvite(input.teamSlug, ctx.user.id);
		}),

	declineInvite: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return declineInvite(input.teamSlug, ctx.user.id);
		}),

	createSubteam: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				name: z.string().optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const subteam = await createSubteam({
				teamSlug: input.teamSlug,
				name: input.name,
				description: input.description,
				userId: ctx.user.id,
			});
			return subteam;
		}),

	deleteSubteam: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return deleteSubteam({
				teamSlug: input.teamSlug,
				subteamId: input.subteamId,
				userId: ctx.user.id,
			});
		}),

	// TODO: Re-implement linkAccount when linkSupabaseAccount is available
	// linkAccount: protectedProcedure
	// 	.input(z.object({ username: z.string().min(2) }))
	// 	.mutation(async ({ ctx, input }) => {
	// 		const result = await linkSupabaseAccount(input.username, ctx.user.id);
	// 		return result;
	// 	}),

	renameSubteam: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid(),
				newName: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return renameSubteam({
				teamSlug: input.teamSlug,
				subteamId: input.subteamId,
				newName: input.newName,
				userId: ctx.user.id,
			});
		}),

	leaveTeam: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return leaveTeam(input.teamSlug, ctx.user.id);
		}),

	archiveTeam: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return archiveTeam(input.teamSlug, ctx.user.id);
		}),

	saveRoster: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid(),
				entries: z.array(rosterEntrySchema),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
			const result = await replaceRosterEntries(
				meta.teamId,
				input.subteamId,
				input.entries.map((entry) => ({
					eventName: entry.eventName,
					slotIndex: entry.slotIndex ?? 0,
					displayName: entry.displayName,
					userId: entry.userId,
				})),
				ctx.user.id,
			);
			return { ok: true, updatedAt: new Date().toISOString(), ...result };
		}),

	upsertRosterEntry: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid().nullable(),
				entry: rosterEntrySchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC upsertRosterEntry] Request:", {
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					entry: input.entry,
					userId: ctx.user.id,
				});

				const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
				console.log("[TRPC upsertRosterEntry] Team meta:", meta);

				await upsertRosterEntry(
					meta.teamId,
					input.subteamId,
					{
						eventName: input.entry.eventName,
						slotIndex: input.entry.slotIndex,
						displayName: input.entry.displayName,
						userId: input.entry.userId,
					},
					ctx.user.id,
				);

				console.log("[TRPC upsertRosterEntry] Success");
				return { ok: true, updatedAt: new Date().toISOString() };
			} catch (error) {
				console.error("[TRPC upsertRosterEntry] Error:", {
					error,
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
				throw error;
			}
		}),

	removeRosterEntry: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid().nullable(),
				eventName: z.string().min(1).optional(),
				slotIndex: z.number().int().nonnegative().default(0),
				removeAllOccurrences: z.boolean().optional(),
				displayName: z.string().min(1).optional(),
				userId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC removeRosterEntry] Request:", {
					input,
					userId: ctx.user.id,
				});
				if (input.removeAllOccurrences && !input.displayName && !input.userId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "displayName or userId is required to remove a member",
					});
				}

				if (!input.removeAllOccurrences && !input.eventName) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "eventName is required when not removing all occurrences",
					});
				}

				const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
				await removeRosterEntry(meta.teamId, ctx.user.id, {
					subteamId: input.subteamId,
					eventName: input.eventName,
					slotIndex: input.slotIndex,
					deleteAllForMember: input.removeAllOccurrences,
					displayName: input.displayName,
					userId: input.userId,
				});
				console.log("[TRPC removeRosterEntry] Success");
				return { ok: true, updatedAt: new Date().toISOString() };
			} catch (error) {
				console.error("[TRPC removeRosterEntry] Error:", error);
				throw error;
			}
		}),

	inviteMember: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				invitedUsername: z.string().min(1),
				role: z.enum(["captain", "member"]).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC inviteMember] Request:", {
					input,
					invitedBy: ctx.user.id,
				});
				const result = await createInvitation({
					teamSlug: input.teamSlug,
					invitedUsername: input.invitedUsername,
					role: input.role,
					invitedBy: ctx.user.id,
				});
				console.log("[TRPC inviteMember] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC inviteMember] Error:", error);
				throw error;
			}
		}),

	promoteToRole: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				userId: z.string().uuid(),
				newRole: z.enum(["captain", "member"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC promoteToRole] Request:", {
					input,
					actorId: ctx.user.id,
				});
				const result = await promoteToRole({
					teamSlug: input.teamSlug,
					userId: input.userId,
					newRole: input.newRole,
					actorId: ctx.user.id,
				});
				console.log("[TRPC promoteToRole] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC promoteToRole] Error:", error);
				throw error;
			}
		}),

	createLinkInvitation: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				rosterDisplayName: z.string().min(1),
				invitedUsername: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC createLinkInvitation] Request:", {
					input,
					invitedBy: ctx.user.id,
				});
				const result = await createLinkInvitation({
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					invitedUsername: input.invitedUsername,
					invitedBy: ctx.user.id,
				});
				console.log("[TRPC createLinkInvitation] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC createLinkInvitation] Error:", error);
				throw error;
			}
		}),

	pendingLinkInvites: protectedProcedure.query(async ({ ctx }) => {
		try {
			console.log("[TRPC pendingLinkInvites] Request:", {
				userId: ctx.user.id,
			});
			const linkInvites = await listPendingLinkInvitesForUser(ctx.user.id);
			console.log("[TRPC pendingLinkInvites] Success:", {
				count: linkInvites.length,
			});
			return { linkInvites };
		} catch (error) {
			console.error("[TRPC pendingLinkInvites] Error:", error);
			throw error;
		}
	}),

	acceptLinkInvite: protectedProcedure
		.input(z.object({ linkInviteId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC acceptLinkInvite] Request:", {
					linkInviteId: input.linkInviteId,
					userId: ctx.user.id,
				});
				const result = await acceptLinkInvitation(
					input.linkInviteId,
					ctx.user.id,
				);
				console.log("[TRPC acceptLinkInvite] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC acceptLinkInvite] Error:", error);
				throw error;
			}
		}),

	declineLinkInvite: protectedProcedure
		.input(z.object({ linkInviteId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC declineLinkInvite] Request:", {
					linkInviteId: input.linkInviteId,
					userId: ctx.user.id,
				});
				const result = await declineLinkInvitation(
					input.linkInviteId,
					ctx.user.id,
				);
				console.log("[TRPC declineLinkInvite] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC declineLinkInvite] Error:", error);
				throw error;
			}
		}),

	cancelLinkInvite: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				rosterDisplayName: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC cancelLinkInvite] Request:", {
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					userId: ctx.user.id,
				});
				const result = await cancelLinkInvitation({
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					userId: ctx.user.id,
				});
				console.log("[TRPC cancelLinkInvite] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC cancelLinkInvite] Error:", error);
				throw error;
			}
		}),
});
