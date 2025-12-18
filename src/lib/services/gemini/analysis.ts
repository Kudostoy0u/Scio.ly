/**
 * Question analysis methods for Gemini service
 */

import logger from "@/lib/utils/logging/logger";
import { Type } from "@google/genai";
import type { ClientWithKey } from "./client";
import type { QuestionAnalysisResult, QuestionRemovalAnalysis } from "./types";

/**
 * Question analysis service
 */
export class GeminiAnalysisService {
	private clientWithKey: ClientWithKey;

	constructor(clientWithKey: ClientWithKey) {
		this.clientWithKey = clientWithKey;
	}

	/**
	 * Analyzes a question and user's answer
	 * @param {Record<string, unknown>} question - Question data
	 * @param {string} userAnswer - User's answer
	 * @param {string} event - Event name
	 * @returns {Promise<QuestionAnalysisResult>} Analysis result
	 */
	public async analyzeQuestion(
		question: Record<string, unknown>,
		userAnswer: string,
		event: string,
	): Promise<QuestionAnalysisResult> {
		const questionText = question.question || "";
		const options = question.options || [];
		const answers = question.answers || [];
		const answersText = this.resolveAnswersToText(
			Array.isArray(options) ? options : [],
			Array.isArray(answers) ? answers : [],
		);
		const difficulty = question.difficulty || 0.5;
		const hasImage =
			question.imageData && typeof question.imageData === "string";

		let prompt = `You are a Science Olympiad question analyzer. Analyze this question and the user's answer.

QUESTION: ${questionText}
OPTIONS: ${JSON.stringify(options)}
CORRECT ANSWERS: ${JSON.stringify(answersText)}
USER'S ANSWER: ${userAnswer}
EVENT: ${event}
DIFFICULTY: ${difficulty}`;

		if (hasImage) {
			prompt += `

IMPORTANT: This question includes an image that contains visual information essential for understanding and answering the question correctly.`;
		}

		prompt += `

ANALYSIS REQUIREMENTS:
1. Analyze the question's scientific accuracy and educational value
2. Evaluate the user's answer for correctness and understanding
3. Provide specific feedback on what the user got right or wrong
4. Suggest areas for improvement in the user's understanding
5. Consider the difficulty level and event context

Provide a comprehensive analysis that helps the user understand both the question and their performance.`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				analysis: { type: Type.STRING },
				correctness: { type: Type.STRING },
				suggestions: { type: Type.STRING },
			},
			propertyOrdering: ["analysis", "correctness", "suggestions"],
		};

		return await this.generateStructuredContent(
			prompt,
			schema,
			hasImage ? (question.imageData as string) : undefined,
		);
	}

	/**
	 * Analyzes a question to determine if it should be removed
	 * @param {Record<string, unknown>} question - Question data
	 * @param {string} event - Event name
	 * @returns {Promise<QuestionRemovalAnalysis>} Removal analysis result
	 */
	public async analyzeQuestionForRemoval(
		question: Record<string, unknown>,
		event: string,
	): Promise<QuestionRemovalAnalysis> {
		const questionText = question.question || "";
		const options = question.options || [];
		const answers = question.answers || [];
		const answersText = this.resolveAnswersToText(
			Array.isArray(options) ? options : [],
			Array.isArray(answers) ? answers : [],
		);
		const difficulty = question.difficulty || 0.5;
		const hasImage =
			question.imageData && typeof question.imageData === "string";
		const tournament = question.tournament || "";
		const division = question.division || "";

		let prompt = `You are a Science Olympiad question quality analyzer. Your task is to determine if a question should be REMOVED from the database due to quality issues.

QUESTION: ${questionText}
OPTIONS: ${JSON.stringify(options)}
CORRECT ANSWERS: ${JSON.stringify(answersText)}
EVENT: ${event}
TOURNAMENT: ${tournament}
DIVISION: ${division}
DIFFICULTY: ${difficulty}`;

		if (hasImage) {
			prompt += `

IMPORTANT: This question includes an image that contains visual information essential for understanding and answering the question correctly.`;
		}

		prompt += `

REMOVAL CRITERIA - Remove the question if it has ANY of these issues:
1. SCIENTIFIC INACCURACY: Contains factually incorrect scientific information
2. AMBIGUOUS LANGUAGE: Unclear wording that makes the question confusing or unanswerable
3. MISSING ESSENTIAL INFORMATION: Lacks critical details needed to answer correctly
4. INAPPROPRIATE CONTENT: Contains offensive, biased, or inappropriate material
5. TECHNICAL ERRORS: Has formatting issues, broken images, or technical problems
6. OUTDATED INFORMATION: Contains information that is no longer scientifically accurate
7. POOR EDUCATIONAL VALUE: Does not effectively test Science Olympiad knowledge
8. DUPLICATE CONTENT: Appears to be a duplicate of another question

ANALYSIS REQUIREMENTS:
- Carefully evaluate the question against ALL removal criteria
- Consider the Science Olympiad event context and difficulty level
- Be conservative - only recommend removal for clear quality issues
- Provide specific reasoning for your decision

Respond with your analysis and removal recommendation.`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				shouldRemove: {
					type: Type.BOOLEAN,
					description:
						"Whether the question should be removed from the database",
				},
				reason: {
					type: Type.STRING,
					description:
						"Detailed explanation of why the question should or should not be removed",
				},
				issues: {
					type: Type.ARRAY,
					items: { type: Type.STRING },
					description: "List of specific issues found (if any)",
				},
				confidence: {
					type: Type.NUMBER,
					minimum: 0,
					maximum: 1,
					description: "Confidence level in the removal decision (0-1)",
				},
			},
			propertyOrdering: ["shouldRemove", "reason", "issues", "confidence"],
		};

		return await this.generateStructuredContent(
			prompt,
			schema,
			hasImage ? (question.imageData as string) : undefined,
		);
	}

	/**
	 * Resolves answers to text format
	 * @param {unknown[]} options - Question options
	 * @param {unknown[]} answers - Question answers
	 * @returns {string[]} Resolved answer text
	 */
	private resolveAnswersToText(
		options: unknown[],
		answers: unknown[],
	): string[] {
		if (!Array.isArray(answers) || answers.length === 0) {
			return [];
		}

		return answers.map((answer) => {
			if (typeof answer === "string") {
				return answer;
			}
			if (typeof answer === "number" && Array.isArray(options)) {
				const option = options[answer];
				return typeof option === "string" ? option : String(answer);
			}
			return String(answer);
		});
	}

	/**
	 * Generates structured content using Gemini
	 * @param {string} prompt - Prompt text
	 * @param {object} schema - Response schema
	 * @param {string} imageData - Optional image data URL
	 * @returns {Promise<T>} Structured response
	 */
	private async generateStructuredContent<T>(
		prompt: string,
		schema: object,
		imageData?: string,
	): Promise<T> {
		const contents: Array<{
			role: string;
			parts: Array<{
				text?: string;
				inlineData?: { mimeType: string; data: string };
			}>;
		}> = [
			{
				role: "user",
				parts: [{ text: prompt }],
			},
		];

		// Add image if provided
		if (imageData) {
			const firstContent = contents[0];
			if (firstContent) {
				firstContent.parts.push({
					inlineData: {
						mimeType: "image/jpeg",
						data: imageData.split(",")[1] ?? "", // Remove data URL prefix
					},
				});
			}
		}

		try {
			const response = await this.clientWithKey.client.models.generateContent({
				model: "gemini-flash-lite-latest",
				contents: contents as unknown as Parameters<
					typeof this.clientWithKey.client.models.generateContent
				>[0]["contents"],
				config: {
					responseMimeType: "application/json",
					responseSchema: schema,
					thinkingConfig: {
						thinkingBudget: 1000,
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
					apiKey: maskedKey,
				});
				throw new Error("Invalid response format from Gemini");
			}
		} catch (error) {
			const maskedKey =
				this.clientWithKey.apiKey.length > 12
					? `${this.clientWithKey.apiKey.substring(0, 8)}...${this.clientWithKey.apiKey.substring(this.clientWithKey.apiKey.length - 4)}`
					: "***";
			logger.error("Gemini API error", error as Error, {
				apiKey: maskedKey,
			});
			throw new Error(
				`Gemini API error (key: ${maskedKey}): ${(error as Error).message}`,
			);
		}
	}
}
