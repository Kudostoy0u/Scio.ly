import {
	acceptLinkInvitation,
	acceptPendingInvite,
	addComment,
	addTimer,
	archiveTeam,
	cancelPendingInvite,
	cancelLinkInvitation,
	createAssignment,
	createCalendarEvent,
	createInvitation,
	createLinkInvitation,
	createStreamPost,
	createSubteam,
	createTeamWithDefaultSubteam,
	declineInvite,
	declineLinkInvitation,
	deleteAssignment,
	deleteCalendarEvent,
	deleteComment,
	deleteStreamPost,
	deleteSubteam,
	getActiveTimers,
	getAssignmentAnalytics,
	getAssignmentDetails,
	getCalendarManifest,
	getRemovedEvents,
	getRoster,
	getRosterLinkStatus,
	getRosterNotes,
	getStreamPosts,
	getSubteams,
	getTeamCacheManifest,
	getTeamCodes,
	getTeamFullBySlug,
	getTeamMetaBySlug,
	getUpcomingTournaments,
	joinTeamByCode,
	kickMemberFromTeam,
	leaveTeam,
	listAssignments,
	listPendingInvitesForUser,
	listPendingLinkInvitesForUser,
	listPersonalCalendarEvents,
	listTeamCalendarEvents,
	listTeamsForUser,
	listTeamsWithSubteamsForUser,
	promoteToRole,
	removeRosterEntry,
	removeTimer,
	renameSubteam,
	replaceRosterEntries,
	restoreRemovedEvents,
	skipCalendarOccurrence,
	updateCalendarEvent,
	updateRemovedEvents,
	updateRosterNotes,
	updateStreamPost,
	updateSubteam,
	upsertRosterEntry,
} from "@/lib/server/teams";
import { ensureSupabaseLink } from "@/lib/server/teams/shared";
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

const calendarEventSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	startTime: z.string().min(1),
	endTime: z.string().optional().nullable(),
	location: z.string().optional().nullable(),
	eventType: z
		.enum([
			"practice",
			"tournament",
			"meeting",
			"deadline",
			"other",
			"personal",
		])
		.optional()
		.nullable(),
	isAllDay: z.boolean().optional().nullable(),
	isRecurring: z.boolean().optional().nullable(),
	recurrencePattern: z.record(z.string(), z.unknown()).optional().nullable(),
	meetingType: z.enum(["personal", "team"]),
	teamId: z.string().optional().nullable(),
	subteamId: z.string().optional().nullable(),
});

export const teamsRouter = router({
	cacheManifest: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				const manifest = await getTeamCacheManifest(
					input.teamSlug,
					ctx.user.id,
				);
				return manifest;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (message.toLowerCase().includes("team not found")) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Team not found",
					});
				}
				if (message.toLowerCase().includes("access denied")) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Access denied",
					});
				}
				throw error;
			}
		}),

	calendarManifest: protectedProcedure.query(async ({ ctx }) => {
		try {
			logger.dev.structured("info", "[TRPC calendarManifest] Request", {
				userId: ctx.user.id,
				email: ctx.user.email ?? null,
			});
			await ensureSupabaseLink(ctx.user);
			const manifest = await getCalendarManifest(ctx.user.id);
			logger.dev.structured("info", "[TRPC calendarManifest] Success", {
				userId: ctx.user.id,
				teamCount: manifest.teams.length,
			});
			return manifest;
		} catch (error) {
			logger.dev.error(
				"[TRPC calendarManifest] Error",
				error instanceof Error ? error : new Error(String(error)),
				{ userId: ctx.user.id },
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to load calendar manifest",
			});
		}
	}),

	personalCalendarEvents: protectedProcedure
		.input(
			z.object({
				startDate: z.string().optional(),
				endDate: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return listPersonalCalendarEvents({
				userId: ctx.user.id,
				startDate: input.startDate,
				endDate: input.endDate,
			});
		}),

	teamCalendarEvents: protectedProcedure
		.input(
			z.object({
				teamIds: z.array(z.uuid()),
				startDate: z.string().optional(),
				endDate: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return listTeamCalendarEvents({
				userId: ctx.user.id,
				teamIds: input.teamIds,
				startDate: input.startDate,
				endDate: input.endDate,
			});
		}),

	createCalendarEvent: protectedProcedure
		.input(calendarEventSchema)
		.mutation(async ({ ctx, input }) => {
			return createCalendarEvent({ userId: ctx.user.id, ...input });
		}),

	updateCalendarEvent: protectedProcedure
		.input(
			calendarEventSchema
				.extend({
					eventId: z.uuid(),
				})
				.partial()
				.required({ eventId: true }),
		)
		.mutation(async ({ ctx, input }) => {
			const { eventId, ...updateData } = input;
			return updateCalendarEvent({
				userId: ctx.user.id,
				eventId,
				...updateData,
			});
		}),

	deleteCalendarEvent: protectedProcedure
		.input(z.object({ eventId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			return deleteCalendarEvent({ userId: ctx.user.id, ...input });
		}),

	skipCalendarOccurrence: protectedProcedure
		.input(z.object({ eventId: z.uuid(), occurrenceDate: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return skipCalendarOccurrence({ userId: ctx.user.id, ...input });
		}),

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

	generateQuestions: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string(),
				event_name: z.string().min(1),
				question_count: z.number().int().min(1).max(100),
				question_types: z
					.array(z.enum(["multiple_choice", "free_response"]))
					.min(1),
				division: z.string().optional(),
				id_percentage: z.number().int().min(0).max(100).optional(),
				pure_id_only: z.boolean().optional(),
				difficulties: z.array(z.string()).optional(),
				subtopics: z.array(z.string()).optional(),
				rm_type_filter: z.enum(["rock", "mineral"]).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { generateQuestionsForAssignment } = await import(
				"@/lib/server/questions/generate"
			);
			const { assertCaptainAccess } = await import("@/lib/server/teams/shared");

			await assertCaptainAccess(input.teamSlug, ctx.user.id);

			const questionType: "mcq" | "frq" | "both" =
				input.question_types.length === 2
					? "both"
					: input.question_types[0] === "multiple_choice"
						? "mcq"
						: "frq";

			const questions = await generateQuestionsForAssignment({
				eventName: input.event_name,
				questionCount: input.question_count,
				questionType,
				division: input.division || "any",
				idPercentage: input.id_percentage || 0,
				pureIdOnly: input.pure_id_only || false,
				difficulties: input.difficulties || ["any"],
				rmTypeFilter: input.rm_type_filter,
				subtopics: input.subtopics,
			});

			// Format questions for assignment (convert from practice format to assignment format)
			const formattedQuestions = questions.map((q, index) => {
				const isMcq = Array.isArray(q.options) && q.options.length > 0;
				const answers = Array.isArray(q.answers) ? q.answers : [];

				return {
					question_text: q.question || "",
					question_type: isMcq ? "multiple_choice" : "free_response",
					options: isMcq ? q.options : undefined,
					answers: answers,
					points: 1,
					order_index: index,
					difficulty: typeof q.difficulty === "number" ? q.difficulty : 0.5,
					imageData: q.imageData || null,
				};
			});

			if (formattedQuestions.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No valid questions found for this event",
				});
			}

			return {
				questions: formattedQuestions,
				metadata: {
					eventName: input.event_name,
					questionCount: formattedQuestions.length,
				},
			};
		}),

	createCodebustersAssignment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string(),
				subteamId: z.uuid().optional().nullable(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				due_date: z.string().optional().nullable(),
				points: z.number().int().optional().nullable(),
				time_limit_minutes: z.number().int().optional().nullable(),
				event_name: z.string().optional().nullable(),
				roster_members: z
					.array(assignmentRosterMemberSchema)
					.optional()
					.default([]),
				codebusters_params: z.object({
					questionCount: z.number().int().min(1).max(50),
					cipherTypes: z.array(z.string()).optional().default([]),
					division: z.enum(["B", "C", "any"]).optional().default("any"),
					charLengthMin: z.number().int().min(1).optional(),
					charLengthMax: z.number().int().min(1).optional(),
				}),
				codebusters_questions: z
					.array(
						z.object({
							author: z.string(),
							quote: z.string(),
							cipherType: z.string(),
							division: z.string().optional(),
							charLength: z.number().int().optional(),
							encrypted: z.string(),
							key: z.string().optional().nullable(),
							kShift: z.number().int().optional(),
							plainAlphabet: z.string().optional(),
							cipherAlphabet: z.string().optional(),
							matrix: z.array(z.array(z.number())).optional(),
							decryptionMatrix: z.array(z.array(z.number())).optional(),
							portaKeyword: z.string().optional(),
							nihilistPolybiusKey: z.string().optional(),
							nihilistCipherKey: z.string().optional(),
							checkerboardRowKey: z.string().optional(),
							checkerboardColKey: z.string().optional(),
							checkerboardPolybiusKey: z.string().optional(),
							checkerboardUsesIJ: z.boolean().optional(),
							blockSize: z.number().int().optional(),
							columnarKey: z.string().optional(),
							fractionationTable: z.record(z.string(), z.string()).optional(),
							caesarShift: z.number().int().optional(),
							affineA: z.number().int().optional(),
							affineB: z.number().int().optional(),
							baconianBinaryType: z.string().optional(),
							cryptarithmData: z.unknown().optional(),
							askForKeyword: z.boolean().optional(),
							points: z.number().optional(),
							difficulty: z.number().optional(),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { createCodebustersAssignment: createCodebustersAssignmentFn } =
				await import("@/lib/server/teams/codebusters-assignments");
			// Transform roster_members from { studentName, userId, displayName } to RosterMemberSchema format
			const transformedRosterMembers = input.roster_members.map((member) => {
				if (member.userId) {
					return {
						user_id: member.userId,
						student_name: member.studentName,
						display_name: member.displayName,
					};
				}
				return member.studentName;
			});
			// Transform codebusters_questions to match the expected schema (handle cryptarithmData)
			const transformedQuestions = input.codebusters_questions?.map((q) => ({
				...q,
				cryptarithmData:
					q.cryptarithmData && typeof q.cryptarithmData === "object"
						? (q.cryptarithmData as {
								equation: string;
								numericExample?: string | null;
								digitGroups: { digits: string; word: string }[];
							})
						: undefined,
			}));
			return createCodebustersAssignmentFn(
				input.teamSlug,
				input.subteamId || null,
				ctx.user.id,
				{
					...input,
					roster_members: transformedRosterMembers,
					codebusters_questions: transformedQuestions,
				},
			);
		}),

	declineAssignment: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string(),
				assignmentId: z.uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { declineAssignment: declineAssignmentFn } = await import(
				"@/lib/server/teams/assignments"
			);
			return declineAssignmentFn(input.assignmentId, ctx.user.id);
		}),

	listUserTeams: protectedProcedure.query(async ({ ctx }) => {
		try {
			logger.log("[TRPC listUserTeams] Request:", { userId: ctx.user.id });
			const teams = await listTeamsForUser(ctx.user.id);
			logger.log("[TRPC listUserTeams] Success:", { count: teams.length });
			return { teams };
		} catch (error) {
			logger.error("[TRPC listUserTeams] Error:", error);
			throw error;
		}
	}),

	listUserTeamsWithSubteams: protectedProcedure.query(async ({ ctx }) => {
		try {
			logger.log("[TRPC listUserTeamsWithSubteams] Request:", {
				userId: ctx.user.id,
			});
			const teams = await listTeamsWithSubteamsForUser(ctx.user.id);
			logger.log("[TRPC listUserTeamsWithSubteams] Success:", {
				count: teams.length,
			});
			return { teams };
		} catch (error) {
			logger.error("[TRPC listUserTeamsWithSubteams] Error:", error);
			throw error;
		}
	}),

	pendingInvites: protectedProcedure.query(async ({ ctx }) => {
		try {
			logger.log("[TRPC pendingInvites] Request:", { userId: ctx.user.id });
			const invites = await listPendingInvitesForUser(ctx.user.id);
			logger.log("[TRPC pendingInvites] Success:", { count: invites.length });
			return { invites };
		} catch (error) {
			logger.error("[TRPC pendingInvites] Error:", error);
			throw error;
		}
	}),

	meta: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				logger.log("[TRPC meta] Request:", {
					teamSlug: input.teamSlug,
					userId: ctx.user.id,
				});
				const result = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
				logger.log("[TRPC meta] Success:", { teamId: result.teamId });
				return result;
			} catch (error) {
				logger.error("[TRPC meta] Error:", error);
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
				logger.log("[TRPC full] Request:", {
					teamSlug: input.teamSlug,
					userId: ctx.user.id,
				});
				const result = await getTeamFullBySlug(input.teamSlug, ctx.user.id);
				logger.log("[TRPC full] Success:", {
					teamId: result.meta.teamId,
					memberCount: result.members.length,
					rosterEntryCount: result.rosterEntries.length,
				});
				return result;
			} catch (error) {
				logger.error("[TRPC full] Error:", error);
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

	cancelInvite: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				invitedUserId: z.uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return cancelPendingInvite({
				teamSlug: input.teamSlug,
				invitedUserId: input.invitedUserId,
				actorId: ctx.user.id,
			});
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
				logger.log("[TRPC kickMember] Request:", {
					teamSlug: input.teamSlug,
					userId: input.userId,
					actorId: ctx.user.id,
				});
				const result = await kickMemberFromTeam({
					teamSlug: input.teamSlug,
					userId: input.userId,
					actorId: ctx.user.id,
				});
				logger.log("[TRPC kickMember] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC kickMember] Error:", error);
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
				logger.log("[TRPC saveRoster] Request:", {
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
				logger.log("[TRPC saveRoster] Success:", {
					conflicts: result.conflicts?.length ?? 0,
					rosterEntries: result.rosterEntries?.length ?? 0,
				});
				return { ok: true, updatedAt: new Date().toISOString(), ...result };
			} catch (error) {
				logger.error("[TRPC saveRoster] Error:", error);
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
				logger.log("[TRPC upsertRosterEntry] Request:", {
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					entry: input.entry,
					userId: ctx.user.id,
				});

				const meta = await getTeamMetaBySlug(input.teamSlug, ctx.user.id);
				logger.log("[TRPC upsertRosterEntry] Team meta:", meta);

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

				logger.log("[TRPC upsertRosterEntry] Success");
				return { ok: true, updatedAt: new Date().toISOString() };
			} catch (error) {
				logger.error("[TRPC upsertRosterEntry] Error:", {
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
				logger.log("[TRPC removeRosterEntry] Request:", {
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
				logger.log("[TRPC removeRosterEntry] Success");
				return { ok: true, updatedAt: new Date().toISOString() };
			} catch (error) {
				logger.error("[TRPC removeRosterEntry] Error:", error);
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
				logger.log("[TRPC inviteMember] Request:", {
					input,
					invitedBy: ctx.user.id,
				});
				const result = await createInvitation({
					teamSlug: input.teamSlug,
					invitedUsername: input.invitedUsername,
					role: input.role,
					invitedBy: ctx.user.id,
				});
				logger.log("[TRPC inviteMember] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC inviteMember] Error:", error);
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
				logger.log("[TRPC promoteToRole] Request:", {
					input,
					actorId: ctx.user.id,
				});
				const result = await promoteToRole({
					teamSlug: input.teamSlug,
					userId: input.userId,
					newRole: input.newRole,
					actorId: ctx.user.id,
				});
				logger.log("[TRPC promoteToRole] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC promoteToRole] Error:", error);
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
				logger.log("[TRPC createLinkInvitation] Request:", {
					input,
					invitedBy: ctx.user.id,
				});
				const result = await createLinkInvitation({
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					invitedUsername: input.invitedUsername,
					invitedBy: ctx.user.id,
				});
				logger.log("[TRPC createLinkInvitation] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC createLinkInvitation] Error:", error);
				throw error;
			}
		}),

	pendingLinkInvites: protectedProcedure.query(async ({ ctx }) => {
		try {
			logger.log("[TRPC pendingLinkInvites] Request:", {
				userId: ctx.user.id,
			});
			const linkInvites = await listPendingLinkInvitesForUser(ctx.user.id);
			logger.log("[TRPC pendingLinkInvites] Success:", {
				count: linkInvites.length,
			});
			return { linkInvites };
		} catch (error) {
			logger.error("[TRPC pendingLinkInvites] Error:", error);
			throw error;
		}
	}),

	acceptLinkInvite: protectedProcedure
		.input(z.object({ linkInviteId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			try {
				logger.log("[TRPC acceptLinkInvite] Request:", {
					linkInviteId: input.linkInviteId,
					userId: ctx.user.id,
				});
				const result = await acceptLinkInvitation(
					input.linkInviteId,
					ctx.user.id,
				);
				logger.log("[TRPC acceptLinkInvite] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC acceptLinkInvite] Error:", error);
				throw error;
			}
		}),

	declineLinkInvite: protectedProcedure
		.input(z.object({ linkInviteId: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			try {
				logger.log("[TRPC declineLinkInvite] Request:", {
					linkInviteId: input.linkInviteId,
					userId: ctx.user.id,
				});
				const result = await declineLinkInvitation(
					input.linkInviteId,
					ctx.user.id,
				);
				logger.log("[TRPC declineLinkInvite] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC declineLinkInvite] Error:", error);
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
				logger.log("[TRPC cancelLinkInvite] Request:", {
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					userId: ctx.user.id,
				});
				const result = await cancelLinkInvitation({
					teamSlug: input.teamSlug,
					rosterDisplayName: input.rosterDisplayName,
					userId: ctx.user.id,
				});
				logger.log("[TRPC cancelLinkInvite] Success:", result);
				return result;
			} catch (error) {
				logger.error("[TRPC cancelLinkInvite] Error:", error);
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
			const startTime = Date.now();
			logger.dev.structured("info", "[TRPC getStream] Request", {
				userId: ctx.user.id,
				teamSlug: input.teamSlug,
				subteamId: input.subteamId,
			});

			try {
				const result = await getStreamPosts(
					input.teamSlug,
					input.subteamId,
					ctx.user.id,
				);
				const duration = Date.now() - startTime;
				logger.dev.structured("info", "[TRPC getStream] Success", {
					userId: ctx.user.id,
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					postCount: result.length,
					duration: `${duration}ms`,
				});
				return result;
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.dev.error(
					"[TRPC getStream] Error",
					error instanceof Error ? error : new Error(String(error)),
					{
						userId: ctx.user.id,
						teamSlug: input.teamSlug,
						subteamId: input.subteamId,
						duration: `${duration}ms`,
					},
				);
				throw error;
			}
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
			const startTime = Date.now();
			logger.dev.structured("info", "[TRPC getTimers] Request", {
				userId: ctx.user.id,
				teamSlug: input.teamSlug,
				subteamId: input.subteamId,
			});

			try {
				const result = await getActiveTimers(
					input.teamSlug,
					input.subteamId,
					ctx.user.id,
				);
				const duration = Date.now() - startTime;
				logger.dev.structured("info", "[TRPC getTimers] Success", {
					userId: ctx.user.id,
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					timerCount: result.length,
					duration: `${duration}ms`,
				});
				return result;
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.dev.error(
					"[TRPC getTimers] Error",
					error instanceof Error ? error : new Error(String(error)),
					{
						userId: ctx.user.id,
						teamSlug: input.teamSlug,
						subteamId: input.subteamId,
						duration: `${duration}ms`,
					},
				);
				throw error;
			}
		}),

	getTournaments: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const startTime = Date.now();
			logger.dev.structured("info", "[TRPC getTournaments] Request", {
				userId: ctx.user.id,
				teamSlug: input.teamSlug,
				subteamId: input.subteamId,
			});

			try {
				const result = await getUpcomingTournaments(
					input.teamSlug,
					input.subteamId,
					ctx.user.id,
				);
				const duration = Date.now() - startTime;
				logger.dev.structured("info", "[TRPC getTournaments] Success", {
					userId: ctx.user.id,
					teamSlug: input.teamSlug,
					subteamId: input.subteamId,
					tournamentCount: result.length,
					duration: `${duration}ms`,
				});
				return result;
			} catch (error) {
				const duration = Date.now() - startTime;
				logger.dev.error(
					"[TRPC getTournaments] Error",
					error instanceof Error ? error : new Error(String(error)),
					{
						userId: ctx.user.id,
						teamSlug: input.teamSlug,
						subteamId: input.subteamId,
						duration: `${duration}ms`,
					},
				);
				throw error;
			}
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

	listArchivedTeams: protectedProcedure.query(async ({ ctx }) => {
		const { teamsService } = await import("@/lib/services/teams");
		const teams = await teamsService.getUserArchivedTeams(ctx.user.id);
		return { teams };
	}),

	deleteTeam: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			// archiveTeam actually deletes the team
			return archiveTeam(input.teamSlug, ctx.user.id);
		}),

	getCodes: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			return getTeamCodes(input.teamSlug, ctx.user.id);
		}),

	getRemovedEvents: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getRemovedEvents(input.teamSlug, input.subteamId, ctx.user.id);
		}),

	updateRemovedEvents: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				eventName: z.string().min(1).max(100),
				conflictBlock: z.string().min(1).max(50),
				mode: z.enum(["remove", "add"]).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return updateRemovedEvents(
				input.teamSlug,
				input.subteamId,
				input.eventName,
				input.conflictBlock,
				input.mode ?? "remove",
				ctx.user.id,
			);
		}),

	restoreRemovedEvents: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				conflictBlock: z.string().min(1).max(50),
				mode: z.enum(["restore", "reset"]).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return restoreRemovedEvents(
				input.teamSlug,
				input.subteamId,
				input.conflictBlock,
				input.mode ?? "restore",
				ctx.user.id,
			);
		}),

	getRoster: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid().nullable().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getRoster(input.teamSlug, input.subteamId ?? null, ctx.user.id);
		}),

	getRosterLinkStatus: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid().nullable().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getRosterLinkStatus(
				input.teamSlug,
				input.subteamId ?? null,
				ctx.user.id,
			);
		}),

	getSubteams: protectedProcedure
		.input(z.object({ teamSlug: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			return getSubteams(input.teamSlug, ctx.user.id);
		}),

	updateSubteam: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				name: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return updateSubteam(
				input.teamSlug,
				input.subteamId,
				input.name,
				ctx.user.id,
			);
		}),

	getRosterNotes: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getRosterNotes(input.teamSlug, input.subteamId, ctx.user.id);
		}),

	updateRosterNotes: protectedProcedure
		.input(
			z.object({
				teamSlug: z.string().min(1),
				subteamId: z.uuid(),
				notes: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return updateRosterNotes(
				input.teamSlug,
				input.subteamId,
				input.notes,
				ctx.user.id,
			);
		}),

	submitLegacyAssignment: protectedProcedure
		.input(
			z.object({
				assignmentId: z.number().int().positive(),
				userId: z.uuid().nullable().optional(),
				name: z.string().nullable().optional(),
				eventName: z.string().nullable().optional(),
				score: z.number().nullable().optional(),
				detail: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { submitLegacyAssignment: submitLegacyAssignmentFn } = await import(
				"@/lib/server/teams"
			);
			return submitLegacyAssignmentFn(
				input.assignmentId,
				input.userId ?? null,
				input.name ?? null,
				input.eventName ?? null,
				input.score ?? null,
				input.detail ?? null,
			);
		}),
});
