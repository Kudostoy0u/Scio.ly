/**
 * Validation and utility methods for Gemini service
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { EditValidationResult, ReportEditResult } from './types';

/**
 * Validation and utility service
 */
export class GeminiValidationService {
  constructor(private client: GoogleGenAI) {}

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
    reason: string
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
    event: string
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
   * Generates structured content using Gemini
   * @param {string} prompt - Prompt text
   * @param {object} schema - Response schema
   * @returns {Promise<T>} Structured response
   */
  private async generateStructuredContent<T>(prompt: string, schema: object): Promise<T> {
    const response = await this.client.models.generateContent({
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

    const text = response.text || '{}';
    
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      throw new Error('Invalid response format from Gemini');
    }
  }
}
