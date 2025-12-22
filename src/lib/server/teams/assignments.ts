import { dbPg } from "@/lib/db";
import {
	teamAssignmentAnalytics,
	teamAssignmentQuestionResponses,
	teamAssignmentQuestions,
	teamAssignmentRoster,
	teamAssignments,
	teamSubmissions,
	teams,
	users,
} from "@/lib/db/schema";
import { FrontendQuestionSchema } from "@/lib/schemas/question";
import { parseDifficulty } from "@/lib/types/difficulty";
import logger from "@/lib/utils/logging/logger";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { touchTeamCacheManifest } from "./cache-manifest";
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
	const { team, membership } = await assertTeamAccess(teamSlug, userId);

	// Get assignments with creator info
	const assignments = await dbPg
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

	// Check if user is captain/admin to determine if we should show all roster members
	const isCaptain =
		membership.role === "captain" || membership.role === "admin";

	// Get roster for assignments - all members for captains, just user's own for members
	const rosterWhereConditions = isCaptain
		? inArray(teamAssignmentRoster.assignmentId, assignmentIds)
		: and(
				inArray(teamAssignmentRoster.assignmentId, assignmentIds),
				eq(teamAssignmentRoster.userId, userId),
			);

	const allRoster = await dbPg
		.select({
			assignmentId: teamAssignmentRoster.assignmentId,
			displayName: teamAssignmentRoster.displayName,
			studentName: teamAssignmentRoster.studentName,
			userId: teamAssignmentRoster.userId,
		})
		.from(teamAssignmentRoster)
		.where(rosterWhereConditions);
	const rosterByAssignment = new Map<string, typeof allRoster>();
	for (const entry of allRoster) {
		if (!rosterByAssignment.has(entry.assignmentId)) {
			rosterByAssignment.set(entry.assignmentId, []);
		}
		rosterByAssignment.get(entry.assignmentId)?.push(entry);
	}

	return assignments.map((a) => {
		const userSubmission = userSubmissionsMap.get(a.id);
		const assignmentRoster = rosterByAssignment.get(a.id) || [];

		return {
			id: a.id,
			title: a.title,
			description: a.description || "",
			due_date: a.dueDate || "",
			points: a.points || 0,
			is_required: a.isRequired || false,
			max_attempts: a.maxAttempts || 1,
			time_limit_minutes: a.timeLimitMinutes || null,
			created_at: a.createdAt || "",
			updated_at: a.updatedAt || a.createdAt || "",
			creator_email: a.creatorEmail || "",
			creator_name: a.creatorName || "",
			event_name: a.eventName || "",
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
			roster:
				assignmentRoster.length > 0
					? assignmentRoster.map((r) => ({
							student_name: r.studentName || "",
							user_id: r.userId || null,
							email: null,
							display_name: r.displayName || null,
						}))
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
		dueDate?: string | null;
		eventName?: string | null;
		timeLimitMinutes?: number | null;
		points?: number | null;
		isRequired?: boolean | null;
		maxAttempts?: number | null;
		subteamId?: string | null;
		questions?: AssignmentQuestion[];
		rosterMembers?: Array<{
			studentName: string;
			userId?: string | null;
			displayName: string;
		}>;
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
			assignmentType: "standard",
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

	// Insert roster members if provided
	// Filter out members without userId since schema requires it
	if (payload.rosterMembers && payload.rosterMembers.length > 0) {
		const membersWithUserId = payload.rosterMembers.filter(
			(member): member is typeof member & { userId: string } =>
				member.userId !== null && member.userId !== undefined,
		);
		if (membersWithUserId.length > 0) {
			await dbPg.insert(teamAssignmentRoster).values(
				membersWithUserId.map((member) => ({
					assignmentId: assignment.id,
					userId: member.userId,
					subteamId: payload.subteamId || null,
					displayName: member.displayName,
					studentName: member.studentName,
					status: "assigned",
				})),
			);
		}
	}

	await touchTeamCacheManifest(team.id, {
		assignments: true,
		full: true,
	});

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

	await touchTeamCacheManifest(team.id, {
		assignments: true,
		full: true,
	});

	return { success: true };
}

const ANSWER_LETTER_REGEX = /^[A-Z]$/i;

interface QuestionRow {
	id: string;
	questionText: string;
	questionType: string;
	options: unknown; // JSONB - can be string, array, or object
	correctAnswer: string | null;
	points: number;
	orderIndex: number;
	imageData: string | null;
	difficulty: string | null;
}

interface CodebustersData {
	type?: string;
	author?: string;
	cipherType?: string;
	division?: string;
	charLength?: number;
	encrypted?: string;
	key?: string;
	kShift?: number;
	plainAlphabet?: string;
	cipherAlphabet?: string;
	matrix?: number[][];
	decryptionMatrix?: number[][];
	portaKeyword?: string;
	nihilistPolybiusKey?: string;
	nihilistCipherKey?: string;
	checkerboardRowKey?: string;
	checkerboardColKey?: string;
	checkerboardPolybiusKey?: string;
	checkerboardUsesIJ?: boolean;
	blockSize?: number;
	columnarKey?: string;
	fractionationTable?: { [key: string]: string };
	caesarShift?: number;
	affineA?: number;
	affineB?: number;
	baconianBinaryType?: string;
	cryptarithmData?: {
		equation: string;
		numericExample: string | null;
		digitGroups: Array<{
			digits: string;
			word: string;
		}>;
	};
	askForKeyword?: boolean;
	hint?: string;
	solution?: Record<string, string>;
}

function parseCodebustersQuestion(
	q: QuestionRow,
	_index: number,
): ReturnType<typeof FrontendQuestionSchema.parse> {
	let codebustersData: CodebustersData | null = null;
	if (q.options) {
		try {
			codebustersData =
				typeof q.options === "string" ? JSON.parse(q.options) : q.options;
		} catch (_parseError) {
			// If parsing fails, codebustersData remains null and will use fallback values
		}
	}

	// Check if this is a parameters record (for dynamic generation)
	if (codebustersData?.type === "parameters") {
		return {
			id: q.id,
			questionText: "Dynamic Codebusters Generation",
			questionType: "codebusters_params",
			parameters: codebustersData,
			points: 0,
			orderIndex: 0,
			imageData: null,
		} as unknown as ReturnType<typeof FrontendQuestionSchema.parse>;
	}

	// Regular Codebusters question
	const solutionValue =
		typeof codebustersData?.solution === "object" &&
		codebustersData?.solution !== null
			? codebustersData.solution
			: undefined;
	const answerFallback = "";
	const codebustersQuestion = {
		id: q.id,
		question: q.questionText,
		questionText: q.questionText,
		type: "codebusters" as const,
		questionType: "codebusters",
		author: codebustersData?.author || "Unknown",
		quote: q.questionText,
		cipherType: codebustersData?.cipherType || "Random Aristocrat",
		difficulty: parseDifficulty(q.difficulty),
		division: codebustersData?.division || "C",
		charLength: codebustersData?.charLength || 100,
		encrypted: codebustersData?.encrypted || "",
		key: codebustersData?.key || "",
		kShift: codebustersData?.kShift,
		plainAlphabet: codebustersData?.plainAlphabet,
		cipherAlphabet: codebustersData?.cipherAlphabet,
		matrix: codebustersData?.matrix,
		decryptionMatrix: codebustersData?.decryptionMatrix,
		portaKeyword: codebustersData?.portaKeyword,
		nihilistPolybiusKey: codebustersData?.nihilistPolybiusKey,
		nihilistCipherKey: codebustersData?.nihilistCipherKey,
		checkerboardRowKey: codebustersData?.checkerboardRowKey,
		checkerboardColKey: codebustersData?.checkerboardColKey,
		checkerboardPolybiusKey: codebustersData?.checkerboardPolybiusKey,
		checkerboardUsesIJ: codebustersData?.checkerboardUsesIJ,
		blockSize: codebustersData?.blockSize,
		columnarKey: codebustersData?.columnarKey,
		fractionationTable: codebustersData?.fractionationTable,
		caesarShift: codebustersData?.caesarShift,
		affineA: codebustersData?.affineA,
		affineB: codebustersData?.affineB,
		baconianBinaryType: codebustersData?.baconianBinaryType,
		cryptarithmData: codebustersData?.cryptarithmData,
		askForKeyword: codebustersData?.askForKeyword,
		hint: codebustersData?.hint || "",
		solution: solutionValue,
		answers: [answerFallback],
		correctAnswer: answerFallback,
		points: q.points,
		order: q.orderIndex,
		orderIndex: q.orderIndex,
		imageData: q.imageData || null,
	};

	try {
		return FrontendQuestionSchema.passthrough().parse(codebustersQuestion);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues?.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			) || ["Unknown validation error"];
			throw new Error(
				`Codebusters question validation failed:\n${errorMessages.join("\n")}`,
			);
		}
		throw error;
	}
}

function parseOptions(q: QuestionRow): string[] | undefined {
	if (!q.options) {
		return undefined;
	}
	let parsedOptions = q.options;
	if (typeof q.options === "string") {
		try {
			parsedOptions = JSON.parse(q.options);
		} catch {
			parsedOptions = [q.options];
		}
	}

	if (Array.isArray(parsedOptions)) {
		return parsedOptions.map((opt: unknown) => {
			if (typeof opt === "string") {
				return opt;
			}
			if (
				opt &&
				typeof opt === "object" &&
				"text" in opt &&
				typeof opt.text === "string"
			) {
				return opt.text;
			}
			return String(opt);
		});
	}
	return undefined;
}

function convertMcqAnswer(
	answerStr: string,
	options: string[] | undefined,
	index: number,
): number[] {
	const answerParts = answerStr
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s);

	if (answerParts.length === 0) {
		throw new Error(
			`Invalid correct_answer format for MCQ question ${index + 1}: "${answerStr}"`,
		);
	}

	return answerParts.map((part) => {
		if (ANSWER_LETTER_REGEX.test(part)) {
			const idx = part.toUpperCase().charCodeAt(0) - 65;
			if (idx < 0 || idx >= (options?.length || 0)) {
				throw new Error(
					`Answer letter "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`,
				);
			}
			return idx;
		}
		const num = Number.parseInt(part);
		if (Number.isNaN(num) || num < 0 || num >= (options?.length || 0)) {
			throw new Error(
				`Answer index "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`,
			);
		}
		return num;
	});
}

function convertAnswers(
	q: QuestionRow,
	options: string[] | undefined,
	index: number,
): (string | number)[] {
	if (
		q.correctAnswer === null ||
		q.correctAnswer === undefined ||
		q.correctAnswer === ""
	) {
		return [];
	}

	if (q.questionType === "multiple_choice") {
		const answerStr = String(q.correctAnswer).trim();
		return convertMcqAnswer(answerStr, options, index);
	}

	return [q.correctAnswer];
}

function parseRegularQuestion(
	q: QuestionRow,
	options: string[] | undefined,
	_index: number,
): ReturnType<typeof FrontendQuestionSchema.parse> {
	const answers = convertAnswers(q, options, _index);

	if (answers.length === 0) {
		throw new Error(
			`Assignment question ${_index + 1} has no valid answers. This assignment cannot be loaded until all questions have valid answers. Question: "${q.questionText?.substring(0, 50)}..." Please contact an administrator to fix this assignment.`,
		);
	}

	const question = {
		id: q.id,
		question: q.questionText,
		type:
			q.questionType === "multiple_choice"
				? ("mcq" as const)
				: ("frq" as const),
		options: options,
		answers: answers,
		points: q.points,
		order: q.orderIndex,
		imageData: q.imageData || null,
		difficulty: parseDifficulty(q.difficulty),
	};

	try {
		return FrontendQuestionSchema.parse(question);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues?.map(
				(err) => `${err.path.join(".")}: ${err.message}`,
			) || ["Unknown validation error"];
			throw new Error(
				`Question validation failed:\n${errorMessages.join("\n")}`,
			);
		}
		throw error;
	}
}

export async function getAssignmentDetails(
	assignmentId: string,
	userId: string,
) {
	// Get assignment details with creator information
	const assignmentResult = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			assignmentType: teamAssignments.assignmentType,
			dueDate: teamAssignments.dueDate,
			points: teamAssignments.points,
			isRequired: teamAssignments.isRequired,
			maxAttempts: teamAssignments.maxAttempts,
			timeLimitMinutes: teamAssignments.timeLimitMinutes,
			createdAt: teamAssignments.createdAt,
			updatedAt: teamAssignments.updatedAt,
			creatorEmail: users.email,
			creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			teamId: teamAssignments.teamId,
		})
		.from(teamAssignments)
		.innerJoin(users, eq(teamAssignments.createdBy, users.id))
		.where(eq(teamAssignments.id, assignmentId))
		.limit(1);

	if (assignmentResult.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
	}

	const assignmentRow = assignmentResult[0];
	if (!assignmentRow) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
	}

	// Check if user is assigned to this assignment
	const rosterResult = await dbPg
		.select({
			studentName: teamAssignmentRoster.displayName,
			userId: teamAssignmentRoster.userId,
			subteamId: teamAssignmentRoster.subteamId,
		})
		.from(teamAssignmentRoster)
		.where(
			and(
				eq(teamAssignmentRoster.assignmentId, assignmentId),
				or(
					eq(teamAssignmentRoster.userId, userId),
					eq(teamAssignmentRoster.displayName, ""), // Will be checked with user email below
				),
			),
		)
		.limit(1);

	// If no roster entry found, check team access as fallback
	if (rosterResult.length === 0) {
		await assertTeamAccess(assignmentRow.teamId, userId);
	}

	// Load assignment questions from database
	const questionsResult = await dbPg
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

	// Format questions for the frontend test system
	const questions = questionsResult.map((row, index: number) => {
		const q: QuestionRow = {
			id: String(row.id),
			questionText: String(row.questionText),
			questionType: String(row.questionType),
			options: row.options,
			correctAnswer: row.correctAnswer as string | null,
			points: row.points ?? 1,
			orderIndex: row.orderIndex ?? 0,
			imageData: row.imageData as string | null,
			difficulty: row.difficulty ? String(row.difficulty) : null,
		};

		if (q.questionType === "codebusters") {
			return parseCodebustersQuestion(q, index);
		}

		const options = parseOptions(q);
		return parseRegularQuestion(q, options, index);
	});

	return {
		id: String(assignmentRow.id),
		title: String(assignmentRow.title),
		description: assignmentRow.description as string | null,
		assignmentType: String(assignmentRow.assignmentType),
		dueDate: assignmentRow.dueDate ? String(assignmentRow.dueDate) : null,
		points: assignmentRow.points ?? 0,
		isRequired: assignmentRow.isRequired ?? true,
		maxAttempts: assignmentRow.maxAttempts ?? null,
		timeLimitMinutes: assignmentRow.timeLimitMinutes ?? null,
		createdAt: assignmentRow.createdAt
			? String(assignmentRow.createdAt)
			: new Date().toISOString(),
		updatedAt: assignmentRow.updatedAt
			? String(assignmentRow.updatedAt)
			: new Date().toISOString(),
		creatorEmail: String(assignmentRow.creatorEmail),
		creatorName: assignmentRow.creatorName as string | null,
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

function normalizeAnswerForStorage(answer: unknown): string {
	if (answer === null || answer === undefined) {
		return "";
	}
	if (typeof answer === "string") {
		return answer;
	}
	if (Array.isArray(answer)) {
		// If array has single element, return it as string; otherwise JSON stringify
		if (answer.length === 1 && typeof answer[0] === "string") {
			return answer[0];
		}
		return JSON.stringify(answer);
	}
	// For other types (numbers, booleans, objects), JSON stringify
	return JSON.stringify(answer);
}

function normalizeAnswerForComparison(
	answer: unknown,
): string | number | (string | number)[] {
	if (answer === null || answer === undefined) {
		return "";
	}
	if (typeof answer === "string" || typeof answer === "number") {
		return answer;
	}
	if (Array.isArray(answer)) {
		// Return array as-is for comparison
		return answer as (string | number)[];
	}
	// For objects, try to extract a meaningful value
	if (typeof answer === "object") {
		return JSON.stringify(answer);
	}
	return String(answer);
}

async function processQuestionResponses(
	submissionId: string,
	answers: Record<string, unknown>,
): Promise<void> {
	logger.info("[processQuestionResponses] Starting", {
		submissionId,
		answersCount: Object.keys(answers).length,
	});

	// Filter out null/undefined answers and get question IDs
	const validAnswers = Object.entries(answers).filter(
		([, answer]) => answer !== null && answer !== undefined,
	);

	if (validAnswers.length === 0) {
		logger.info("[processQuestionResponses] No valid answers to process", {
			submissionId,
		});
		return;
	}

	const questionIds = validAnswers.map(([questionId]) => questionId);

	// Batch fetch all questions in one query
	const questions = await dbPg
		.select({
			id: teamAssignmentQuestions.id,
			correctAnswer: teamAssignmentQuestions.correctAnswer,
			points: teamAssignmentQuestions.points,
		})
		.from(teamAssignmentQuestions)
		.where(inArray(teamAssignmentQuestions.id, questionIds));

	const questionMap = new Map(questions.map((q) => [q.id, q]));

	// Batch fetch all existing responses in one query
	const existingResponses = await dbPg
		.select({
			id: teamAssignmentQuestionResponses.id,
			questionId: teamAssignmentQuestionResponses.questionId,
		})
		.from(teamAssignmentQuestionResponses)
		.where(
			and(
				eq(teamAssignmentQuestionResponses.submissionId, submissionId),
				inArray(teamAssignmentQuestionResponses.questionId, questionIds),
			),
		);

	const existingResponseMap = new Map(
		existingResponses.map((r) => [r.questionId, r.id]),
	);

	// Process all answers in memory
	const responsesToInsert: Array<{
		submissionId: string;
		questionId: string;
		response: string;
		responseText: string;
		isCorrect: boolean;
		pointsEarned: number;
	}> = [];

	const responsesToUpdate: Array<{
		questionId: string;
		response: string;
		responseText: string;
		isCorrect: boolean;
		pointsEarned: number;
	}> = [];

	for (const [questionId, answer] of validAnswers) {
		const questionRow = questionMap.get(questionId);

		if (!questionRow) {
			logger.warn("[processQuestionResponses] Question not found", {
				questionId,
			});
			continue;
		}

		// Normalize answer for comparison
		const normalizedAnswer = normalizeAnswerForComparison(answer);
		const correctAnswer = questionRow.correctAnswer;

		// Compare answers - handle arrays, strings, and other types
		let isCorrect = false;
		if (Array.isArray(normalizedAnswer) && Array.isArray(correctAnswer)) {
			// Compare arrays
			isCorrect =
				normalizedAnswer.length === correctAnswer.length &&
				normalizedAnswer.every((val, idx) => val === correctAnswer[idx]);
		} else if (
			Array.isArray(normalizedAnswer) &&
			normalizedAnswer.length === 1
		) {
			// Single element array vs string/number
			isCorrect = normalizedAnswer[0] === correctAnswer;
		} else {
			// Direct comparison
			isCorrect = normalizedAnswer === correctAnswer;
		}

		const pointsEarned = isCorrect ? (questionRow.points ?? 1) : 0;

		// Normalize answer for storage (must be string)
		const responseString = normalizeAnswerForStorage(answer);
		const responseTextString = normalizeAnswerForStorage(answer);

		// Ensure values are strings (explicit type assertion for Drizzle)
		const responseValue: string = String(responseString);
		const responseTextValue: string = String(responseTextString);

		logger.debug("[processQuestionResponses] Processing answer", {
			questionId,
			submissionId,
			responseValue,
			isCorrect,
			pointsEarned,
		});

		if (existingResponseMap.has(questionId)) {
			// Queue for update
			responsesToUpdate.push({
				questionId,
				response: responseValue,
				responseText: responseTextValue,
				isCorrect,
				pointsEarned,
			});
		} else {
			// Queue for insert
			responsesToInsert.push({
				submissionId,
				questionId,
				response: responseValue,
				responseText: responseTextValue,
				isCorrect,
				pointsEarned,
			});
		}
	}

	// Batch insert new responses
	if (responsesToInsert.length > 0) {
		try {
			await dbPg
				.insert(teamAssignmentQuestionResponses)
				.values(responsesToInsert);
			logger.debug("[processQuestionResponses] Batch inserted responses", {
				count: responsesToInsert.length,
			});
		} catch (error) {
			logger.error(
				"[processQuestionResponses] Failed to batch insert responses",
				error instanceof Error ? error : new Error(String(error)),
				{
					submissionId,
					count: responsesToInsert.length,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			);
			throw error;
		}
	}

	// Batch update existing responses
	if (responsesToUpdate.length > 0) {
		try {
			// Note: Drizzle doesn't support batch updates directly, so we need to update individually
			// However, we can use Promise.all to parallelize them
			await Promise.all(
				responsesToUpdate.map((response) =>
					dbPg
						.update(teamAssignmentQuestionResponses)
						.set({
							response: response.response,
							responseText: response.responseText,
							isCorrect: response.isCorrect,
							pointsEarned: response.pointsEarned,
						})
						.where(
							and(
								eq(teamAssignmentQuestionResponses.submissionId, submissionId),
								eq(
									teamAssignmentQuestionResponses.questionId,
									response.questionId,
								),
							),
						),
				),
			);
			logger.debug("[processQuestionResponses] Batch updated responses", {
				count: responsesToUpdate.length,
			});
		} catch (error) {
			logger.error(
				"[processQuestionResponses] Failed to batch update responses",
				error instanceof Error ? error : new Error(String(error)),
				{
					submissionId,
					count: responsesToUpdate.length,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			);
			throw error;
		}
	}

	logger.info("[processQuestionResponses] Completed", {
		submissionId,
		processedCount: validAnswers.length,
		insertedCount: responsesToInsert.length,
		updatedCount: responsesToUpdate.length,
	});
}

export async function submitAssignment(
	assignmentId: string,
	userId: string,
	userEmail: string | null | undefined,
	payload: {
		answers?: Record<string, unknown>;
		score?: number;
		totalPoints?: number;
		timeSpent?: number;
		submittedAt?: string;
		isDynamicCodebusters?: boolean;
		codebustersPoints?: {
			totalPointsAttempted?: number;
			totalPointsEarned?: number;
		};
	},
) {
	const {
		answers,
		score,
		totalPoints,
		timeSpent,
		submittedAt,
		isDynamicCodebusters,
		codebustersPoints,
	} = payload;

	logger.info("[submitAssignment] Verifying assignment and user access", {
		assignmentId,
		userId,
	});

	// Verify assignment exists and user is assigned, also get team slug for cache invalidation
	const assignmentResult = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			maxPoints: teamAssignments.points,
			teamId: teamAssignments.teamId,
			teamSlug: teams.slug,
		})
		.from(teamAssignments)
		.innerJoin(
			teamAssignmentRoster,
			eq(teamAssignments.id, teamAssignmentRoster.assignmentId),
		)
		.innerJoin(teams, eq(teamAssignments.teamId, teams.id))
		.where(
			and(
				eq(teamAssignments.id, assignmentId),
				or(
					eq(teamAssignmentRoster.userId, userId),
					eq(teamAssignmentRoster.displayName, userEmail ?? ""),
				),
			),
		)
		.limit(1);

	if (assignmentResult.length === 0) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Assignment not found or not assigned",
		});
	}

	const assignmentRow = assignmentResult[0];
	if (!assignmentRow) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Assignment not found",
		});
	}

	const assignmentMaxPoints = assignmentRow.maxPoints ?? 0;

	// Check if user has already submitted - prevent multiple submissions
	logger.info("[submitAssignment] Checking for existing submission", {
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
				eq(teamSubmissions.userId, userId),
			),
		)
		.orderBy(desc(teamSubmissions.attemptNumber))
		.limit(1);

	const existingSubmission = existingSubmissionResult[0];

	// Prevent multiple submissions to the same assignment
	if (existingSubmission) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Assignment already submitted",
		});
	}

	const attemptNumber = 1;

	// Create submission record
	const [submissionRow] = await dbPg
		.insert(teamSubmissions)
		.values({
			assignmentId,
			userId,
			status: "submitted",
			grade: score ?? 0,
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
		logger.error("[submitAssignment] Failed to create submission record", {
			assignmentId,
			userId,
			attemptNumber,
		});
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create submission",
		});
	}

	logger.info("[submitAssignment] Submission record created", {
		assignmentId,
		userId,
		submissionId: submissionRow.id,
	});

	const submissionId = String(submissionRow.id);

	// Update assignment's updatedAt timestamp when submission is created
	await dbPg
		.update(teamAssignments)
		.set({
			updatedAt: new Date().toISOString(),
		})
		.where(eq(teamAssignments.id, assignmentId));

	logger.info("[submitAssignment] Updated assignment updatedAt", {
		assignmentId,
		userId,
	});

	// Store individual question responses (skip for dynamic Codebusters assignments)
	if (answers && typeof answers === "object" && !isDynamicCodebusters) {
		logger.info("[submitAssignment] Processing question responses", {
			assignmentId,
			userId,
			submissionId,
			answersCount: Object.keys(answers).length,
		});
		await processQuestionResponses(submissionId, answers);
		logger.info("[submitAssignment] Question responses processed", {
			assignmentId,
			userId,
			submissionId,
		});
	} else {
		logger.info("[submitAssignment] Skipping question responses", {
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
		isDynamicCodebusters ?? false,
		answers,
		{ codebustersPoints, score },
		totalPoints,
		assignmentMaxPoints,
	);

	// Create analytics record (delete existing first, then insert)
	await dbPg
		.delete(teamAssignmentAnalytics)
		.where(
			and(
				eq(teamAssignmentAnalytics.assignmentId, assignmentId),
				eq(teamAssignmentAnalytics.userId, userId),
			),
		);

	await dbPg.insert(teamAssignmentAnalytics).values({
		assignmentId,
		studentName: userEmail || userId,
		userId,
		totalQuestions: Object.keys(answers || {}).length,
		correctAnswers: calculatedCorrectAnswers,
		totalPoints: calculatedTotalPoints,
		earnedPoints: calculatedEarnedPoints,
		completionTimeSeconds: timeSpent || 0,
		submittedAt: submittedAt
			? new Date(submittedAt).toISOString()
			: new Date().toISOString(),
	});

	logger.info("[submitAssignment] Success", {
		assignmentId,
		userId,
		submissionId,
		teamSlug: assignmentRow.teamSlug
			? String(assignmentRow.teamSlug)
			: undefined,
	});

	await touchTeamCacheManifest(assignmentRow.teamId, {
		assignments: true,
		full: true,
	});

	return {
		submission: {
			id: submissionId,
			assignmentId,
			score: score ?? 0,
			totalPoints: totalPoints || assignmentMaxPoints || 0,
			attemptNumber,
			submittedAt: submissionRow.submittedAt
				? new Date(submissionRow.submittedAt).toISOString()
				: new Date().toISOString(),
		},
		teamSlug: assignmentRow.teamSlug
			? String(assignmentRow.teamSlug)
			: undefined,
	};
}

export async function declineAssignment(assignmentId: string, userId: string) {
	// Mark submission as declined/cancelled
	await dbPg
		.insert(teamSubmissions)
		.values({
			assignmentId,
			userId,
			status: "declined",
			updatedAt: new Date().toISOString(),
		})
		.onConflictDoUpdate({
			target: [teamSubmissions.assignmentId, teamSubmissions.userId],
			set: {
				status: "declined",
				updatedAt: new Date().toISOString(),
			},
		});

	return { message: "Assignment declined successfully" };
}
