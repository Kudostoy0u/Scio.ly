import {
	acceptLinkInvitation,
	acceptPendingInvite,
	addComment,
	addTimer,
	archiveTeam,
	cancelLinkInvitation,
	createAssignment,
	createInvitation,
	createLinkInvitation,
	createStreamPost,
	createSubteam,
	createTeamWithDefaultSubteam,
	declineInvite,
	declineLinkInvitation,
	deleteAssignment,
	deleteComment,
	deleteStreamPost,
	deleteSubteam,
	getActiveTimers,
	getAssignmentAnalytics,
	getAssignmentDetails,
	getStreamPosts,
	getTeamFullBySlug,
	getTeamMetaBySlug,
	getUpcomingTournaments,
	joinTeamByCode,
	kickMemberFromTeam,
	leaveTeam,
	listAssignments,
	listPendingInvitesForUser,
	listPendingLinkInvitesForUser,
	listTeamsForUser,
	promoteToRole,
	removeRosterEntry,
	removeTimer,
	renameSubteam,
	replaceRosterEntries,
	updateStreamPost,
	upsertRosterEntry,
} from "@/lib/server/teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logging/logger";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const rosterEntrySchema = z.object({
	eventName: z.string().min(1),
	slotIndex: z.number().int().nonnegative().optional(),
	displayName: z.string().min(1),
	userId: z.uuid().optional().nullable(),
});

const assignmentQuestionSchema = z.object({
	questionText: z.string().min(1),
	questionType: z.enum(["multiple_choice", "free_response", "codebusters"]),
	options: z.array(z.string()).optional(),
	correctAnswer: z.string().optional(),
	points: z.number().int().min(1).optional(),
	imageData: z.string().optional().nullable(),
	difficulty: z.number().optional(),
});

const assignmentRosterMemberSchema = z.object({
	studentName: z.string().min(1),
	userId: z.uuid().nullable().optional(),
	displayName: z.string().min(1),
});

export const teamsRouter = router({
	assignments: protectedProcedure
		.input(z.object({ teamSlug: z.string() }))
		.query(async ({ ctx, input }) => {
			return listAssignments(input.teamSlug, ctx.user.id);
		}),

	createAssignment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				dueDate: z.string().optional().nullable(),
				eventName: z.string().optional().nullable(),
				timeLimitMinutes: z.number().int().optional().nullable(),
				points: z.number().int().optional().nullable(),
				isRequired: z.boolean().optional().nullable(),
				maxAttempts: z.number().int().optional().nullable(),
				subteamId: z.uuid().optional().nullable(),
				questions: z.array(assignmentQuestionSchema).optional(),
				rosterMembers: z.array(assignmentRosterMemberSchema).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return createAssignment(input.teamSlug, ctx.user.id, input);
		}),

	deleteAssignment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string(),
				assignmentId: z.uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return deleteAssignment(input.teamSlug, input.assignmentId, ctx.user.id);
		}),

	getAssignmentDetails: protectedProcedure
		.input(z.object({ assignmentId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			return getAssignmentDetails(input.assignmentId, ctx.user.id);
		}),

	getAssignmentAnalytics: protectedProcedure
		.input(z.object({ assignmentId: z.uuid() }))
		.query(async ({ ctx, input }) => {
			return getAssignmentAnalytics(input.assignmentId, ctx.user.id);
		}),

	submitAssignment: protectedProcedure
		.input(
			z.object({
				assignmentId: z.uuid(),
				answers: z.record(z.string(), z.unknown()).optional(),
				score: z.number().optional(),
				totalPoints: z.number().optional(),
				timeSpent: z.number().optional(),
				submittedAt: z.string().optional(),
				isDynamicCodebusters: z.boolean().optional(),
				codebustersPoints: z
					.object({
						totalPointsAttempted: z.number().optional(),
						totalPointsEarned: z.number().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { submitAssignment: submitAssignmentFn } = await import(
				"@/lib/server/teams/assignments"
			);
			return submitAssignmentFn(
				input.assignmentId,
				ctx.user.id,
				ctx.user.email,
				input,
			);
		}),

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
			logger.dev.structured("info", "[TRPC createTeam] Request", {
				userId: ctx.user.id,
				school: input.school,
				division: input.division,
			});

			try {
				const created = await createTeamWithDefaultSubteam({
					school: input.school,
					division: input.division,
					createdBy: ctx.user.id,
					supabaseUser: ctx.user,
				});

				logger.dev.structured("info", "[TRPC createTeam] Success", {
					teamId: created.id,
					slug: created.slug,
				});

				return created;
			} catch (error) {
				logger.dev.error(
					"[TRPC createTeam] Error",
					error instanceof Error ? error : new Error(String(error)),
					{
						userId: ctx.user.id,
						school: input.school,
						division: input.division,
					},
				);
				logger.error("[TRPC createTeam] Error", error);
				throw error;
			}
		}),

	joinTeam: protectedProcedure
		.input(z.object({ code: z.string().min(2) }))
		.mutation(async ({ ctx, input }) => {
			logger.dev.structured("info", "[TRPC joinTeam] Request", {
				userId: ctx.user.id,
				code: input.code,
			});

			try {
				const joined = await joinTeamByCode(input.code, ctx.user.id, ctx.user);

				logger.dev.structured("info", "[TRPC joinTeam] Success", {
					teamId: joined.id,
					slug: joined.slug,
					userId: ctx.user.id,
				});

				return joined;
			} catch (error) {
				logger.dev.error(
					"[TRPC joinTeam] Error",
					error instanceof Error ? error : new Error(String(error)),
					{
						userId: ctx.user.id,
						code: input.code,
					},
				);
				logger.error("[TRPC joinTeam] Error", error);
				throw error;
			}
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
				subteamId: z.uuid(),
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
				subteamId: z.uuid(),
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

	kickMember: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1), userId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC kickMember] Request:", {
					teamSlug: input.teamSlug,
					userId: input.userId,
					actorId: ctx.user.id,
				});
				const result = await kickMemberFromTeam({
					teamSlug: input.teamSlug,
					userId: input.userId,
					actorId: ctx.user.id,
				});
				console.log("[TRPC kickMember] Success:", result);
				return result;
			} catch (error) {
				console.error("[TRPC kickMember] Error:", error);
				throw error;
			}
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
				subteamId: z.uuid(),
				entries: z.array(rosterEntrySchema),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("[TRPC saveRoster] Request:", {
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					entryCount: input.entries.length,
					userId: ctx.user.id,
				});
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
				console.log("[TRPC saveRoster] Success:", {
					conflicts: result.conflicts?.length ?? 0,
					rosterEntries: result.rosterEntries?.length ?? 0,
				});
				return { ok: true, updatedAt: new Date().toISOString(), ...result };
			} catch (error) {
				console.error("[TRPC saveRoster] Error:", error);
				throw error;
			}
		}),

	upsertRosterEntry: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid().nullable(),
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
				subteamId: z.uuid().nullable(),
				eventName: z.string().min(1).optional(),
				slotIndex: z.number().int().nonnegative().default(0),
				removeAllOccurrences: z.boolean().optional(),
				displayName: z.string().min(1).optional(),
				userId: z.uuid().optional(),
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
				userId: z.uuid(),
				newRole: z.enum(["admin", "captain", "member"]),
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
		.input(z.object({ linkInviteId: z.uuid() }))
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
		.input(z.object({ linkInviteId: z.uuid() }))
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

	getStream: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getStreamPosts(input.teamSlug, input.subteamId, ctx.user.id);
		}),

	createPost: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				content: z.string().min(1),
				showTournamentTimer: z.boolean().optional(),
				tournamentId: z.uuid().optional().nullable(),
				attachmentUrl: z.string().url().optional().nullable(),
				attachmentTitle: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return createStreamPost(input.teamSlug, input, ctx.user.id);
		}),

	updatePost: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				postId: z.uuid(),
				content: z.string().min(1),
				attachmentUrl: z.string().url().optional().nullable(),
				attachmentTitle: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return updateStreamPost(input.teamSlug, input, ctx.user.id);
		}),

	deletePost: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				postId: z.uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return deleteStreamPost(input.teamSlug, input.postId, ctx.user.id);
		}),

	addComment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				postId: z.uuid(),
				content: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return addComment(input.teamSlug, input, ctx.user.id);
		}),

	deleteComment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				commentId: z.uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return deleteComment(input.teamSlug, input.commentId, ctx.user.id);
		}),

	getTimers: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getActiveTimers(input.teamSlug, input.subteamId, ctx.user.id);
		}),

	getTournaments: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getUpcomingTournaments(
				input.teamSlug,
				input.subteamId,
				ctx.user.id,
			);
		}),

	addTimer: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				eventId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return addTimer(input.teamSlug, input, ctx.user.id);
		}),

	removeTimer: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				eventId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return removeTimer(input.teamSlug, input, ctx.user.id);
		}),
});
