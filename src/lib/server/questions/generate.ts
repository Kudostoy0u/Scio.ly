/**
 * Reusable question generation function
 * Uses the same logic as /practice feature
 * Server-side implementation that directly calls API endpoints
 */

import { buildAbsoluteUrl } from "@/app/test/utils/questionMedia";
import type { Question } from "@/app/utils/geminiService";
import { difficultyRanges } from "@/app/utils/questionUtils";
import {
	type IdQuestionQueryFilters,
	type QuestionQueryFilters,
	queryIdQuestions,
	queryQuestions,
} from "@/lib/server/questions/query";
import { getMappedEventNameForApi } from "@/lib/utils/assessments/eventConfig";
import logger from "@/lib/utils/logging/logger";

export interface QuestionGenerationParams {
	eventName: string;
	questionCount: number;
	questionType: "mcq" | "frq" | "both";
	division?: string;
	idPercentage?: number;
	pureIdOnly?: boolean;
	difficulties?: string[];
	rmTypeFilter?: "rock" | "mineral";
	subtopics?: string[];
}

/**
 * Build API query parameters for server-side use
 */
function buildServerApiParams(
	eventName: string,
	count: number,
	types: string,
	division: string,
	difficulties: string[],
	subtopics?: string[],
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("event", eventName);
	params.set("limit", String(count));

	if (types === "multiple-choice") {
		params.set("question_type", "mcq");
	} else if (types === "free-response") {
		params.set("question_type", "frq");
	} else if (types === "both") {
		// For "both", don't set question_type - API will return both
	}

	if (division && division !== "any") {
		params.set("division", division);
	}

	if (subtopics && subtopics.length > 0) {
		params.set("subtopics", subtopics.join(","));
	}

	// Handle difficulties
	if (
		difficulties &&
		difficulties.length > 0 &&
		!difficulties.includes("any")
	) {
		const allRanges = difficulties
			.map((d: string) => {
				if (d in difficultyRanges) {
					const range = difficultyRanges[d];
					return typeof range === "object" &&
						range !== null &&
						"min" in range &&
						"max" in range
						? (range as { min: number; max: number })
						: undefined;
				}
				return undefined;
			})
			.filter((r): r is { min: number; max: number } => r !== undefined);

		if (allRanges.length > 0) {
			const minValue = Math.min(...allRanges.map((r) => r.min));
			const maxValue = Math.max(...allRanges.map((r) => r.max));
			params.set("difficulty_min", minValue.toFixed(2));
			params.set("difficulty_max", maxValue.toFixed(2));
		}
	}

	return params;
}

/**
 * Fetch base questions from API (server-side)
 */
async function fetchBaseQuestionsServer(
	eventName: string,
	count: number,
	types: string,
	division: string,
	difficulties: string[],
	origin: string,
	subtopics?: string[],
): Promise<Question[]> {
	// Apply event name mapping for API calls
	const mappedEventName = getMappedEventNameForApi(eventName);
	const params = buildServerApiParams(
		mappedEventName,
		count,
		types,
		division,
		difficulties,
		subtopics,
	);
	logger.dev.structured("debug", "[fetchBaseQuestionsServer] Querying", {
		eventName,
		count,
		types,
		params: params.toString(),
	});

	const filters = Object.fromEntries(params.entries()) as QuestionQueryFilters;
	const results = await queryQuestions(filters);
	logger.dev.structured("debug", "[fetchBaseQuestionsServer] API response", {
		responseKeys: Object.keys(results[0] ?? {}),
		hasData: results.length > 0,
		dataLength: results.length,
	});

	const questions: Question[] = results.map((row) => {
		const imageData =
			typeof row.imageData === "string"
				? buildAbsoluteUrl(row.imageData, origin)
				: undefined;
		return {
			id: row.id,
			question: row.question || "",
			options: Array.isArray(row.options) ? row.options : [],
			answers: Array.isArray(row.answers) ? row.answers : [],
			difficulty: typeof row.difficulty === "number" ? row.difficulty : 0.5,
			event: row.event,
			subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
			imageData,
		};
	});

	logger.dev.structured("debug", "[fetchBaseQuestionsServer] Fetched", {
		count: questions.length,
		requested: count,
	});

	return questions;
}

/**
 * Fetch ID questions from API (server-side)
 */
async function fetchIdQuestionsServer(
	eventName: string,
	count: number,
	types: string,
	division: string,
	difficulties: string[],
	pureIdOnly: boolean,
	origin: string,
	rmTypeFilter?: "rock" | "mineral",
): Promise<Question[]> {
	// Apply event name mapping for API calls
	const mappedEventName = getMappedEventNameForApi(eventName);
	const params = new URLSearchParams();
	params.set("event", mappedEventName);
	params.set("limit", String(count));

	if (types === "multiple-choice") {
		params.set("question_type", "mcq");
	} else if (types === "free-response") {
		params.set("question_type", "frq");
	}

	if (division && division !== "any") {
		params.set("division", division);
	}

	if (pureIdOnly) {
		params.set("pure_id_only", "true");
	}

	// Add rm_type filter for Rocks and Minerals if specified
	if (rmTypeFilter && (rmTypeFilter === "rock" || rmTypeFilter === "mineral")) {
		params.set("rm_type", rmTypeFilter);
	}

	// Handle difficulties
	if (
		difficulties &&
		difficulties.length > 0 &&
		!difficulties.includes("any")
	) {
		const allRanges = difficulties
			.map((d: string) => {
				if (d in difficultyRanges) {
					const range = difficultyRanges[d];
					return typeof range === "object" &&
						range !== null &&
						"min" in range &&
						"max" in range
						? (range as { min: number; max: number })
						: undefined;
				}
				return undefined;
			})
			.filter((r): r is { min: number; max: number } => r !== undefined);

		if (allRanges.length > 0) {
			const minValue = Math.min(...allRanges.map((r) => r.min));
			const maxValue = Math.max(...allRanges.map((r) => r.max));
			params.set("difficulty_min", minValue.toFixed(2));
			params.set("difficulty_max", maxValue.toFixed(2));
		}
	}

	logger.dev.structured("debug", "[fetchIdQuestionsServer] Querying", {
		eventName,
		count,
		pureIdOnly,
		rmTypeFilter,
		params: params.toString(),
	});

	const filters = Object.fromEntries(
		params.entries(),
	) as IdQuestionQueryFilters;
	const results = await queryIdQuestions(filters);
	const questions: Question[] = results.map((row) => {
		let imageData: string | undefined;
		if (Array.isArray(row.images) && row.images.length > 0) {
			const imageUrl = String(
				row.images[Math.floor(Math.random() * row.images.length)],
			);
			imageData = buildAbsoluteUrl(imageUrl, origin);
		}

		return {
			id: row.id,
			question: row.question || "",
			options: Array.isArray(row.options) ? row.options : [],
			answers: Array.isArray(row.answers) ? row.answers : [],
			difficulty: typeof row.difficulty === "number" ? row.difficulty : 0.5,
			event: row.event,
			subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
			imageData,
		};
	});

	logger.dev.structured("debug", "[fetchIdQuestionsServer] Fetched", {
		count: questions.length,
	});

	return questions;
}

/**
 * Check if event supports ID questions
 */
function supportsIdEvent(eventName?: string): boolean {
	if (!eventName) {
		return false;
	}
	const supportedEvents = new Set([
		"Anatomy & Physiology",
		"Astronomy",
		"Cell Biology",
		"Chemistry Lab",
		"Disease Detectives",
		"Ecology",
		"Entomology",
		"Forensics",
		"Forestry",
		"Geology",
		"Herpetology",
		"Invasive Species",
		"Optics",
		"Ornithology",
		"Rocks and Minerals",
		"Water Quality",
	]);
	const base = eventName.split(" - ")[0];
	return supportedEvents.has(base || "");
}

/**
 * Generate questions using the same logic as practice feature
 * Server-side implementation
 */
export async function generateQuestionsForAssignment(
	params: QuestionGenerationParams,
): Promise<Question[]> {
	const startTime = Date.now();
	const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

	logger.dev.structured("info", "[generateQuestionsForAssignment] Starting", {
		eventName: params.eventName,
		questionCount: params.questionCount,
		questionType: params.questionType,
		division: params.division,
		idPercentage: params.idPercentage,
		pureIdOnly: params.pureIdOnly,
		difficulties: params.difficulties,
		rmTypeFilter: params.rmTypeFilter,
	});

	try {
		const types =
			params.questionType === "both"
				? "both"
				: params.questionType === "mcq"
					? "multiple-choice"
					: "free-response";
		const division = params.division || "any";
		const difficulties = params.difficulties || ["any"];
		const idPercentage = params.idPercentage || 0;
		const pureIdOnly = params.pureIdOnly || false;
		const rmTypeFilter = params.rmTypeFilter;
		const subtopics = params.subtopics;

		// Special handling for Anatomy & Physiology - split into thirds
		const isAnatomyMain = params.eventName === "Anatomy & Physiology";

		let questions: Question[] = [];

		// Handle Anatomy & Physiology splitting
		if (isAnatomyMain && !pureIdOnly) {
			const countTarget = params.questionCount;
			const perThird = Math.max(1, Math.floor(countTarget / 3));
			const extra = Math.max(0, countTarget - 3 * perThird);
			const wants = [
				perThird + (extra > 0 ? 1 : 0),
				perThird + (extra > 1 ? 1 : 0),
				perThird,
			];

			const [anatomyEventEndo, anatomyEventNerv, anatomyEventSense] = [
				"Anatomy - Endocrine",
				"Anatomy - Nervous",
				"Anatomy - Sense Organs",
			] as const;

			logger.dev.structured(
				"info",
				"[generateQuestionsForAssignment] Splitting Anatomy & Physiology",
				{
					totalCount: countTarget,
					perThird,
					extra,
					wants,
				},
			);

			// Fetch questions from all three anatomy events
			const [poolEndo, poolNerv, poolSense] = await Promise.all([
				fetchBaseQuestionsServer(
					anatomyEventEndo,
					perThird * 2, // Request more to ensure we have enough
					types,
					division,
					difficulties,
					origin,
					subtopics,
				),
				fetchBaseQuestionsServer(
					anatomyEventNerv,
					perThird * 2,
					types,
					division,
					difficulties,
					origin,
					subtopics,
				),
				fetchBaseQuestionsServer(
					anatomyEventSense,
					perThird * 2,
					types,
					division,
					difficulties,
					origin,
					subtopics,
				),
			]);

			// Deduplicate by question text and pick from each pool
			const seen = new Set<string>();
			const takeUniqueByText = (
				pool: Question[],
				count: number,
			): Question[] => {
				const out: Question[] = [];
				for (const q of pool) {
					if (out.length >= count) {
						break;
					}
					const text =
						typeof q.question === "string"
							? q.question.trim().toLowerCase()
							: "";
					if (!text || seen.has(text)) {
						continue;
					}
					seen.add(text);
					out.push(q);
				}
				return out;
			};

			const pickedEndo = takeUniqueByText(poolEndo, wants[0] || 0);
			const pickedNerv = takeUniqueByText(poolNerv, wants[1] || 0);
			const pickedSense = takeUniqueByText(poolSense, wants[2] || 0);
			let pickedAll = pickedEndo.concat(pickedNerv).concat(pickedSense);

			// If we don't have enough, fill from leftovers
			if (pickedAll.length < countTarget) {
				const deficit = countTarget - pickedAll.length;
				const leftovers = poolEndo.concat(poolNerv, poolSense).filter((q) => {
					const text =
						typeof q.question === "string"
							? q.question.trim().toLowerCase()
							: "";
					return text && !seen.has(text);
				});
				pickedAll = pickedAll.concat(leftovers.slice(0, deficit));
			}

			questions = pickedAll.slice(0, countTarget);

			// Handle ID questions if needed
			if (idPercentage > 0 && supportsIdEvent(params.eventName)) {
				const idCount = Math.round((idPercentage / 100) * params.questionCount);
				if (idCount > 0) {
					// For Anatomy, fetch ID questions from all three events
					const idPerThird = Math.max(1, Math.floor(idCount / 3));
					const idExtra = Math.max(0, idCount - 3 * idPerThird);
					const idWants = [
						idPerThird + (idExtra > 0 ? 1 : 0),
						idPerThird + (idExtra > 1 ? 1 : 0),
						idPerThird,
					];

					const [idEndo, idNerv, idSense] = await Promise.all([
						fetchIdQuestionsServer(
							anatomyEventEndo,
							idPerThird * 2,
							types,
							division,
							difficulties,
							false,
							origin,
							rmTypeFilter,
						),
						fetchIdQuestionsServer(
							anatomyEventNerv,
							idPerThird * 2,
							types,
							division,
							difficulties,
							false,
							origin,
							rmTypeFilter,
						),
						fetchIdQuestionsServer(
							anatomyEventSense,
							idPerThird * 2,
							types,
							division,
							difficulties,
							false,
							origin,
							rmTypeFilter,
						),
					]);

					// Deduplicate ID questions
					const idSeen = new Set<string>();
					const takeUniqueId = (
						pool: Question[],
						count: number,
					): Question[] => {
						const out: Question[] = [];
						for (const q of pool) {
							if (out.length >= count) {
								break;
							}
							const text =
								typeof q.question === "string"
									? q.question.trim().toLowerCase()
									: "";
							if (!text || idSeen.has(text)) {
								continue;
							}
							idSeen.add(text);
							out.push(q);
						}
						return out;
					};

					const pickedIdEndo = takeUniqueId(idEndo, idWants[0] || 0);
					const pickedIdNerv = takeUniqueId(idNerv, idWants[1] || 0);
					const pickedIdSense = takeUniqueId(idSense, idWants[2] || 0);
					const pickedIdAll = pickedIdEndo
						.concat(pickedIdNerv)
						.concat(pickedIdSense);

					questions = questions.concat(pickedIdAll.slice(0, idCount));

					// Shuffle combined questions
					for (let i = questions.length - 1; i > 0; i--) {
						const j = Math.floor(Math.random() * (i + 1));
						const temp = questions[i];
						const temp2 = questions[j];
						if (temp !== undefined && temp2 !== undefined) {
							questions[i] = temp2;
							questions[j] = temp;
						}
					}
					questions = questions.slice(0, params.questionCount);
				}
			}
		} else if (pureIdOnly) {
			// Handle pure ID only
			questions = await fetchIdQuestionsServer(
				params.eventName,
				params.questionCount,
				types,
				division,
				difficulties,
				true,
				origin,
				rmTypeFilter,
			);
		} else if (idPercentage > 0 && supportsIdEvent(params.eventName)) {
			// Mixed questions
			const idCount = Math.round((idPercentage / 100) * params.questionCount);
			const regularCount = params.questionCount - idCount;

			const [regularQuestions, idQuestions] = await Promise.all([
				regularCount > 0
					? fetchBaseQuestionsServer(
							params.eventName,
							regularCount,
							types,
							division,
							difficulties,
							origin,
							subtopics,
						)
					: Promise.resolve([]),
				idCount > 0
					? fetchIdQuestionsServer(
							params.eventName,
							idCount,
							types,
							division,
							difficulties,
							false,
							origin,
							rmTypeFilter,
						)
					: Promise.resolve([]),
			]);

			// Combine and shuffle
			questions = [...regularQuestions, ...idQuestions];
			// Simple shuffle
			for (let i = questions.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = questions[i];
				const temp2 = questions[j];
				if (temp !== undefined && temp2 !== undefined) {
					questions[i] = temp2;
					questions[j] = temp;
				}
			}
			questions = questions.slice(0, params.questionCount);
		} else {
			// Regular questions only
			questions = await fetchBaseQuestionsServer(
				params.eventName,
				params.questionCount,
				types,
				division,
				difficulties,
				origin,
				subtopics,
			);

			// If we got 0 questions, try fetching without type filter first
			// This handles cases where the question_type filter is too restrictive
			if (questions.length === 0 && types !== "both") {
				logger.dev.structured(
					"warn",
					"[generateQuestionsForAssignment] Got 0 questions, trying without type filter",
					{
						eventName: params.eventName,
						types,
					},
				);

				// Try fetching both types and filter client-side
				const bothTypesQuestions = await fetchBaseQuestionsServer(
					params.eventName,
					params.questionCount * 3, // Request more to account for filtering
					"both",
					division,
					difficulties,
					origin,
					subtopics,
				);

				logger.dev.structured(
					"debug",
					"[generateQuestionsForAssignment] Fetched both types",
					{
						count: bothTypesQuestions.length,
					},
				);

				// Filter by type client-side
				const filteredByType = bothTypesQuestions.filter((q) => {
					const isMcq = Array.isArray(q.options) && q.options.length > 0;
					if (types === "multiple-choice") {
						return isMcq;
					}
					if (types === "free-response") {
						return !isMcq;
					}
					return true;
				});

				logger.dev.structured(
					"debug",
					"[generateQuestionsForAssignment] Filtered by type",
					{
						beforeFilter: bothTypesQuestions.length,
						afterFilter: filteredByType.length,
						requestedType: types,
					},
				);

				questions = filteredByType.slice(0, params.questionCount);

				logger.dev.structured(
					"info",
					"[generateQuestionsForAssignment] After retry without type filter",
					{
						finalCount: questions.length,
						requested: params.questionCount,
					},
				);
			} else if (
				questions.length > 0 &&
				questions.length < params.questionCount &&
				types !== "both"
			) {
				// If we got some but not enough, try to get more
				logger.dev.structured(
					"warn",
					"[generateQuestionsForAssignment] Got fewer questions than requested, trying to get more",
					{
						got: questions.length,
						requested: params.questionCount,
						types,
					},
				);

				// Try fetching both types and filter client-side
				const bothTypesQuestions = await fetchBaseQuestionsServer(
					params.eventName,
					params.questionCount * 2, // Request more to account for filtering
					"both",
					division,
					difficulties,
					origin,
					subtopics,
				);

				// Filter by type client-side
				const filteredByType = bothTypesQuestions.filter((q) => {
					const isMcq = Array.isArray(q.options) && q.options.length > 0;
					if (types === "multiple-choice") {
						return isMcq;
					}
					if (types === "free-response") {
						return !isMcq;
					}
					return true;
				});

				// Deduplicate by question text and combine
				const existingTexts = new Set(
					questions.map((q) => q.question?.trim().toLowerCase() || ""),
				);
				const uniqueAdditional = filteredByType.filter(
					(q) => !existingTexts.has(q.question?.trim().toLowerCase() || ""),
				);

				questions = [...questions, ...uniqueAdditional].slice(
					0,
					params.questionCount,
				);

				logger.dev.structured(
					"info",
					"[generateQuestionsForAssignment] After retry to get more",
					{
						finalCount: questions.length,
						requested: params.questionCount,
					},
				);
			}
		}

		const duration = Date.now() - startTime;
		logger.dev.structured("info", "[generateQuestionsForAssignment] Success", {
			questionCount: questions.length,
			requestedCount: params.questionCount,
			duration: `${duration}ms`,
		});

		return questions;
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.dev.error(
			"[generateQuestionsForAssignment] Error",
			error instanceof Error ? error : new Error(String(error)),
			{
				eventName: params.eventName,
				questionCount: params.questionCount,
				duration: `${duration}ms`,
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			},
		);
		logger.error("[generateQuestionsForAssignment] Error", error);
		throw error;
	}
}
