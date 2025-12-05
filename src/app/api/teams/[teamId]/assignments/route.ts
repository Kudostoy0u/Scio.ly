import { dbPg } from "@/lib/db";
import {
	newTeamAssignmentQuestions,
	newTeamAssignmentRoster,
	newTeamAssignmentSubmissions,
	newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { AssignmentQuestionSchema } from "@/lib/schemas/question";
import {
	PostAssignmentRequestSchema,
	validateRequest,
} from "@/lib/schemas/teams-validation";
// import logger from "@/lib/utils/logger";
import { getServerUser } from "@/lib/supabaseServer";
import { parseDifficulty } from "@/lib/types/difficulty";
import {
	handleError,
	handleForbiddenError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/error-handler";
import { hasLeadershipAccessCockroach } from "@/lib/utils/team-auth-v2";
import {
	getUserTeamMemberships,
	resolveTeamSlugToUnits,
} from "@/lib/utils/team-resolver";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/assignments - Get team assignments
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchAssignments)
// - src/app/hooks/useEnhancedTeamData.ts (fetchAssignments)
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	// const startTime = Date.now();
	// Development logging can be added here if needed

	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
			);
		}

		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { teamId } = await params;

		// Resolve team slug to team units
		const teamInfo = await resolveTeamSlugToUnits(teamId);

		// Check if user is member of any team unit in this group
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.teamUnitIds,
		);

		if (memberships.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		// Get assignments with creator information for all team units in this group using Drizzle ORM
		const assignmentsResult = await dbPg
			.select({
				id: newTeamAssignments.id,
				title: newTeamAssignments.title,
				description: newTeamAssignments.description,
				assignmentType: newTeamAssignments.assignmentType,
				dueDate: newTeamAssignments.dueDate,
				points: newTeamAssignments.points,
				isRequired: newTeamAssignments.isRequired,
				maxAttempts: newTeamAssignments.maxAttempts,
				timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
				createdAt: newTeamAssignments.createdAt,
				updatedAt: newTeamAssignments.updatedAt,
				creatorEmail: users.email,
				creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			})
			.from(newTeamAssignments)
			.innerJoin(users, eq(newTeamAssignments.createdBy, users.id))
			.where(inArray(newTeamAssignments.teamId, teamInfo.teamUnitIds))
			.orderBy(
				asc(newTeamAssignments.dueDate),
				desc(newTeamAssignments.createdAt),
			);

		// Get submission status for each assignment using Drizzle ORM
		const assignmentsWithSubmissions = await Promise.all(
			assignmentsResult.map(async (assignment) => {
				// Get user's submission using Drizzle ORM
				const submissionResult = await dbPg
					.select({
						status: newTeamAssignmentSubmissions.status,
						submittedAt: newTeamAssignmentSubmissions.submittedAt,
						grade: newTeamAssignmentSubmissions.grade,
						attemptNumber: newTeamAssignmentSubmissions.attemptNumber,
					})
					.from(newTeamAssignmentSubmissions)
					.where(
						and(
							eq(newTeamAssignmentSubmissions.assignmentId, assignment.id),
							eq(newTeamAssignmentSubmissions.userId, user.id),
						),
					)
					.orderBy(desc(newTeamAssignmentSubmissions.submittedAt))
					.limit(1);

				// Get roster information using Drizzle ORM
				const rosterResult = await dbPg
					.select({
						student_name: newTeamAssignmentRoster.studentName,
						user_id: newTeamAssignmentRoster.userId,
						email: users.email,
						username: users.username,
						display_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
					})
					.from(newTeamAssignmentRoster)
					.leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
					.where(eq(newTeamAssignmentRoster.assignmentId, assignment.id))
					.orderBy(newTeamAssignmentRoster.studentName);

				// Get submission counts using Drizzle ORM (include both 'submitted' and 'graded' statuses)
				const submissionCountResult = await dbPg
					.select({ submittedCount: sql<number>`COUNT(*)` })
					.from(newTeamAssignmentSubmissions)
					.where(
						and(
							eq(newTeamAssignmentSubmissions.assignmentId, assignment.id),
							inArray(newTeamAssignmentSubmissions.status, [
								"submitted",
								"graded",
							]),
						),
					);

				const rosterCount = rosterResult.length;
				const submittedCount = Number.parseInt(
					String(submissionCountResult[0]?.submittedCount || 0),
					10,
				);

				return {
					id: assignment.id,
					title: assignment.title,
					description: assignment.description,
					assignment_type: assignment.assignmentType,
					due_date: assignment.dueDate ? String(assignment.dueDate) : null,
					points: assignment.points,
					is_required: assignment.isRequired,
					max_attempts: assignment.maxAttempts,
					time_limit_minutes: assignment.timeLimitMinutes,
					created_at: assignment.createdAt
						? String(assignment.createdAt)
						: new Date().toISOString(),
					updated_at: assignment.updatedAt
						? String(assignment.updatedAt)
						: new Date().toISOString(),
					creator_email: assignment.creatorEmail,
					creator_name: assignment.creatorName,
					user_submission: submissionResult[0]
						? {
								status: submissionResult[0].status,
								submitted_at: submissionResult[0].submittedAt
									? String(submissionResult[0].submittedAt)
									: new Date().toISOString(),
								grade: submissionResult[0].grade,
								attempt_number: submissionResult[0].attemptNumber,
							}
						: null,
					roster: rosterResult,
					roster_count: rosterCount,
					submitted_count: submittedCount,
				};
			}),
		);

		return NextResponse.json({ assignments: assignmentsWithSubmissions });
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/assignments");
	}
}

// POST /api/teams/[teamId]/assignments - Create new assignment
// Frontend Usage:
// - src/app/teams/components/assignment/assignmentUtils.ts (createAssignment)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const envError = validateEnvironment();
		if (envError) {
			return envError;
		}

		const user = await getServerUser();
		if (!user?.id) {
			return handleUnauthorizedError();
		}

		const { teamId } = await params;
		let body: unknown;
		try {
			body = await request.json();
		} catch (_error) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Invalid JSON in request body",
						path: [],
					},
				]),
			);
		}

		// Validate request body using Zod
		let validatedBody: z.infer<typeof PostAssignmentRequestSchema>;
		try {
			validatedBody = validateRequest(PostAssignmentRequestSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"POST /api/teams/[teamId]/assignments - validation",
			);
		}

		const {
			// subteamId,
			title,
			description,
			assignmentType = "task",
			dueDate,
			isRequired = true,
			maxAttempts,
			questions,
			// rosterMembers,
		} = validatedBody;

		// Resolve team slug to team units
		const teamInfo = await resolveTeamSlugToUnits(teamId);

		// Check if user has leadership privileges in this team group (including team creator)
		const hasLeadership = await hasLeadershipAccessCockroach(
			user.id,
			teamInfo.groupId,
		);
		if (!hasLeadership) {
			return handleForbiddenError(
				"Only captains and co-captains can create assignments",
			);
		}

		// Create the assignment for the first team unit (or the one the user is captain of)
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.teamUnitIds,
		);
		const captainMembership = memberships.find((m) =>
			["captain", "co_captain"].includes(m.role),
		);
		const targetTeamId = captainMembership?.team_id || teamInfo.teamUnitIds[0];
		if (!targetTeamId) {
			return NextResponse.json(
				{ error: "No valid team unit found" },
				{ status: 400 },
			);
		}

		// Create assignment using Drizzle ORM
		const [assignment] = await dbPg
			.insert(newTeamAssignments)
			.values({
				teamId: targetTeamId,
				assignmentType: assignmentType,
				dueDate: dueDate ? new Date(dueDate).toISOString() : null,
				isRequired: isRequired,
				maxAttempts: maxAttempts || null,
				createdBy: user.id,
				title,
				description,
			} as typeof newTeamAssignments.$inferInsert)
			.returning();

		/**
		 * Save assignment questions to database
		 *
		 * Frontend to Backend Conversion:
		 * - Frontend sends: { answers: [0], question_text: "...", question_type: "multiple_choice", options: [...] }
		 * - Backend stores: { correct_answer: "A", question_text: "...", question_type: "multiple_choice", options: "[...]" }
		 *
		 * CRITICAL VALIDATION: All questions MUST have a valid answers array before being saved.
		 * Questions without valid answers are REJECTED with a detailed error.
		 */
		if (questions && Array.isArray(questions) && questions.length > 0) {
			let validatedQuestions: z.infer<typeof AssignmentQuestionSchema>[];
			try {
				validatedQuestions = questions.map((q, index) => {
					try {
						return AssignmentQuestionSchema.parse(q);
					} catch (error) {
						if (error instanceof z.ZodError) {
							const errorMessages = error.issues?.map(
								(err) => `${err.path.join(".")}: ${err.message}`,
							) || ["Unknown validation error"];
							throw new Error(
								`Question ${index + 1} validation failed:\n${errorMessages.join("\n")}`,
							);
						}
						throw error;
					}
				});
			} catch (error) {
				return NextResponse.json(
					{
						error: "Invalid questions provided",
						details:
							error instanceof Error
								? error.message
								: "Unknown validation error",
					},
					{ status: 400 },
				);
			}

			const assignmentId = assignment?.id;
			if (!assignmentId) {
				return NextResponse.json(
					{ error: "Failed to create assignment record" },
					{ status: 500 },
				);
			}
			const questionInserts = validatedQuestions.map((q, index: number) => {
				/**
				 * Validate question has required fields
				 */
				if (!q.question_text || q.question_text.trim() === "") {
					throw new Error(`Question ${index + 1} is missing question_text`);
				}

				if (!q.question_type) {
					throw new Error(`Question ${index + 1} is missing question_type`);
				}

				/**
				 * CRITICAL: Validate answers field
				 *
				 * Every question MUST have a valid, non-empty answers array.
				 * This is the source of truth for grading.
				 */
				if (
					!(q.answers && Array.isArray(q.answers)) ||
					q.answers.length === 0
				) {
					// Error details for debugging (unused but kept for potential logging)
					// biome-ignore lint/complexity/noVoid: Intentional void for debugging info
					void {
						questionNumber: index + 1,
						questionText: q.question_text?.substring(0, 100),
						questionType: q.question_type,
						hasAnswers: !!q.answers,
						answersType: typeof q.answers,
						answersValue: q.answers,
					};

					throw new Error(
						`Cannot create assignment: Question ${index + 1} has no valid answers. Question: "${q.question_text?.substring(0, 50)}..." All questions must have a valid answers array before being saved.`,
					);
				}

				/**
				 * Convert frontend answers format to database format
				 *
				 * Frontend: answers = [0] (numeric indices for MCQ)
				 * Database: correct_answer = "A" (letter for MCQ)
				 *
				 * Frontend: answers = ["Paris"] (strings for FRQ)
				 * Database: correct_answer = "Paris" (string for FRQ)
				 */
				let correctAnswer: string | null = null;

				if (q.question_type === "multiple_choice") {
					// Convert numeric indices back to letters for database storage
					correctAnswer = q.answers
						.map((ans) => {
							if (typeof ans !== "number" || ans < 0) {
								throw new Error(
									`Invalid answer index ${ans} for question ${index + 1}`,
								);
							}
							return String.fromCharCode(65 + ans);
						})
						.join(",");
				} else {
					// For FRQ/Codebusters, store answers as-is
					correctAnswer = q.answers.map((ans) => String(ans)).join(",");
				}

				// Double-check we have a valid correct_answer
				if (!correctAnswer || correctAnswer.trim() === "") {
					throw new Error(
						`Failed to convert answers to correct_answer for question ${index + 1}`,
					);
				}

				const questionInsert = {
					assignmentId,
					questionText: q.question_text,
					questionType: q.question_type,
					options: q.options ? JSON.stringify(q.options) : null,
					correctAnswer: correctAnswer, // GUARANTEED: Valid, non-empty string
					points: q.points || 1,
					orderIndex: q.order_index ?? index,
					imageData: q.imageData ?? null,
					difficulty: String(parseDifficulty(q.difficulty)), // Convert to string for decimal type
				};

				// Debug logging for database insert
				if (index < 3) {
					// Debug logging can be added here if needed
				}

				return questionInsert;
			});

			await dbPg.insert(newTeamAssignmentQuestions).values(questionInserts);
		}

		// ASSIGNMENT NOTIFICATIONS DISABLED - Users should use assignments tab instead
		// TODO: Re-enable if needed in the future
		/*
    // Create notifications for all team members in the group using Drizzle ORM
    const membersResult = await dbPg
      .select({ userId: newTeamMemberships.userId })
      .from(newTeamMemberships)
      .where(
        and(
          inArray(newTeamMemberships.teamId, teamInfo.teamUnitIds),
          eq(newTeamMemberships.status, 'active'),
          ne(newTeamMemberships.userId, user.id)
        )
      );

    // Create notifications for each member using Drizzle ORM
    for (const member of membersResult) {
      await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: member.userId,
          teamId: teamInfo.groupId,
          notificationType: 'new_assignment',
          title: `New ${assignment_type}: ${title}`,
          message: description || 'New assignment posted',
          data: { assignment_id: assignment.id, due_date: due_date }
        });
    }
    */

		return NextResponse.json({ assignment });
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
