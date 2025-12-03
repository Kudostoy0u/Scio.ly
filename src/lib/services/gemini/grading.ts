/**
 * Grading methods for Gemini service
 */

import logger from "@/lib/utils/logger";
import { Type } from "@google/genai";
import type { ClientWithKey } from "./client";
import type { GradingResult } from "./types";

/**
 * Grading service for free response questions
 */
export class GeminiGradingService {
	private clientWithKey: ClientWithKey;

	constructor(clientWithKey: ClientWithKey) {
		this.clientWithKey = clientWithKey;
	}

	/**
	 * Grades multiple free response answers
	 * @param {Array} responses - Array of response objects with question, correctAnswers, and studentAnswer
	 * @returns {Promise<GradingResult>} Grading result with scores array
	 */
	public async gradeFreeResponses(
		responses: Array<{
			question: string;
			correctAnswers: (string | number)[];
			studentAnswer: string;
		}>,
	): Promise<GradingResult> {
		if (!responses || responses.length === 0) {
			return { scores: [] };
		}

		// Build the prompt for grading
		let prompt = `You are a Science Olympiad question grader. Your task is to grade free response answers and return ONLY the scores.

GRADING CRITERIA:
- 1.0 (Full Credit): Answer is correct and demonstrates full understanding
- 0.5 (Partial Credit): Answer shows some understanding but has errors or is incomplete
- 0.0 (No Credit): Answer is incorrect, irrelevant, or shows no understanding

GRADING INSTRUCTIONS:
1. Compare each student answer to the correct answers
2. Consider partial credit for answers that show understanding but have minor issues
3. You can be a bit lenient as long as their answer has the correct answer in it.
4. Return ONLY an array of scores in the exact order of the questions

QUESTIONS TO GRADE:`;

		responses.forEach((response, index) => {
			prompt += `\n\nQuestion ${index + 1}: ${response.question}`;
			prompt += `\nCorrect Answer(s): ${JSON.stringify(response.correctAnswers)}`;
			prompt += `\nStudent Answer: ${response.studentAnswer}`;
		});

		prompt +=
			"\n\nReturn ONLY an array of scores (0, 0.5, or 1) in the same order as the questions.";

		const schema = {
			type: Type.OBJECT,
			properties: {
				scores: {
					type: Type.ARRAY,
					items: {
						type: Type.NUMBER,
						minimum: 0,
						maximum: 1,
					},
					description:
						"Array of scores (0, 0.5, or 1) for each response in order",
				},
			},
			propertyOrdering: ["scores"],
		};

		return await this.generateStructuredContent(prompt, schema);
	}

	/**
	 * Generates structured content using Gemini
	 * @param {string} prompt - Prompt text
	 * @param {object} schema - Response schema
	 * @returns {Promise<T>} Structured response
	 */
	private async generateStructuredContent<T>(
		prompt: string,
		schema: object,
	): Promise<T> {
		try {
			const response = await this.clientWithKey.client.models.generateContent({
				model: "gemini-flash-lite-latest",
				contents: prompt,
				config: {
					responseMimeType: "application/json",
					responseSchema: schema,
					thinkingConfig: {
						thinkingBudget: 3000,
					},
					temperature: 0.1,
					topP: 0.8,
					topK: 40,
				},
			});

			const text = response.text || "{}";

			try {
				return JSON.parse(text) as T;
			} catch (error) {
				const maskedKey =
					this.clientWithKey.apiKey.length > 12
						? `${this.clientWithKey.apiKey.substring(0, 8)}...${this.clientWithKey.apiKey.substring(this.clientWithKey.apiKey.length - 4)}`
						: "***";
				logger.error("Failed to parse Gemini response", error as Error, {
					apiKeyIndex: this.clientWithKey.keyIndex,
					apiKey: maskedKey,
				});
				throw new Error(
					`Invalid response format from Gemini (API key index: ${this.clientWithKey.keyIndex})`,
				);
			}
		} catch (error) {
			const maskedKey =
				this.clientWithKey.apiKey.length > 12
					? `${this.clientWithKey.apiKey.substring(0, 8)}...${this.clientWithKey.apiKey.substring(this.clientWithKey.apiKey.length - 4)}`
					: "***";
			logger.error("Gemini API error", error as Error, {
				apiKeyIndex: this.clientWithKey.keyIndex,
				apiKey: maskedKey,
			});
			throw new Error(
				`Gemini API error (API key index: ${this.clientWithKey.keyIndex}, key: ${maskedKey}): ${(error as Error).message}`,
			);
		}
	}
}
