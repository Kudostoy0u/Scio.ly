/**
 * Validation and utility methods for Gemini service
 */

import logger from "@/lib/utils/logging/logger";
import { Type } from "@google/genai";
import type { ClientWithKey } from "./client";
import type {
	EditValidationResult,
	QuoteValidationResult,
	ReportEditResult,
} from "./types";

/**
 * Validation and utility service
 */
export class GeminiValidationService {
	private clientWithKey: ClientWithKey;

	constructor(clientWithKey: ClientWithKey) {
		this.clientWithKey = clientWithKey;
	}

	/**
	 * Validates an edit to a question
	 * @param {Record<string, unknown>} originalQuestion - Original question
	 * @param {Record<string, unknown>} editedQuestion - Edited question
	 * @param {string} event - Event name
	 * @param {string} reason - Reason for edit
	 * @returns {Promise<EditValidationResult>} Validation result
	 */
	public async validateEdit(
		originalQuestion: Record<string, unknown>,
		editedQuestion: Record<string, unknown>,
		event: string,
		reason: string,
	): Promise<EditValidationResult> {
		const prompt = `You are a Science Olympiad question validator. Validate this edit to ensure it maintains scientific accuracy and educational value.

ORIGINAL QUESTION: ${JSON.stringify(originalQuestion, null, 2)}
EDITED QUESTION: ${JSON.stringify(editedQuestion, null, 2)}
EVENT: ${event}
REASON FOR EDIT: ${reason}

VALIDATION CRITERIA:
1. Scientific accuracy - ensure no factual errors were introduced
2. Educational value - verify the question still tests important concepts
3. Clarity - check that the edit improves understanding
4. Completeness - ensure all necessary information is present
5. Appropriateness - verify the question matches the event level

Provide feedback on the validity of the edit and any suggestions for improvement.`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				isValid: { type: Type.BOOLEAN },
				feedback: { type: Type.STRING },
				suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
			},
			propertyOrdering: ["isValid", "feedback", "suggestions"],
		};

		return await this.generateStructuredContent(prompt, schema);
	}

	/**
	 * Improves a report edit reason
	 * @param {string} originalReason - Original reason
	 * @param {string} event - Event name
	 * @returns {Promise<ReportEditResult>} Improved reason
	 */
	public async improveReportEditReason(
		originalReason: string,
		event: string,
	): Promise<ReportEditResult> {
		const prompt = `You are a Science Olympiad question reviewer. Improve this report edit reason to be more specific and helpful.

ORIGINAL REASON: ${originalReason}
EVENT: ${event}

IMPROVEMENT REQUIREMENTS:
1. Be specific about what needs to be changed
2. Provide clear reasoning for the suggested changes
3. Focus on scientific accuracy and educational value
4. Make the feedback constructive and actionable
5. Consider the event context and difficulty level

Provide an improved version of the reason that will help the question editor make better changes.`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				improvedReason: { type: Type.STRING },
			},
			propertyOrdering: ["improvedReason"],
		};

		return await this.generateStructuredContent(prompt, schema);
	}

	/**
	 * Validates a quote for appropriateness and language
	 * @param {Record<string, unknown>} quote - Quote data
	 * @param {string} cipherType - Cipher type
	 * @returns {Promise<QuoteValidationResult>} Validation result
	 */
	public async validateQuote(
		quote: Record<string, unknown>,
		cipherType: string,
	): Promise<QuoteValidationResult> {
		const expectedLanguage = cipherType.includes("Xenocrypt")
			? "Spanish"
			: "English";

		const prompt = `You are a quote validator for a Code Busters cipher competition. Analyze this quote for appropriateness and formatting.

QUOTE: ${quote.quote}
AUTHOR: ${quote.author}
LANGUAGE: ${quote.language}
CIPHER TYPE: ${cipherType}
EXPECTED LANGUAGE: ${expectedLanguage}

VALIDATION CRITERIA:
1. Language Check:
   - The quote MUST be in ${expectedLanguage}
   - If it's in the wrong language, this is an automatic REMOVE

2. Formatting Check:
   - The quote should be properly formatted as a clean, readable sentence or phrase
   - Should have proper capitalization and punctuation
   - No garbled text, random characters, or nonsensical formatting
   - If formatting is severely broken (cannot be fixed with simple edits), mark as REMOVE

3. Content Check:
   - Should be appropriate for educational use
   - Should be a real quote or sensible phrase
   - No offensive, inappropriate, or nonsensical content

4. Author Check:
   - Author should be properly formatted
   - Should have a name (or "Unknown" if anonymous)

DECISION MATRIX:
- If the quote is in the WRONG LANGUAGE or has SEVERE formatting issues that cannot be fixed: action = "remove"
- If the quote has minor formatting issues or needs small corrections: action = "edit" AND provide editedQuote with corrections
- If the quote is fine as-is: action = "keep"

Provide your analysis and decision.`;

		const schema = {
			type: Type.OBJECT,
			properties: {
				action: {
					type: Type.STRING,
					enum: ["remove", "edit", "keep"],
				},
				reason: { type: Type.STRING },
				issues: {
					type: Type.ARRAY,
					items: { type: Type.STRING },
				},
				editedQuote: {
					type: Type.OBJECT,
					properties: {
						quote: { type: Type.STRING },
						author: { type: Type.STRING },
						language: { type: Type.STRING },
					},
					nullable: true,
				},
			},
			propertyOrdering: ["action", "reason", "issues", "editedQuote"],
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
