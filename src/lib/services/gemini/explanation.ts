/**
 * Explanation generation methods for Gemini service
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { ExplanationResult } from './types';

/**
 * Explanation generation service
 */
export class GeminiExplanationService {
  constructor(private client: GoogleGenAI) {}

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
    event: string
  ): Promise<ExplanationResult> {
    const questionText = question.question || '';
    const options = question.options || [];
    const answers = question.answers || [];
    const answersText = this.resolveAnswersToText(Array.isArray(options) ? options : [], Array.isArray(answers) ? answers : []);
    const difficulty = question.difficulty || 0.5;
    const hasImage = question.imageData && typeof question.imageData === 'string';

    let prompt = `You are a Science Olympiad tutor. Explain this question and provide educational insights.

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

EXPLANATION REQUIREMENTS:
- Provide exactly 3 paragraphs of explanation (do not label them as 1, 2, 3)
- Use **bold formatting** for key phrases and important terms only
- Do NOT use LaTeX formatting - use plain text only
- First paragraph: Explain the scientific concepts involved
- Second paragraph: Walk through the reasoning to reach the correct answer
- Third paragraph: Address any misconceptions in the user's answer and provide additional context

Focus on helping the user understand the underlying science and improve their knowledge.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING },
      },
      propertyOrdering: ["explanation"],
    };

    return await this.generateStructuredContent(prompt, schema, hasImage ? question.imageData as string : undefined);
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

    return answers.map(answer => {
      if (typeof answer === 'string') {
        return answer;
      }
      if (typeof answer === 'number' && Array.isArray(options)) {
        const option = options[answer];
        return typeof option === 'string' ? option : String(answer);
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
  private async generateStructuredContent<T>(prompt: string, schema: object, imageData?: string): Promise<T> {
    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ];

    // Add image if provided
    if (imageData) {
      contents[0].parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(',')[1] // Remove data URL prefix
        }
      });
    }

    const response = await this.client.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents,
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
