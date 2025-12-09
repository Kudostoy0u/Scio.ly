import {
	ApiErrors,
	handleApiError,
	successResponse,
	validateFields,
} from "@/lib/api/utils";
import { geminiService } from "@/lib/services/gemini";
import {
	cacheExplanation,
	getCachedExplanation,
} from "@/lib/services/gemini/cache";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logging/logger";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

interface ExplainRequest extends Record<string, unknown> {
	question: Record<string, unknown>;
	event: string;
	userAnswer?: string;
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validation = validateFields<ExplainRequest>(body, [
			"question",
			"event",
		]);

		if (!validation.valid) {
			return validation.error;
		}

		const { question, event, userAnswer } = validation.data;

		logger.info(`Gemini explain request received for event: ${event}`);

		// Check cache first
		const cachedExplanation = await getCachedExplanation(
			question,
			event,
			userAnswer,
		);
		if (cachedExplanation) {
			logger.info("Returning cached explanation");
			return successResponse<ApiResponse["data"]>({
				explanation: cachedExplanation,
			});
		}

		if (!geminiService.isAvailable()) {
			logger.warn("Gemini AI not available");
			return ApiErrors.serverError("Gemini AI not available");
		}

		logger.info("Sending explain request to Gemini AI");

		try {
			const result = await geminiService.explain(
				question,
				userAnswer || "",
				event,
			);

			logger.info("Gemini AI explain response received");

			// Cache the explanation for future use
			void cacheExplanation(question, event, result.explanation, userAnswer);

			return successResponse<ApiResponse["data"]>(result);
		} catch (error) {
			logger.error("Gemini AI explain error:", error);
			return ApiErrors.serverError("Failed to generate explanation");
		}
	} catch (error) {
		logger.error("POST /api/gemini/explain error:", error);
		return handleApiError(error);
	}
}
