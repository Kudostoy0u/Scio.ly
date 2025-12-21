import { generateQuestionsForAssignment } from "@/lib/server/questions/generate";
import { assertCaptainAccess } from "@/lib/server/teams/shared";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuestionGenerationRequestSchema = z.object({
	event_name: z.string().min(1),
	question_count: z.number().int().min(1).max(100),
	question_types: z.array(z.enum(["multiple_choice", "free_response"])).min(1),
	division: z.string().optional(),
	id_percentage: z.number().int().min(0).max(100).optional(),
	pure_id_only: z.boolean().optional(),
	difficulties: z.array(z.string()).optional(),
	time_limit_minutes: z.number().int().optional(),
	subtopics: z.array(z.string()).optional(),
	rm_type_filter: z.enum(["rock", "mineral"]).optional(),
});

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const startTime = Date.now();
	try {
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Request started",
		);

		const supabase = await createSupabaseServerClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			logger.dev.structured(
				"warn",
				"[POST /api/teams/[teamId]/assignments/generate-questions] Unauthorized",
				{
					authError: authError?.message,
				},
			);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { teamId } = await params; // This is actually a slug
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Parsing request",
			{
				teamId,
				userId: user.id,
			},
		);

		const body = await request.json();
		logger.dev.structured(
			"debug",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Request body",
			{
				body: JSON.stringify(body),
			},
		);

		// Validate request body
		const validatedRequest = QuestionGenerationRequestSchema.parse(body);
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Request validated",
			{
				event_name: validatedRequest.event_name,
				question_count: validatedRequest.question_count,
				question_types: validatedRequest.question_types,
			},
		);

		const {
			event_name,
			question_count,
			question_types,
			division,
			id_percentage: idPercentage,
			pure_id_only: pureIdOnly,
			difficulties,
			subtopics,
			rm_type_filter: rmTypeFilter,
		} = validatedRequest;

		// Verify user is captain/admin
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Verifying captain access",
			{
				teamId,
				userId: user.id,
			},
		);
		await assertCaptainAccess(teamId, user.id);
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Captain access verified",
		);

		// Convert question_types array to single type for practice logic
		const questionType: "mcq" | "frq" | "both" =
			question_types.length === 2
				? "both"
				: question_types[0] === "multiple_choice"
					? "mcq"
					: "frq";

		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Generating questions",
			{
				eventName: event_name,
				questionCount: question_count,
				questionType,
				division: division || "any",
				idPercentage: idPercentage || 0,
				pureIdOnly: pureIdOnly || false,
				difficulties: difficulties || ["any"],
			},
		);

		// Use the same logic as practice feature
		const questions = await generateQuestionsForAssignment({
			eventName: event_name,
			questionCount: question_count,
			questionType,
			division: division || "any",
			idPercentage: idPercentage || 0,
			pureIdOnly: pureIdOnly || false,
			difficulties: difficulties || ["any"],
			rmTypeFilter: rmTypeFilter,
			subtopics: subtopics,
		});

		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Questions generated",
			{
				count: questions.length,
			},
		);

		// Format questions for assignment (convert from practice format to assignment format)
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Formatting questions",
		);
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

		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Questions formatted",
			{
				formattedCount: formattedQuestions.length,
			},
		);

		if (formattedQuestions.length === 0) {
			logger.dev.structured(
				"warn",
				"[POST /api/teams/[teamId]/assignments/generate-questions] No questions found",
				{
					eventName: event_name,
				},
			);
			return NextResponse.json(
				{
					error: "No valid questions found for this event",
					suggestions: [
						"Try a different event name",
						"Check if the event supports the selected question types",
						"Verify the division selection",
					],
				},
				{ status: 400 },
			);
		}

		const duration = Date.now() - startTime;
		logger.dev.structured(
			"info",
			"[POST /api/teams/[teamId]/assignments/generate-questions] Success",
			{
				questionCount: formattedQuestions.length,
				duration: `${duration}ms`,
			},
		);

		return NextResponse.json({
			questions: formattedQuestions,
			metadata: {
				eventName: event_name,
				questionCount: formattedQuestions.length,
				timeLimit: validatedRequest.time_limit_minutes,
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		if (error instanceof z.ZodError) {
			const zodErrors = error.issues || [];
			logger.dev.structured(
				"warn",
				"[POST /api/teams/[teamId]/assignments/generate-questions] Validation error",
				{
					errors: zodErrors,
					duration: `${duration}ms`,
				},
			);
			return NextResponse.json(
				{
					error: "Invalid request",
					details: zodErrors,
				},
				{ status: 400 },
			);
		}

		if (error instanceof Error && error.message.includes("Only captains")) {
			logger.dev.structured(
				"warn",
				"[POST /api/teams/[teamId]/assignments/generate-questions] Forbidden",
				{
					error: error.message,
					duration: `${duration}ms`,
				},
			);
			return NextResponse.json(
				{ error: "Only captains can generate questions" },
				{ status: 403 },
			);
		}

		// Check for rate limit errors (429)
		if (
			error instanceof Error &&
			(error.message.includes("429") ||
				error.message.includes("Too Many Requests") ||
				error.message.includes("rate limit"))
		) {
			logger.dev.structured(
				"warn",
				"[POST /api/teams/[teamId]/assignments/generate-questions] Rate limit error",
				{
					error: error.message,
					duration: `${duration}ms`,
				},
			);
			return NextResponse.json(
				{
					error: "Too many requests. Please wait a moment and try again.",
					details: "The question generation service is currently rate-limited. Please try again in a few moments.",
				},
				{ status: 429 },
			);
		}

		logger.dev.error(
			"[POST /api/teams/[teamId]/assignments/generate-questions] Error",
			error instanceof Error ? error : new Error(String(error)),
			{
				duration: `${duration}ms`,
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			},
		);
		logger.error(
			"[POST /api/teams/[teamId]/assignments/generate-questions] Error",
			error,
		);

		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
