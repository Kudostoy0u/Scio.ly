import {
	ApiErrors,
	handleApiError,
	successResponse,
	validateFields,
} from "@/lib/api/utils";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logging/logger";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

interface SuggestEditRequest extends Record<string, unknown> {
	question: Record<string, unknown>;
	userReason?: string;
}

// post /api/gemini/suggest-edit for ai suggestions for improving a question
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validation = validateFields<SuggestEditRequest>(body, ["question"]);

		if (!validation.valid) {
			return validation.error;
		}

		const { question, userReason } = validation.data;

		logger.info("Gemini suggest-edit request received");
		if (userReason) {
			logger.info(`User reason: ${userReason}`);
		}

		if (!geminiService.isAvailable()) {
			logger.warn("Gemini AI not available");
			return ApiErrors.serverError("Gemini AI not available");
		}

		logger.info("Sending suggest-edit request to Gemini AI");

		try {
			const result = await geminiService.suggestEdit(question, userReason);

			logger.info("Gemini AI suggest-edit response received");
			logger.debug("AI Suggestions", {
				suggestedQuestion: result.suggestedQuestion,
				suggestedOptions: result.suggestedOptions,
				suggestedAnswers: result.suggestedAnswers,
				suggestedDifficulty: result.suggestedDifficulty,
			});

			return successResponse<ApiResponse["data"]>(result);
		} catch (error) {
			logger.error("Gemini AI suggest-edit error:", error);
			return ApiErrors.serverError("Failed to generate edit suggestions");
		}
	} catch (error) {
		logger.error("POST /api/gemini/suggest-edit error:", error);
		return handleApiError(error);
	}
}
