/**
 * Explanation generation methods for Gemini service
 */

import logger from "@/lib/utils/logging/logger";
import { Type } from "@google/genai";
import type { ClientWithKey } from "./client";
import type { ExplanationResult } from "./types";

// Regex for extracting MIME type and base64 data from data URL
const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/;

/**
 * Explanation generation service
 */
export class GeminiExplanationService {
	private clientWithKey: ClientWithKey;

	constructor(clientWithKey: ClientWithKey) {
		this.clientWithKey = clientWithKey;
	}

	/**
	 * Converts an image URL to a base64 data URL
	 * @param {string} imageUrl - Image URL to convert
	 * @returns {Promise<string>} Base64 data URL
	 */
	private async convertImageUrlToBase64(imageUrl: string): Promise<string> {
		try {
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch image: ${response.status} ${response.statusText}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const base64 = buffer.toString("base64");

			// Determine MIME type from response or default to jpeg
			const contentType = response.headers.get("content-type") || "image/jpeg";
			return `data:${contentType};base64,${base64}`;
		} catch (error) {
			logger.error("Failed to convert image URL to base64", error as Error, {
				imageUrl,
			});
			throw new Error(
				`Failed to convert image URL to base64: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Gets image data as base64, converting from URL if necessary
	 * @param {string | undefined} imageData - Image data (base64 data URL or URL)
	 * @returns {Promise<string | undefined>} Base64 data URL or undefined
	 */
	private async getImageDataAsBase64(
		imageData: string | undefined,
	): Promise<string | undefined> {
		if (!imageData || typeof imageData !== "string") {
			return undefined;
		}

		// If it's already a base64 data URL, return it
		if (imageData.startsWith("data:")) {
			return imageData;
		}

		// If it's a URL, fetch and convert to base64
		if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
			return await this.convertImageUrlToBase64(imageData);
		}

		// If it's a relative URL, try to convert it (may need absolute URL)
		// For now, return undefined if it's not a valid format
		logger.warn("Image data is not a valid URL or base64 data URL", {
			imageData,
		});
		return undefined;
	}

	/**
	 * Generates an explanation for a question
	 * @param {Record<string, unknown>} question - Question data
	 * @param {string} userAnswer - User's answer
	 * @param {string} event - Event name
	 * @returns {Promise<ExplanationResult>} Explanation result
	 */
	public async explain(
		question: Record<string, unknown>,
		userAnswer: string,
		event: string,
	): Promise<ExplanationResult> {
		const questionText = question.question || "";
		const options = question.options || [];
		const answers = question.answers || [];
		const answersText = this.resolveAnswersToText(
			Array.isArray(options) ? options : [],
			Array.isArray(answers) ? answers : [],
		);
		const difficulty = question.difficulty || 0.5;

		// Get image data, converting from URL if necessary
		const imageDataBase64 = await this.getImageDataAsBase64(
			question.imageData as string | undefined,
		);
		const hasImage = !!imageDataBase64;

		let prompt = `You are a Science Olympiad tutor. Explain this question and provide educational insights.

QUESTION: ${questionText}
OPTIONS: ${JSON.stringify(options)}
CORRECT ANSWERS: ${JSON.stringify(answersText)}
USER'S ANSWER: ${userAnswer}
EVENT: ${event}
DIFFICULTY: ${difficulty}`;

		if (hasImage) {
			prompt += `

IMPORTANT: This question includes an image that contains visual information essential for understanding and answering the question correctly. Use the image as a reference when explaining the question.`;
		}

		prompt += `

EXPLANATION REQUIREMENTS:
- Provide a maximum of 3 clean, easy-to-read paragraphs
- Write in a natural, flowing style without stage labels or numbered sections
- Use **bold formatting** for key phrases and important terms only
- Do NOT use LaTeX formatting - use plain text only
- Do NOT structure your response with labels like "First paragraph:", "Second paragraph:", etc.
- Simply write 1-3 sequential paragraphs that flow naturally together
- Cover the scientific concepts, reasoning to reach the correct answer, and address any misconceptions in the user's answer
- Focus on helping the user understand the underlying science and improve their knowledge`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				explanation: { type: Type.STRING },
			},
			propertyOrdering: ["explanation"],
		};

		return await this.generateStructuredContent(
			prompt,
			schema,
			imageDataBase64,
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
				// Extract MIME type and base64 data from data URL
				const dataUrlMatch = imageData.match(DATA_URL_REGEX);
				if (dataUrlMatch?.[2]) {
					const mimeType = dataUrlMatch[1] || "image/jpeg";
					const base64Data = dataUrlMatch[2];
					firstContent.parts.push({
						inlineData: {
							mimeType,
							data: base64Data,
						},
					});
				} else {
					// Fallback: assume it's already base64 without prefix
					firstContent.parts.push({
						inlineData: {
							mimeType: "image/jpeg",
							data: imageData ?? "",
						},
					});
				}
			}
		}

		try {
			const generateContent = this.clientWithKey.client.models.generateContent;
			const response = await generateContent({
				model: "gemini-flash-lite-latest",
				contents: contents as unknown as Parameters<
					typeof generateContent
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
