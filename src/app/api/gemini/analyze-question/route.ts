import { ApiErrors, handleApiError, successResponse, validateFields } from "@/lib/api/utils";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

interface AnalyzeQuestionRequest extends Record<string, unknown> {
  question: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<AnalyzeQuestionRequest>(body, ["question"]);

    if (!validation.valid) {
      return validation.error;
    }

    const { question } = validation.data;

    logger.info("Gemini analyze-question request received");

    if (!geminiService.isAvailable()) {
      logger.warn("Gemini AI not available");
      return ApiErrors.serverError("Gemini AI not available");
    }

    logger.debug("Question details", {
      questionText: question.question || "",
      options: question.options || [],
      answers: question.answers || [],
      subject: question.subject || "",
      difficulty: question.difficulty || 0.5,
    });

    logger.info("Sending analyze-question request to Gemini AI");

    try {
      const result = await geminiService.analyzeQuestion(
        question,
        "",
        (question.event as string) || ""
      );

      logger.info("Gemini AI analyze-question response received");

      return successResponse<ApiResponse["data"]>(result);
    } catch (error) {
      logger.error("Gemini AI analyze-question error:", error);
      return ApiErrors.serverError("Failed to analyze question");
    }
  } catch (error) {
    logger.error("POST /api/gemini/analyze-question error:", error);
    return handleApiError(error);
  }
}
