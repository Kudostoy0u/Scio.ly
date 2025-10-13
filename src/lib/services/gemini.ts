/**
 * Service class for integrating with Google Gemini AI API
 * Provides functionality for question analysis, explanation generation, and content processing
 */

// import { GoogleGenAI, Type } from "@google/genai";
import { GeminiClientManager } from './gemini/client';
import { GeminiAnalysisService } from './gemini/analysis';
import { GeminiExplanationService } from './gemini/explanation';
import { GeminiEditingService } from './gemini/editing';
import { GeminiValidationService } from './gemini/validation';
// import type { GeminiStreamChunk } from './gemini/types';

/**
 * Main Gemini service class
 * Orchestrates all Gemini AI operations
 */
export class GeminiService {
  private clientManager: GeminiClientManager;
  private analysisService: GeminiAnalysisService;
  private explanationService: GeminiExplanationService;
  private editingService: GeminiEditingService;
  private validationService: GeminiValidationService;

  /**
   * Initializes the Gemini service with available API keys
   */
  constructor() {
    this.clientManager = new GeminiClientManager();
    
    if (!this.clientManager.hasClients()) {
      throw new Error('No Gemini API clients available');
    }

    const client = this.clientManager.getCurrentClient();
    this.analysisService = new GeminiAnalysisService(client);
    this.explanationService = new GeminiExplanationService(client);
    this.editingService = new GeminiEditingService(client);
    this.validationService = new GeminiValidationService(client);
  }

  /**
   * Analyzes a question and user's answer
   */
  public async analyzeQuestion(
    question: Record<string, unknown>,
    userAnswer: string,
    event: string
  ) {
    return await this.analysisService.analyzeQuestion(question, userAnswer, event);
  }

  /**
   * Generates an explanation for a question
   */
  public async explain(
    question: Record<string, unknown>,
    userAnswer: string,
    event: string
  ) {
    return await this.explanationService.explain(question, userAnswer, event);
  }

  /**
   * Suggests improvements for a question
   */
  public async suggestEdit(
    question: Record<string, unknown>,
    userReason?: string
  ) {
    return await this.editingService.suggestEdit(question, userReason);
  }

  /**
   * Validates an edit to a question
   */
  public async validateEdit(
    originalQuestion: Record<string, unknown>,
    editedQuestion: Record<string, unknown>,
    event: string,
    reason: string
  ) {
    return await this.validationService.validateEdit(originalQuestion, editedQuestion, event, reason);
  }

  /**
   * Improves a report edit reason
   */
  public async improveReportEditReason(
    originalReason: string,
    event: string
  ) {
    return await this.validationService.improveReportEditReason(originalReason, event);
  }

  /**
   * Validates a report edit
   */
  public async validateReportEdit(
    originalQuestion: Record<string, unknown>,
    editedQuestion: Record<string, unknown>,
    event: string,
    reason: string
  ) {
    return await this.validateEdit(originalQuestion, editedQuestion, event, reason);
  }

  /**
   * Checks if the service is available
   */
  public isAvailable(): boolean {
    return this.clientManager.hasClients();
  }

  /**
   * Extracts questions from text
   */
  public async extractQuestions(text: string): Promise<Record<string, unknown>> {
    const client = this.clientManager.getCurrentClient();
    const response = await client.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Extract Science Olympiad questions from this text: ${text}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });
    return JSON.parse(response.text || '{}');
  }

  /**
   * Grades free response answers
   */
  public async gradeFreeResponses(responses: unknown[]): Promise<Record<string, unknown>> {
    const client = this.clientManager.getCurrentClient();
    const response = await client.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Grade these free response answers: ${JSON.stringify(responses)}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });
    return JSON.parse(response.text || '{}');
  }

  /**
   * Improves a reason
   */
  public async improveReason(reason: string, question: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.improveReportEditReason(reason, question.event as string || '');
    return { improvedReason: result.improvedReason };
  }
}

// Export the singleton instance
export const geminiService = new GeminiService();