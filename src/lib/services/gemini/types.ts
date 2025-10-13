/**
 * Types and interfaces for Gemini service
 */

export interface GeminiStreamChunk {
  type: 'text' | 'final';
  chunk?: string;
  data?: Record<string, unknown>;
}

export interface QuestionAnalysisResult {
  analysis: string;
  correctness: string;
  suggestions: string;
}

export interface ExplanationResult {
  explanation: string;
}

export interface EditSuggestionResult {
  suggestedQuestion: string;
  suggestedOptions: string[];
  suggestedAnswers: string[];
  suggestedDifficulty: number;
  reasoning: string;
}

export interface EditValidationResult {
  isValid: boolean;
  feedback: string;
  suggestions: string[];
  reason?: string;
}

export interface ReportEditResult {
  improvedReason: string;
}

export interface GeminiClientConfig {
  apiKey: string;
}

export interface GeminiGenerationConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}
