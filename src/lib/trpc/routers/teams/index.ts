import {
	acceptPendingInvite,
	archiveTeam,
	createSubteam,
	createTeamWithDefaultSubteam,
	declineInvite,
	deleteSubteam,
	getTeamFullBySlug,
	getTeamMetaBySlug,
	joinTeamByCode,
	leaveTeam,
	linkSupabaseAccount,
	listPendingInvitesForUser,
	listTeamsForUser,
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
		const teams = await listTeamsForUser(ctx.user.id);
		return { teams };
	}),

	pendingInvites: protectedProcedure.query(async ({ ctx }) => {
		const invites = await listPendingInvitesForUser(ctx.user.id);
		return { invites };
	}),

	meta: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				return await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
			} catch (error) {
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
				return await getTeamFullBySlug(input.teamSlug, ctx.user.id);
			} catch (error) {
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

	linkAccount: protectedProcedure
		.input(z.object({ username: z.string().min(2) }))
		.mutation(async ({ ctx, input }) => {
			const result = await linkSupabaseAccount(input.username, ctx.user.id);
			return result;
		}),

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
			await replaceRosterEntries(
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
			return { ok: true, updatedAt: new Date().toISOString() };
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
			const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
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
			return { ok: true, updatedAt: new Date().toISOString() };
		}),

	removeRosterEntry: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.string().uuid().nullable(),
				eventName: z.string().min(1),
				slotIndex: z.number().int().nonnegative().default(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
			await removeRosterEntry(
				meta.teamId,
				input.subteamId,
				input.eventName,
				input.slotIndex,
				ctx.user.id,
			);
			return { ok: true, updatedAt: new Date().toISOString() };
		}),
});
