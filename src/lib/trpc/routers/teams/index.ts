import {
	archiveTeam,
	createSubteam,
	createTeamWithDefaultSubteam,
	getTeamFullBySlug,
	getTeamMetaBySlug,
	joinTeamByCode,
	leaveTeam,
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
	slotIndex: z.number().int().nonnegative().default(0),
	displayName: z.string().min(1),
	userId: z.string().uuid().optional().nullable(),
});

export const teamsRouter = router({
	listUserTeams: protectedProcedure.query(async ({ ctx }) => {
		const teams = await listTeamsForUser(ctx.user.id);
		return { teams };
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
			});
			return created;
		}),

	joinTeam: protectedProcedure
		.input(z.object({ code: z.string().min(2) }))
		.mutation(async ({ ctx, input }) => {
			const joined = await joinTeamByCode(input.code, ctx.user.id);
			return joined;
		}),

	createSubteam: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				name: z.string().min(1),
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
					slotIndex: entry.slotIndex,
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
