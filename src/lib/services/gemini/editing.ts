/**
 * Question editing and improvement methods for Gemini service
 */

import logger from "@/lib/utils/logger";
import { Type } from "@google/genai";
import type { ClientWithKey } from "./client";
import type { EditSuggestionResult } from "./types";

/**
 * Question editing service
 */
export class GeminiEditingService {
  constructor(private clientWithKey: ClientWithKey) {}

  /**
   * Suggests improvements for a question
   * @param {Record<string, unknown>} question - Question data
   * @param {string} userReason - Optional user reason for editing
   * @returns {Promise<EditSuggestionResult>} Edit suggestion result
   */
  public async suggestEdit(
    question: Record<string, unknown>,
    userReason?: string
  ): Promise<EditSuggestionResult> {
    const questionText = question.question || "";
    const options = question.options || [];
    const answers = question.answers || [];
    const answersText = this.resolveAnswersToText(
      Array.isArray(options) ? options : [],
      Array.isArray(answers) ? answers : []
    );
    const event = question.event || "";
    const difficulty = question.difficulty || 0.5;
    const hasImage = question.imageData && typeof question.imageData === "string";

    let prompt = `You are a Science Olympiad question editor. Your job is to improve this question by correcting errors, clarifying wording, and enhancing educational value.

QUESTION TO IMPROVE: ${questionText}
OPTIONS: ${JSON.stringify(options)}
ANSWERS: ${JSON.stringify(answersText)}
EVENT: ${event}
DIFFICULTY: ${difficulty}
${userReason ? `USER REASON: ${userReason}` : ""}`;

    if (hasImage) {
      prompt += `

IMPORTANT: This question includes an image that you should reference in your suggestions. The image contains visual information that is essential for understanding and answering the question correctly.

When making suggestions, consider:
- How the image relates to the question text
- Whether the image clearly shows what the question is asking about
- If the image quality or content could be improved
- Whether the question text properly references visual elements in the image`;
    }

    prompt += `

IMPROVEMENT CRITERIA:
1. Scientific accuracy - correct any factual errors
2. Clarity and readability - improve unclear wording
3. Educational value - ensure question tests important concepts
4. Technical formatting - fix formatting issues
5. Difficulty appropriateness - adjust to match event level${
      hasImage
        ? `
6. Image-text alignment - ensure question text properly references the image`
        : ""
    }

Lastly, questions must be self-contained. if the question I gave to you references something not in the question itself, you must tweak it to be answerable only given the question. 
Provide improved versions of the question components. Make minimal changes if the question is already good.
Do not switch FRQ based questions to MCQ based questions (adding options to a question without options) or vice versa. 
You may choose to change the answers to be more representative of the problem if it would improve question quality.

ANSWER FORMAT REQUIREMENTS:
- For multiple choice questions: suggestedAnswers should contain the actual answer text that matches items in suggestedOptions
- For free response questions: suggestedAnswers should contain the expected text answers
- Example for multiple choice:
  suggestedOptions: [ 'True', 'False' ]
  suggestedAnswers: [ 'False' ]
- Example for free response:
  suggestedOptions: [] (empty or omitted)
  suggestedAnswers: [ 'mitochondria', 'powerhouse of the cell' ]

IMPORTANT FORMATTING REQUIREMENTS:
- Do NOT use LaTeX formatting in your suggestions
- Use plain text only for all question text, options, and answers
- Avoid mathematical notation that requires LaTeX rendering

Think very lightly, only as much as needed to turn it into a good question with an accurate answer.
Also include suggestedDifficulty (0.0-1.0) when you recommend an updated difficulty.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        suggestedQuestion: { type: Type.STRING },
        suggestedOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestedDifficulty: { type: Type.NUMBER },
        reasoning: { type: Type.STRING },
      },
      propertyOrdering: [
        "suggestedQuestion",
        "suggestedOptions",
        "suggestedAnswers",
        "suggestedDifficulty",
        "reasoning",
      ],
    };

    return await this.generateStructuredContent(
      prompt,
      schema,
      hasImage ? (question.imageData as string) : undefined
    );
  }

  /**
   * Resolves answers to text format
   * @param {unknown[]} options - Question options
   * @param {unknown[]} answers - Question answers
   * @returns {string[]} Resolved answer text
   */
  private resolveAnswersToText(options: unknown[], answers: unknown[]): string[] {
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
    imageData?: string
  ): Promise<T> {
    const contents: Array<{
      role: string;
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
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
          apiKeyIndex: this.clientWithKey.keyIndex,
          apiKey: maskedKey,
        });
        throw new Error(
          `Invalid response format from Gemini (API key index: ${this.clientWithKey.keyIndex})`
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
        `Gemini API error (API key index: ${this.clientWithKey.keyIndex}, key: ${maskedKey}): ${(error as Error).message}`
      );
    }
  }
}
