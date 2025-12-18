/**
 * Service class for integrating with Google Gemini AI API
 * Provides functionality for question analysis, explanation generation, and content processing
 */

import logger from "@/lib/utils/logging/logger";
import { GeminiAnalysisService } from "./gemini/analysis";
import { GeminiClientManager } from "./gemini/client";
import { GeminiEditingService } from "./gemini/editing";
import { GeminiExplanationService } from "./gemini/explanation";
import { GeminiGradingService } from "./gemini/grading";
import { GeminiValidationService } from "./gemini/validation";

/**
 * Main Gemini service class
 * Orchestrates all Gemini AI operations
 */
export class GeminiService {
	private clientManager: GeminiClientManager;

	/**
	 * Initializes the Gemini service with available API key
	 */
	constructor() {
		this.clientManager = new GeminiClientManager();

		if (!this.clientManager.hasClient()) {
			logger.warn("Gemini service initialized without client");
		}
	}

	/**
	 * Executes a Gemini operation with retry logic
	 * @param {Function} operation - Function that takes a ClientWithKey and returns a Promise
	 * @returns {Promise<T>} Result of the operation
	 */
	private async executeOperation<T>(
		operation: (
			clientWithKey: import("./gemini/client").ClientWithKey,
		) => Promise<T>,
	): Promise<T> {
		const maxAttempts = 2;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const clientWithKey = this.clientManager.getClient();
				return await operation(clientWithKey);
			} catch (error) {
				lastError = error as Error;
				const errorMessage = (error as Error).message || String(error);

				// Don't retry on parsing errors (these are not transient API errors)
				if (errorMessage.includes("Invalid response format from Gemini")) {
					throw error;
				}

				logger.warn(`Gemini API attempt ${attempt + 1} failed`, {
					attempt: attempt + 1,
					maxAttempts,
					error: errorMessage,
				});

				if (attempt === maxAttempts - 1) {
					throw error;
				}

				// Optional: add a small delay before retry
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		throw lastError || new Error("Operation failed");
	}

	/**
	 * Analyzes a question and user's answer
	 */
	public async analyzeQuestion(
		question: Record<string, unknown>,
		userAnswer: string,
		event: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const analysisService = new GeminiAnalysisService(clientWithKey);
			return await analysisService.analyzeQuestion(question, userAnswer, event);
		});
	}

	/**
	 * Analyzes a question to determine if it should be removed
	 */
	public async analyzeQuestionForRemoval(
		question: Record<string, unknown>,
		event: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const analysisService = new GeminiAnalysisService(clientWithKey);
			return await analysisService.analyzeQuestionForRemoval(question, event);
		});
	}

	/**
	 * Generates an explanation for a question
	 */
	public async explain(
		question: Record<string, unknown>,
		userAnswer: string,
		event: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const explanationService = new GeminiExplanationService(clientWithKey);
			return await explanationService.explain(question, userAnswer, event);
		});
	}

	/**
	 * Suggests improvements for a question
	 */
	public async suggestEdit(
		question: Record<string, unknown>,
		userReason?: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const editingService = new GeminiEditingService(clientWithKey);
			return await editingService.suggestEdit(question, userReason);
		});
	}

	/**
	 * Validates an edit to a question
	 */
	public async validateEdit(
		originalQuestion: Record<string, unknown>,
		editedQuestion: Record<string, unknown>,
		event: string,
		reason: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const validationService = new GeminiValidationService(clientWithKey);
			return await validationService.validateEdit(
				originalQuestion,
				editedQuestion,
				event,
				reason,
			);
		});
	}

	/**
	 * Improves a report edit reason
	 */
	public async improveReportEditReason(originalReason: string, event: string) {
		return await this.executeOperation(async (clientWithKey) => {
			const validationService = new GeminiValidationService(clientWithKey);
			return await validationService.improveReportEditReason(
				originalReason,
				event,
			);
		});
	}

	/**
	 * Validates a report edit
	 */
	public async validateReportEdit(
		originalQuestion: Record<string, unknown>,
		editedQuestion: Record<string, unknown>,
		event: string,
		reason: string,
	) {
		return await this.validateEdit(
			originalQuestion,
			editedQuestion,
			event,
			reason,
		);
	}

	/**
	 * Checks if the service is available
	 */
	public isAvailable(): boolean {
		return this.clientManager.hasClient();
	}

	/**
	 * Extracts questions from text
	 */
	public async extractQuestions(
		text: string,
	): Promise<Record<string, unknown>> {
		return await this.executeOperation(async (clientWithKey) => {
			try {
				const response = await clientWithKey.client.models.generateContent({
					model: "gemini-flash-lite-latest",
					contents: `Extract Science Olympiad questions from this text: ${text}`,
					config: {
						responseMimeType: "application/json",
						temperature: 0.1,
						topP: 0.8,
						topK: 40,
					},
				});
				return JSON.parse(response.text || "{}");
			} catch (error) {
				const maskedKey = this.clientManager.getMaskedApiKey();
				logger.error("Gemini API error in extractQuestions", error as Error, {
					apiKey: maskedKey,
				});
				throw new Error(
					`Gemini API error (key: ${maskedKey}): ${(error as Error).message}`,
				);
			}
		});
	}

	/**
	 * Grades free response answers
	 */
	public async gradeFreeResponses(
		responses: Array<{
			question: string;
			correctAnswers: (string | number)[];
			studentAnswer: string;
		}>,
	): Promise<{ scores: number[] }> {
		return await this.executeOperation(async (clientWithKey) => {
			const gradingService = new GeminiGradingService(clientWithKey);
			return await gradingService.gradeFreeResponses(responses);
		});
	}

	/**
	 * Improves a reason
	 */
	public async improveReason(
		reason: string,
		question: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const result = await this.improveReportEditReason(
			reason,
			(question.event as string) || "",
		);
		return { improvedReason: result.improvedReason };
	}

	/**
	 * Validates a quote for appropriateness and language
	 */
	public async validateQuote(
		quote: Record<string, unknown>,
		cipherType: string,
	) {
		return await this.executeOperation(async (clientWithKey) => {
			const validationService = new GeminiValidationService(clientWithKey);
			return await validationService.validateQuote(quote, cipherType);
		});
	}
}

// Export the singleton instance
export const geminiService = new GeminiService();
