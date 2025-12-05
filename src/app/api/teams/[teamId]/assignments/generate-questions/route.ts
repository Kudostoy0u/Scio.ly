import { QuestionGenerationRequestSchema } from "@/lib/schemas/question";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getEventCapabilities } from "@/lib/utils/eventConfig";
import {
	isUserCaptain,
	resolveTeamSlugToUnits,
} from "@/lib/utils/team-resolver";
import { type NextRequest, NextResponse } from "next/server";
import { shuffleArray } from "./utils/arrayUtils";
import { resolveEventName } from "./utils/eventUtils";
import {
	fetchIdQuestionsFromEvents,
	fetchQuestionsFromEvents,
} from "./utils/questionFetchers";
import { formatQuestion } from "./utils/questionFormatters";
import type { QuestionCandidate } from "./utils/questionUtils";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const supabase = await createSupabaseServerClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { teamId } = await params;
		const body = await request.json();

		// Strict validation of request body
		const validatedRequest = QuestionGenerationRequestSchema.parse(body);

		const {
			event_name,
			question_count,
			question_types,
			subtopics,
			time_limit_minutes,
			division,
			id_percentage: idPercentage,
			pure_id_only: pureIdOnly,
			difficulties,
		} = validatedRequest;

		const { eventName, targetEvents } = resolveEventName(event_name);
		const capabilities = getEventCapabilities(eventName);

		// Resolve team slug to team units and verify user has access
		const teamInfo = await resolveTeamSlugToUnits(teamId);

		// Check if user is captain or co-captain of any team unit in this group
		const isCaptain = await isUserCaptain(user.id, teamInfo.teamUnitIds);

		if (!isCaptain) {
			return NextResponse.json(
				{ error: "Only captains can generate questions" },
				{ status: 403 },
			);
		}

		const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		let questions: QuestionCandidate[] = await fetchQuestionsFromEvents(
			targetEvents,
			question_count,
			question_types,
			division,
			subtopics,
			difficulties,
			origin,
			capabilities.maxQuestions,
		);

		// Handle image support - fetch from id-questions API if needed
		if (pureIdOnly) {
			questions = await fetchIdQuestionsFromEvents(
				targetEvents,
				question_count,
				question_types,
				division,
				subtopics,
				difficulties,
				origin,
				true,
			);
		} else if (idPercentage !== undefined && idPercentage > 0) {
			// Fetch mixed questions from all target events
			const idQuestionsCount = Math.round(
				(idPercentage / 100) * question_count,
			);
			const regularQuestionsCount = question_count - idQuestionsCount;

			const [regularQuestions, idQuestions] = await Promise.all([
				regularQuestionsCount > 0
					? fetchQuestionsFromEvents(
							targetEvents,
							regularQuestionsCount,
							question_types,
							division,
							subtopics,
							difficulties,
							origin,
							capabilities.maxQuestions,
						)
					: Promise.resolve([]),
				idQuestionsCount > 0
					? fetchIdQuestionsFromEvents(
							targetEvents,
							idQuestionsCount,
							question_types,
							division,
							subtopics,
							difficulties,
							origin,
							false,
						)
					: Promise.resolve([]),
			]);

			// Combine and shuffle the results
			const allMixedQuestions = [...regularQuestions, ...idQuestions];
			questions = shuffleArray(allMixedQuestions).slice(0, question_count);
		}

		/**
		 * Format and validate questions for assignment
		 *
		 * CRITICAL: This function ensures EVERY question has a valid answers field.
		 * Questions without valid answers are REJECTED with a clear error message.
		 *
		 * @throws {Error} If any question is missing valid answers
		 */
		const validQuestions = questions
			.filter((question) => {
				const optionList = Array.isArray(question.options)
					? question.options
					: undefined;
				const answerList = Array.isArray(question.answers)
					? question.answers
					: undefined;
				const hasContent =
					(optionList?.length ?? 0) > 0 || (answerList?.length ?? 0) > 0;
				return hasContent;
			})
			.slice(0, question_count)
			.map((question, index: number) =>
				formatQuestion(question, index, origin),
			);

		if (validQuestions.length === 0) {
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

		return NextResponse.json({
			questions: validQuestions,
			metadata: {
				eventName,
				questionCount: validQuestions.length,
				capabilities,
				timeLimit: time_limit_minutes,
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
