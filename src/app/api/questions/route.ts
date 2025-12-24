import { ApiError, handleApiError, parseRequestBody } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import {
	TRULY_RANDOM_SELECTION,
	queryQuestions,
	transformDatabaseResult,
} from "@/lib/server/questions/query";
import type { Question } from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const QuestionFiltersSchema = z.object({
	event: z.string().optional(),
	division: z.string().optional(),
	tournament: z.string().optional(),
	subtopic: z.string().optional(),
	subtopics: z.string().optional(),
	difficulty_min: z.string().optional(),
	difficulty_max: z.string().optional(),
	question_type: z.enum(["mcq", "frq"]).optional(),
	limit: z.string().optional(),
});

const CreateQuestionSchema = z.object({
	question: z.string().min(1, "Question is required"),
	tournament: z.string().min(1, "Tournament is required"),
	division: z.string().min(1, "Division is required"),
	event: z.string().min(1, "Event is required"),
	options: z.array(z.string()).optional().default([]),
	answers: z
		.array(z.union([z.string(), z.number()]))
		.optional()
		.default([]),
	subtopics: z.array(z.string()).optional().default([]),
	difficulty: z.number().min(0).max(1).optional().default(0.5),
});

type ValidatedQuestionFilters = z.infer<typeof QuestionFiltersSchema>;
type ValidatedCreateQuestion = z.infer<typeof CreateQuestionSchema>;

type DatabaseQuestion = {
	id: string;
	question: string;
	tournament: string;
	division: string;
	event: string;
	difficulty: string | null;
	options: unknown;
	answers: unknown;
	subtopics: unknown;
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
};

const CACHE_TTL_MS = 60000;
const questionsCache = new Map<
	string,
	{ expiresAt: number; data: Question[] }
>();
const inflight = new Map<string, Promise<Question[]>>();

function makeCacheKey(filters: ValidatedQuestionFilters): string {
	const parts: string[] = [];
	const entries = Object.entries(filters).filter(
		([, v]) => v !== undefined,
	) as [string, string][];
	entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	for (const [k, v] of entries) {
		parts.push(`${k}=${v}`);
	}
	return parts.join("&");
}

const parseAndValidateFilters = (
	searchParams: URLSearchParams,
): ValidatedQuestionFilters => {
	const rawFilters = {
		event: searchParams.get("event") || undefined,
		division: searchParams.get("division") || undefined,
		tournament: searchParams.get("tournament") || undefined,
		subtopic: searchParams.get("subtopic") || undefined,
		subtopics: searchParams.get("subtopics") || undefined,
		difficulty_min: searchParams.get("difficulty_min") || undefined,
		difficulty_max: searchParams.get("difficulty_max") || undefined,
		question_type:
			(searchParams.get("question_type") as "mcq" | "frq") || undefined,
		limit: searchParams.get("limit") || undefined,
	};

	return QuestionFiltersSchema.parse(rawFilters);
};

const createQuestion = async (
	data: ValidatedCreateQuestion,
): Promise<Question> => {
	const id = uuidv4();

	const result = await db
		.insert(questions)
		.values({
			id,
			question: data.question,
			tournament: data.tournament,
			division: data.division,
			event: data.event,
			options: data.options,
			answers: data.answers,
			subtopics: data.subtopics,
			difficulty: data.difficulty.toString(),
			// randomf will default to random() via schema
		})
		.returning();

	const question = result[0];
	if (!question) {
		throw new ApiError(500, "Failed to create question", "CREATE_FAILED");
	}

	return transformDatabaseResult(question as DatabaseQuestion);
};

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const filters = parseAndValidateFilters(searchParams);

		// For truly random selection, bypass caches entirely and disable response caching
		if (TRULY_RANDOM_SELECTION) {
			const data = await queryQuestions(filters);
			const res = NextResponse.json({ success: true, data });
			res.headers.set("Cache-Control", "no-store");
			return res;
		}

		// Existing behavior with short-term caching
		const cacheKey = makeCacheKey(filters);
		const now = Date.now();
		const cached = questionsCache.get(cacheKey);
		if (cached && cached.expiresAt > now) {
			const res = NextResponse.json({ success: true, data: cached.data });
			res.headers.set(
				"Cache-Control",
				"s-maxage=60, stale-while-revalidate=300",
			);
			return res;
		}

		let promise = inflight.get(cacheKey);
		if (!promise) {
			promise = queryQuestions(filters);
			inflight.set(cacheKey, promise);
		}
		const data = await promise.finally(() => inflight.delete(cacheKey));
		questionsCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, data });

		const res = NextResponse.json({ success: true, data });
		res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
		return res;
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(request: NextRequest) {
	try {
		const validatedData = await parseRequestBody(request, CreateQuestionSchema);
		const question = await createQuestion(validatedData);
		return NextResponse.json({
			success: true,
			data: question,
			message: "Question created successfully",
		});
	} catch (error) {
		return handleApiError(error);
	}
}
