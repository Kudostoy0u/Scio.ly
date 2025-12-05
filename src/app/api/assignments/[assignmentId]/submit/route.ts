import { dbPg } from "@/lib/db/index";
import {
	newTeamAssignmentAnalytics,
	newTeamAssignmentQuestionResponses,
	newTeamAssignmentQuestions,
	newTeamAssignmentRoster,
	newTeamAssignmentSubmissions,
	newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { getServerUser } from "@/lib/supabaseServer";
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
				correctAnswer: newTeamAssignmentQuestions.correctAnswer,
				points: newTeamAssignmentQuestions.points,
			})
			.from(newTeamAssignmentQuestions)
			.where(eq(newTeamAssignmentQuestions.id, questionId))
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
			.insert(newTeamAssignmentQuestionResponses)
			.values({
				submissionId,
				questionId,
				responseText:
					typeof answer === "string" ? answer : JSON.stringify(answer),
				isCorrect,
				pointsEarned,
			})
			.onConflictDoUpdate({
				target: [
					newTeamAssignmentQuestionResponses.submissionId,
					newTeamAssignmentQuestionResponses.questionId,
				],
				set: {
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

		const { assignmentId } = await params;
		const body = await request.json();
		const {
			answers,
			score,
			totalPoints,
			timeSpent,
			submittedAt,
			isDynamicCodebusters,
		} = body;

		// Verify assignment exists and user is assigned
		const assignmentResult = await dbPg
			.select({
				id: newTeamAssignments.id,
				title: newTeamAssignments.title,
				maxPoints: newTeamAssignments.points,
			})
			.from(newTeamAssignments)
			.innerJoin(
				newTeamAssignmentRoster,
				eq(newTeamAssignments.id, newTeamAssignmentRoster.assignmentId),
			)
			.where(
				and(
					eq(newTeamAssignments.id, assignmentId),
					or(
						eq(newTeamAssignmentRoster.userId, user.id),
						eq(newTeamAssignmentRoster.studentName, user.email ?? ""),
					),
				),
			)
			.limit(1);

		if (assignmentResult.length === 0) {
			return NextResponse.json(
				{ error: "Assignment not found or not assigned" },
				{ status: 404 },
			);
		}

		const assignmentRow = assignmentResult[0];
		if (!assignmentRow) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		const assignment: AssignmentRow = {
			id: String(assignmentRow.id),
			title: String(assignmentRow.title),
			maxPoints: assignmentRow.maxPoints ?? 0,
		};

		// Check if user has already submitted - prevent multiple submissions
		const existingSubmissionResult = await dbPg
			.select({
				id: newTeamAssignmentSubmissions.id,
				attemptNumber: newTeamAssignmentSubmissions.attemptNumber,
				status: newTeamAssignmentSubmissions.status,
			})
			.from(newTeamAssignmentSubmissions)
			.where(
				and(
					eq(newTeamAssignmentSubmissions.assignmentId, assignmentId),
					eq(newTeamAssignmentSubmissions.userId, user.id),
				),
			)
			.orderBy(desc(newTeamAssignmentSubmissions.attemptNumber))
			.limit(1);

		const existingSubmission = existingSubmissionResult[0];

		// Prevent multiple submissions to the same assignment
		if (existingSubmission) {
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

		// Create submission record
		const [submissionRow] = await dbPg
			.insert(newTeamAssignmentSubmissions)
			.values({
				assignmentId,
				userId: user.id,
				status: "submitted",
				grade: score,
				attemptNumber,
				submittedAt: submittedAt
					? new Date(submittedAt).toISOString()
					: new Date().toISOString(),
			} as typeof newTeamAssignmentSubmissions.$inferInsert)
			.returning({
				id: newTeamAssignmentSubmissions.id,
				submittedAt: newTeamAssignmentSubmissions.submittedAt,
			});

		if (!submissionRow) {
			return NextResponse.json(
				{ error: "Failed to create submission" },
				{ status: 500 },
			);
		}

		const submission: NewSubmissionRow = {
			id: String(submissionRow.id),
			submittedAt: submissionRow.submittedAt
				? new Date(submissionRow.submittedAt).toISOString()
				: new Date().toISOString(),
		};

		// Store individual question responses (skip for dynamic Codebusters assignments)
		if (answers && typeof answers === "object" && !isDynamicCodebusters) {
			await processQuestionResponses(submission.id, answers);
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
		await dbPg
			.delete(newTeamAssignmentAnalytics)
			.where(
				and(
					eq(newTeamAssignmentAnalytics.assignmentId, assignmentId),
					eq(newTeamAssignmentAnalytics.userId, user.id),
				),
			);

		await dbPg.insert(newTeamAssignmentAnalytics).values({
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
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
