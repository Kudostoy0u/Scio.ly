import { dbPg } from "@/lib/db";
import {
	teamAssignmentAnalytics,
	teamAssignmentQuestions,
	teamAssignmentRoster,
	teamAssignments,
	teamSubmissions,
	users,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export type AssignmentQuestion = {
	questionText: string;
	questionType: "multiple_choice" | "free_response" | "codebusters";
	options?: string[];
	correctAnswer?: string;
	points?: number;
	imageData?: string | null;
	difficulty?: number;
};

export async function listAssignments(teamSlug: string, userId: string) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	// Get assignments with creator info
	const assignments = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			dueDate: teamAssignments.dueDate,
			status: teamAssignments.status,
			createdAt: teamAssignments.createdAt,
			createdBy: teamAssignments.createdBy,
			assignmentType: teamAssignments.assignmentType,
			points: teamAssignments.points,
			isRequired: teamAssignments.isRequired,
			maxAttempts: teamAssignments.maxAttempts,
			timeLimitMinutes: teamAssignments.timeLimitMinutes,
			eventName: teamAssignments.eventName,
			creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			creatorEmail: users.email,
		})
		.from(teamAssignments)
		.innerJoin(users, eq(teamAssignments.createdBy, users.id))
		.where(eq(teamAssignments.teamId, team.id))
		.orderBy(desc(teamAssignments.createdAt));

	// Get question counts, roster counts, and submission counts for each assignment
	const assignmentIds = assignments.map((a) => a.id);

	const [questionCounts, rosterCounts, submissionCounts, userSubmissions] =
		await Promise.all([
			// Question counts
			dbPg
				.select({
					assignmentId: teamAssignmentQuestions.assignmentId,
					count: count(),
				})
				.from(teamAssignmentQuestions)
				.where(inArray(teamAssignmentQuestions.assignmentId, assignmentIds))
				.groupBy(teamAssignmentQuestions.assignmentId),

			// Roster counts
			dbPg
				.select({
					assignmentId: teamAssignmentRoster.assignmentId,
					count: count(),
				})
				.from(teamAssignmentRoster)
				.where(inArray(teamAssignmentRoster.assignmentId, assignmentIds))
				.groupBy(teamAssignmentRoster.assignmentId),

			// Submission counts
			dbPg
				.select({
					assignmentId: teamSubmissions.assignmentId,
					count: count(),
				})
				.from(teamSubmissions)
				.where(inArray(teamSubmissions.assignmentId, assignmentIds))
				.groupBy(teamSubmissions.assignmentId),

			// User's submissions
			dbPg
				.select({
					assignmentId: teamSubmissions.assignmentId,
					status: teamSubmissions.status,
					submittedAt: teamSubmissions.submittedAt,
					grade: teamSubmissions.grade,
					attemptNumber: teamSubmissions.attemptNumber,
				})
				.from(teamSubmissions)
				.where(
					and(
						inArray(teamSubmissions.assignmentId, assignmentIds),
						eq(teamSubmissions.userId, userId),
					),
				),
		]);

	const questionCountsMap = new Map(
		questionCounts.map((q) => [q.assignmentId, q.count]),
	);
	const rosterCountsMap = new Map(
		rosterCounts.map((r) => [r.assignmentId, r.count]),
	);
	const submissionCountsMap = new Map(
		submissionCounts.map((s) => [s.assignmentId, s.count]),
	);
	const userSubmissionsMap = new Map(
		userSubmissions.map((s) => [s.assignmentId, s]),
	);

	// Get roster for assignments where user is assigned
	const userRoster = await dbPg
		.select({
			assignmentId: teamAssignmentRoster.assignmentId,
			displayName: teamAssignmentRoster.displayName,
			studentName: teamAssignmentRoster.studentName,
			userId: teamAssignmentRoster.userId,
		})
		.from(teamAssignmentRoster)
		.where(
			and(
				inArray(teamAssignmentRoster.assignmentId, assignmentIds),
				eq(teamAssignmentRoster.userId, userId),
			),
		);

	const userRosterMap = new Map(userRoster.map((r) => [r.assignmentId, r]));

	return assignments.map((a) => {
		const userSubmission = userSubmissionsMap.get(a.id);
		const userRosterEntry = userRosterMap.get(a.id);

		return {
			id: a.id,
			title: a.title,
			description: a.description || "",
			assignment_type: a.assignmentType || "standard",
			due_date: a.dueDate || "",
			points: a.points || 0,
			is_required: a.isRequired || false,
			max_attempts: a.maxAttempts || 1,
			time_limit_minutes: a.timeLimitMinutes || null,
			created_at: a.createdAt || "",
			updated_at: a.createdAt || "",
			creator_email: a.creatorEmail || "",
			creator_name: a.creatorName || "",
			questions_count: questionCountsMap.get(a.id) || 0,
			roster_count: rosterCountsMap.get(a.id) || 0,
			submitted_count: submissionCountsMap.get(a.id) || 0,
			graded_count: submissionCountsMap.get(a.id) || 0, // TODO: Calculate based on status
			user_submission: userSubmission
				? {
						status: userSubmission.status,
						submitted_at: userSubmission.submittedAt || "",
						grade: userSubmission.grade || 0,
						attempt_number: userSubmission.attemptNumber || 1,
					}
				: undefined,
			roster: userRosterEntry
				? [
						{
							student_name: userRosterEntry.studentName || "",
							user_id: userRosterEntry.userId || null,
							email: null,
							display_name: userRosterEntry.displayName || null,
						},
					]
				: undefined,
		};
	});
}

export async function createAssignment(
	teamSlug: string,
	userId: string,
	payload: {
		title: string;
		description?: string | null;
		assignmentType?: "task" | "quiz" | "exam" | "standard";
		dueDate?: string | null;
		eventName?: string | null;
		timeLimitMinutes?: number | null;
		points?: number | null;
		isRequired?: boolean | null;
		maxAttempts?: number | null;
		subteamId?: string | null;
		questions?: AssignmentQuestion[];
	},
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const [assignment] = await dbPg
		.insert(teamAssignments)
		.values({
			teamId: team.id,
			subteamId: payload.subteamId || null,
			title: payload.title,
			description: payload.description || null,
			dueDate: payload.dueDate || null,
			createdBy: userId,
			status: "active",
			assignmentType: payload.assignmentType || "standard",
			points: payload.points || 0,
			isRequired: payload.isRequired ?? false,
			maxAttempts: payload.maxAttempts || 1,
			timeLimitMinutes: payload.timeLimitMinutes || null,
			eventName: payload.eventName || null,
		})
		.returning();

	if (!assignment) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create assignment",
		});
	}

	// Insert questions if provided
	if (payload.questions && payload.questions.length > 0) {
		await dbPg.insert(teamAssignmentQuestions).values(
			payload.questions.map((q, index) => ({
				assignmentId: assignment.id,
				questionText: q.questionText,
				questionType: q.questionType,
				options: q.options ? JSON.stringify(q.options) : null,
				correctAnswer: q.correctAnswer || null,
				points: q.points || 1,
				orderIndex: index,
				imageData: q.imageData || null,
				difficulty: q.difficulty?.toString() || null,
			})),
		);
	}

	return assignment;
}

export async function deleteAssignment(
	teamSlug: string,
	assignmentId: string,
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	await dbPg
		.delete(teamAssignments)
		.where(
			and(
				eq(teamAssignments.id, assignmentId),
				eq(teamAssignments.teamId, team.id),
			),
		);

	return { success: true };
}

export async function getAssignmentDetails(
	assignmentId: string,
	userId: string,
) {
	const [assignment] = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			dueDate: teamAssignments.dueDate,
			status: teamAssignments.status,
			createdAt: teamAssignments.createdAt,
			updatedAt: teamAssignments.updatedAt,
			createdBy: teamAssignments.createdBy,
			assignmentType: teamAssignments.assignmentType,
			points: teamAssignments.points,
			isRequired: teamAssignments.isRequired,
			maxAttempts: teamAssignments.maxAttempts,
			timeLimitMinutes: teamAssignments.timeLimitMinutes,
			eventName: teamAssignments.eventName,
			teamId: teamAssignments.teamId,
		})
		.from(teamAssignments)
		.where(eq(teamAssignments.id, assignmentId))
		.limit(1);

	if (!assignment) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
	}

	await assertTeamAccess(assignment.teamId, userId);

	// Get questions
	const questions = await dbPg
		.select({
			id: teamAssignmentQuestions.id,
			questionText: teamAssignmentQuestions.questionText,
			questionType: teamAssignmentQuestions.questionType,
			options: teamAssignmentQuestions.options,
			correctAnswer: teamAssignmentQuestions.correctAnswer,
			points: teamAssignmentQuestions.points,
			orderIndex: teamAssignmentQuestions.orderIndex,
			imageData: teamAssignmentQuestions.imageData,
			difficulty: teamAssignmentQuestions.difficulty,
		})
		.from(teamAssignmentQuestions)
		.where(eq(teamAssignmentQuestions.assignmentId, assignmentId))
		.orderBy(asc(teamAssignmentQuestions.orderIndex));

	return {
		...assignment,
		questions,
		questionsCount: questions.length,
	};
}

export async function getAssignmentAnalytics(
	assignmentId: string,
	userId: string,
) {
	const [assignment] = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			dueDate: teamAssignments.dueDate,
			status: teamAssignments.status,
			createdAt: teamAssignments.createdAt,
			updatedAt: teamAssignments.updatedAt,
			createdBy: teamAssignments.createdBy,
			assignmentType: teamAssignments.assignmentType,
			points: teamAssignments.points,
			isRequired: teamAssignments.isRequired,
			maxAttempts: teamAssignments.maxAttempts,
			timeLimitMinutes: teamAssignments.timeLimitMinutes,
			eventName: teamAssignments.eventName,
			teamId: teamAssignments.teamId,
			creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			creatorEmail: users.email,
		})
		.from(teamAssignments)
		.innerJoin(users, eq(teamAssignments.createdBy, users.id))
		.where(eq(teamAssignments.id, assignmentId))
		.limit(1);

	if (!assignment) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
	}

	// Check captain access
	await assertCaptainAccess(assignment.teamId, userId);

	// Get questions
	const questions = await dbPg
		.select({
			id: teamAssignmentQuestions.id,
			questionText: teamAssignmentQuestions.questionText,
			questionType: teamAssignmentQuestions.questionType,
			options: teamAssignmentQuestions.options,
			correctAnswer: teamAssignmentQuestions.correctAnswer,
			points: teamAssignmentQuestions.points,
			orderIndex: teamAssignmentQuestions.orderIndex,
			imageData: teamAssignmentQuestions.imageData,
			difficulty: teamAssignmentQuestions.difficulty,
		})
		.from(teamAssignmentQuestions)
		.where(eq(teamAssignmentQuestions.assignmentId, assignmentId))
		.orderBy(asc(teamAssignmentQuestions.orderIndex));

	// Get roster with submissions and analytics
	const roster = await dbPg
		.select({
			id: teamAssignmentRoster.id,
			studentName: teamAssignmentRoster.studentName,
			displayName: teamAssignmentRoster.displayName,
			userId: teamAssignmentRoster.userId,
			email: users.email,
		})
		.from(teamAssignmentRoster)
		.leftJoin(users, eq(teamAssignmentRoster.userId, users.id))
		.where(eq(teamAssignmentRoster.assignmentId, assignmentId));

	const userIds = roster
		.map((r) => r.userId)
		.filter((id): id is string => id !== null);

	// Get submissions
	const submissions =
		userIds.length > 0
			? await dbPg
					.select({
						id: teamSubmissions.id,
						userId: teamSubmissions.userId,
						status: teamSubmissions.status,
						grade: teamSubmissions.grade,
						attemptNumber: teamSubmissions.attemptNumber,
						submittedAt: teamSubmissions.submittedAt,
					})
					.from(teamSubmissions)
					.where(
						and(
							eq(teamSubmissions.assignmentId, assignmentId),
							inArray(teamSubmissions.userId, userIds),
						),
					)
			: [];

	// Get analytics
	const analytics =
		userIds.length > 0
			? await dbPg
					.select({
						userId: teamAssignmentAnalytics.userId,
						totalQuestions: teamAssignmentAnalytics.totalQuestions,
						correctAnswers: teamAssignmentAnalytics.correctAnswers,
						totalPoints: teamAssignmentAnalytics.totalPoints,
						earnedPoints: teamAssignmentAnalytics.earnedPoints,
						completionTimeSeconds:
							teamAssignmentAnalytics.completionTimeSeconds,
						submittedAt: teamAssignmentAnalytics.submittedAt,
					})
					.from(teamAssignmentAnalytics)
					.where(
						and(
							eq(teamAssignmentAnalytics.assignmentId, assignmentId),
							inArray(teamAssignmentAnalytics.userId, userIds),
						),
					)
			: [];

	const submissionsMap = new Map(submissions.map((s) => [s.userId, s]));
	const analyticsMap = new Map(analytics.map((a) => [a.userId, a]));

	const rosterWithData = roster.map((member) => {
		const submission = member.userId ? submissionsMap.get(member.userId) : null;
		const analyticsData = member.userId
			? analyticsMap.get(member.userId)
			: null;

		return {
			id: member.id,
			student_name: member.studentName || member.displayName || "",
			user_id: member.userId,
			email: member.email,
			display_name: member.displayName,
			submission: submission
				? {
						id: submission.id,
						status: submission.status,
						grade: submission.grade,
						attempt_number: submission.attemptNumber,
						submitted_at: submission.submittedAt || "",
					}
				: null,
			analytics: analyticsData
				? {
						total_questions: analyticsData.totalQuestions,
						correct_answers: analyticsData.correctAnswers,
						total_points: analyticsData.totalPoints,
						earned_points: analyticsData.earnedPoints,
						completion_time_seconds: analyticsData.completionTimeSeconds,
						submitted_at: analyticsData.submittedAt || "",
					}
				: null,
		};
	});

	return {
		...assignment,
		questions,
		questions_count: questions.length,
		roster: rosterWithData,
		roster_count: roster.length,
		submitted_count: submissions.length,
		graded_count: submissions.filter((s) => s.status === "graded").length,
	};
}
