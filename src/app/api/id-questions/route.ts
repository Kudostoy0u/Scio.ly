import {
	createSuccessResponse,
	handleApiError,
	logApiRequest,
	logApiResponse,
} from "@/lib/api/utils";
import {
	type IdQuestionQueryFilters,
	queryIdQuestions,
} from "@/lib/server/questions/query";
import type { NextRequest } from "next/server";
import { z } from "zod";

const Filters = z.object({
	event: z.string().optional(),
	division: z.string().optional(),
	subtopic: z.string().optional(),
	subtopics: z.string().optional(),
	difficulty_min: z.string().optional(),
	difficulty_max: z.string().optional(),
	limit: z.string().optional(),
	question_type: z.string().optional(),
	pure_id_only: z.string().optional(),
	rm_type: z.string().optional(), // 'rock', 'mineral', or undefined for both
});

export async function GET(request: NextRequest) {
	const started = Date.now();
	logApiRequest(
		"GET",
		"/api/id-questions",
		Object.fromEntries(request.nextUrl.searchParams),
	);
	try {
		const p = Filters.parse(Object.fromEntries(request.nextUrl.searchParams));
		const data = await queryIdQuestions(p as IdQuestionQueryFilters);
		const res = createSuccessResponse(data);
		logApiResponse("GET", "/api/id-questions", 200, Date.now() - started);
		return res;
	} catch (err) {
		const res = handleApiError(err);
		logApiResponse(
			"GET",
			"/api/id-questions",
			res.status,
			Date.now() - started,
		);
		return res;
	}
}
