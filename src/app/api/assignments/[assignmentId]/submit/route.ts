import { dbPg } from "@/lib/db/index";
import {
	teamAssignmentAnalytics,
	teamAssignmentQuestionResponses,
	teamAssignmentQuestions,
	teamAssignmentRoster,
	teamAssignments,
	teamSubmissions,
} from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import { and, desc, eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

interface AssignmentRow {
	id: string;
	title: string;
	maxPoints: number;
}

interface NewSubmissionRow {
	id: string;
	submittedAt: string;
}

interface QuestionRow {
	correctAnswer: string | null;
	points: number;
}

async function processQuestionResponses(
	submissionId: string,
	answers: Record<string, unknown>,
): Promise<void> {
	for (const [questionId, answer] of Object.entries(answers)) {
		if (answer === null || answer === undefined) {
			continue;
		}

		const [questionRow] = await dbPg
			.select({
				correctAnswer: teamAssignmentQuestions.correctAnswer,
				points: teamAssignmentQuestions.points,
			})
			.from(teamAssignmentQuestions)
			.where(eq(teamAssignmentQuestions.id, questionId))
			.limit(1);

		if (!questionRow) {
			continue;
		}

		const question: QuestionRow = {
			correctAnswer: questionRow.correctAnswer,
			points: questionRow.points ?? 1,
		};
		const isCorrect = question.correctAnswer === answer;
		const pointsEarned = isCorrect ? question.points : 0;

		await dbPg
			.insert(teamAssignmentQuestionResponses)
			.values({
				submissionId,
				questionId,
				response: typeof answer === "string" ? answer : JSON.stringify(answer),
				responseText:
					typeof answer === "string" ? answer : JSON.stringify(answer),
				isCorrect,
				pointsEarned,
			})
			.onConflictDoUpdate({
				target: [
					teamAssignmentQuestionResponses.submissionId,
					teamAssignmentQuestionResponses.questionId,
				],
				set: {
					response:
						typeof answer === "string" ? answer : JSON.stringify(answer),
					responseText:
						typeof answer === "string" ? answer : JSON.stringify(answer),
					isCorrect,
					pointsEarned,
				},
			});
	}
}

function calculatePoints(
	isDynamicCodebusters: boolean,
	answers: Record<string, unknown> | undefined,
	body: {
		codebustersPoints?: {
			totalPointsAttempted?: number;
			totalPointsEarned?: number;
		};
		score?: number;
	},
	totalPoints: number | undefined,
	assignmentMaxPoints: number,
): {
	calculatedTotalPoints: number;
	calculatedEarnedPoints: number;
	calculatedCorrectAnswers: number;
} {
	if (isDynamicCodebusters && answers) {
		const { codebustersPoints } = body;

		if (codebustersPoints) {
			return {
				calculatedTotalPoints: codebustersPoints.totalPointsAttempted || 0,
				calculatedEarnedPoints: codebustersPoints.totalPointsEarned || 0,
				calculatedCorrectAnswers: codebustersPoints.totalPointsEarned || 0,
			};
		}

		return {
			calculatedTotalPoints: Object.keys(answers || {}).length * 10,
			calculatedEarnedPoints: body.score || 0,
			calculatedCorrectAnswers: Math.round(body.score || 0),
		};
	}

	const calcTotalPoints = totalPoints || assignmentMaxPoints || 0;
	const calcEarnedPoints = body.score || 0;
	const calcCorrectAnswers =
		Math.round(
			(calcEarnedPoints / Math.max(1, calcTotalPoints)) *
				Object.keys(answers || {}).length,
		) || 0;

	return {
		calculatedTotalPoints: calcTotalPoints,
		calculatedEarnedPoints: calcEarnedPoints,
		calculatedCorrectAnswers: calcCorrectAnswers,
	};
}

// POST /api/assignments/[assignmentId]/submit - Submit assignment results
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ assignmentId: string }> },
) {
	const startTime = Date.now();
	let assignmentId: string | undefined;
	let userId: string | undefined;

	try {
		if (!process.env.DATABASE_URL) {
			logger.error("[Assignment Submit] Database configuration error", {
				error: "DATABASE_URL environment variable is missing",
			});
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
			logger.warn("[Assignment Submit] Unauthorized request", {
				hasUser: !!user,
				userId: user?.id,
			});
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		userId = user.id;
		const { assignmentId: resolvedAssignmentId } = await params;
		assignmentId = resolvedAssignmentId;

		logger.info("[Assignment Submit] Request received", {
			assignmentId,
			userId,
			timestamp: new Date().toISOString(),
		});

		const body = await request.json();
		const {
			answers,
			score,
			totalPoints,
			timeSpent,
			submittedAt,
			isDynamicCodebusters,
		} = body;

		logger.info("[Assignment Submit] Request body parsed", {
			assignmentId,
			userId,
			hasAnswers: !!answers,
			answersCount: answers ? Object.keys(answers).length : 0,
			score,
			totalPoints,
			timeSpent,
			isDynamicCodebusters,
		});

		// Verify assignment exists and user is assigned
		logger.info("[Assignment Submit] Verifying assignment and user access", {
			assignmentId,
			userId,
		});

		const assignmentResult = await dbPg
			.select({
				id: teamAssignments.id,
				title: teamAssignments.title,
				maxPoints: teamAssignments.points,
			})
			.from(teamAssignments)
			.innerJoin(
				teamAssignmentRoster,
				eq(teamAssignments.id, teamAssignmentRoster.assignmentId),
			)
			.where(
				and(
					eq(teamAssignments.id, assignmentId),
					or(
						eq(teamAssignmentRoster.userId, user.id),
						eq(teamAssignmentRoster.displayName, user.email ?? ""),
					),
				),
			)
			.limit(1);

		if (assignmentResult.length === 0) {
			logger.warn(
				"[Assignment Submit] Assignment not found or user not assigned",
				{
					assignmentId,
					userId,
				},
			);
			return NextResponse.json(
				{ error: "Assignment not found or not assigned" },
				{ status: 404 },
			);
		}

		const assignmentRow = assignmentResult[0];
		if (!assignmentRow) {
			logger.error("[Assignment Submit] Assignment row is null after query", {
				assignmentId,
				userId,
				resultLength: assignmentResult.length,
			});
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		logger.info("[Assignment Submit] Assignment verified", {
			assignmentId,
			userId,
			assignmentTitle: assignmentRow.title,
			maxPoints: assignmentRow.maxPoints,
		});

		const assignment: AssignmentRow = {
			id: String(assignmentRow.id),
			title: String(assignmentRow.title),
			maxPoints: assignmentRow.maxPoints ?? 0,
		};

		// Check if user has already submitted - prevent multiple submissions
		logger.info("[Assignment Submit] Checking for existing submission", {
			assignmentId,
			userId,
		});

		const existingSubmissionResult = await dbPg
			.select({
				id: teamSubmissions.id,
				attemptNumber: teamSubmissions.attemptNumber,
				status: teamSubmissions.status,
			})
			.from(teamSubmissions)
			.where(
				and(
					eq(teamSubmissions.assignmentId, assignmentId),
					eq(teamSubmissions.userId, user.id),
				),
			)
			.orderBy(desc(teamSubmissions.attemptNumber))
			.limit(1);

		const existingSubmission = existingSubmissionResult[0];

		// Prevent multiple submissions to the same assignment
		if (existingSubmission) {
			logger.warn("[Assignment Submit] Duplicate submission attempt", {
				assignmentId,
				userId,
				existingSubmissionId: existingSubmission.id,
				existingAttemptNumber: existingSubmission.attemptNumber,
				existingStatus: existingSubmission.status,
			});
			return NextResponse.json(
				{
					error: "Assignment already submitted",
					details:
						"You have already submitted this assignment and cannot submit again",
				},
				{ status: 400 },
			);
		}

		const attemptNumber = 1;

		logger.info("[Assignment Submit] Creating submission record", {
			assignmentId,
			userId,
			attemptNumber,
			score,
			submittedAt: submittedAt || new Date().toISOString(),
		});

		// Create submission record
		const [submissionRow] = await dbPg
			.insert(teamSubmissions)
			.values({
				assignmentId,
				userId: user.id,
				status: "submitted",
				grade: score,
				attemptNumber,
				submittedAt: submittedAt
					? new Date(submittedAt).toISOString()
					: new Date().toISOString(),
			} as typeof teamSubmissions.$inferInsert)
			.returning({
				id: teamSubmissions.id,
				submittedAt: teamSubmissions.submittedAt,
			});

		if (!submissionRow) {
			logger.error("[Assignment Submit] Failed to create submission record", {
				assignmentId,
				userId,
				attemptNumber,
			});
			return NextResponse.json(
				{ error: "Failed to create submission" },
				{ status: 500 },
			);
		}

		logger.info("[Assignment Submit] Submission record created", {
			assignmentId,
			userId,
			submissionId: submissionRow.id,
		});

		const submission: NewSubmissionRow = {
			id: String(submissionRow.id),
			submittedAt: submissionRow.submittedAt
				? new Date(submissionRow.submittedAt).toISOString()
				: new Date().toISOString(),
		};

		// Store individual question responses (skip for dynamic Codebusters assignments)
		if (answers && typeof answers === "object" && !isDynamicCodebusters) {
			logger.info("[Assignment Submit] Processing question responses", {
				assignmentId,
				userId,
				submissionId: submission.id,
				answersCount: Object.keys(answers).length,
			});
			await processQuestionResponses(submission.id, answers);
			logger.info("[Assignment Submit] Question responses processed", {
				assignmentId,
				userId,
				submissionId: submission.id,
			});
		} else {
			logger.info("[Assignment Submit] Skipping question responses", {
				assignmentId,
				userId,
				hasAnswers: !!answers,
				isDynamicCodebusters,
			});
		}

		// Calculate points using the same method as Codebusters test summary
		const {
			calculatedTotalPoints,
			calculatedEarnedPoints,
			calculatedCorrectAnswers,
		} = calculatePoints(
			isDynamicCodebusters,
			answers,
			body,
			totalPoints,
			assignment.maxPoints,
		);

		// Create analytics record (delete existing first, then insert)
		logger.info("[Assignment Submit] Creating analytics record", {
			assignmentId,
			userId,
			calculatedTotalPoints,
			calculatedEarnedPoints,
			calculatedCorrectAnswers,
		});

		await dbPg
			.delete(teamAssignmentAnalytics)
			.where(
				and(
					eq(teamAssignmentAnalytics.assignmentId, assignmentId),
					eq(teamAssignmentAnalytics.userId, user.id),
				),
			);

		await dbPg.insert(teamAssignmentAnalytics).values({
			assignmentId,
			studentName: user.email || user.id,
			userId: user.id,
			totalQuestions: Object.keys(answers || {}).length,
			correctAnswers: calculatedCorrectAnswers,
			totalPoints: calculatedTotalPoints,
			earnedPoints: calculatedEarnedPoints,
			completionTimeSeconds: timeSpent || 0,
			submittedAt: submittedAt
				? new Date(submittedAt).toISOString()
				: new Date().toISOString(),
		});

		const duration = Date.now() - startTime;
		logger.info("[Assignment Submit] Success", {
			assignmentId,
			userId,
			submissionId: submission.id,
			durationMs: duration,
		});

		return NextResponse.json({
			submission: {
				id: submission.id,
				assignmentId,
				score,
				totalPoints: totalPoints || assignment.maxPoints || 0,
				attemptNumber,
				submittedAt: submission.submittedAt,
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const errorStack = error instanceof Error ? error.stack : undefined;

		logger.error(
			"[Assignment Submit] Error",
			error instanceof Error ? error : new Error(errorMessage),
			{
				assignmentId,
				userId,
				durationMs: duration,
				errorMessage,
				errorStack,
			},
		);

		return NextResponse.json(
			{
				error: "Internal server error",
				details: errorMessage,
			},
			{ status: 500 },
		);
	}
}
