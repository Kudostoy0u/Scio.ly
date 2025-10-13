
import api from '../api';

/**
 * Gemini service utilities for Science Olympiad platform
 * Provides AI-powered question analysis and improvement suggestions
 */

/**
 * Question interface for Gemini service operations
 * Represents a Science Olympiad question with all metadata
 */
export interface Question {
  /** Optional question identifier */
  id?: string;
  /** Question text content */
  question: string;
  /** Optional answer choices for multiple choice questions */
  options?: string[];
  /** Correct answers (indices for MCQ, text for FRQ) */
  answers: (number | string)[];
  /** Question difficulty level (0-1) */
  difficulty: number;
  /** Tournament name */
  tournament?: string;
  /** Division (B or C) */
  division?: string;
  /** Subject/category */
  subject?: string;
  /** Single subtopic */
  subtopic?: string;
  /** Array of subtopics */
  subtopics?: string[];
  /** Science Olympiad event name */
  event?: string;
  /** Optional Cloudinary URL for ID questions (legacy) */
  imageUrl?: string;
  /** Optional CDN URL for ID questions (new) */
  imageData?: string;
}

/**
 * Edit suggestion interface
 * Contains AI-generated suggestions for improving a question
 */
export interface EditSuggestion {
  /** Suggested improved question text */
  suggestedQuestion: string;
  /** Optional suggested answer choices */
  suggestedOptions?: string[];
  /** Suggested correct answers */
  suggestedAnswers: (number | string)[];
  /** Optional suggested difficulty level */
  suggestedDifficulty?: number;
}

/**
 * Report analysis interface
 * Contains AI analysis of a reported question
 */
export interface ReportAnalysis {
  /** Category of the issue */
  category: 'accuracy' | 'clarity' | 'formatting' | 'duplicate' | 'inappropriate' | 'other';
  /** Severity level of the issue */
  severity: 'low' | 'medium' | 'high';
  /** Array of specific issues found */
  issues: string[];
  /** Recommended action */
  suggestedAction: 'edit' | 'remove';
  /** AI reasoning for the analysis */
  reasoning: string;
}

class GeminiService {
  private getRandomApiKey(): string {
    const keys = api.arr;
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private async callGemini(_prompt: string): Promise<string> {


    console.warn('Direct Gemini calls are deprecated. Use Express API endpoints instead.');
    throw new Error('Direct Gemini calls have been migrated to Express API endpoints');
  }

  async suggestQuestionEdit(question: Question, userReason?: string): Promise<EditSuggestion> {
    try {
      const requestBody: {
        question: Question;
        userReason?: string;
      } = {
        question,
        userReason
      };

      if (question.imageData || question.imageUrl) {
        requestBody.question = {
          ...question,
          imageData: question.imageData || question.imageUrl
        };
      }

      const response = await fetch(api.geminiSuggestEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to get edit suggestions:', error);
      return {
        suggestedQuestion: question.question,
        suggestedOptions: question.options,
        suggestedAnswers: question.answers,
        suggestedDifficulty: question.difficulty
      };
    }
  }

  async analyzeQuestionForReport(question: Question): Promise<ReportAnalysis> {
    try {
      const response = await fetch(api.geminiAnalyzeQuestion, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to analyze question:', error);
      return {
        category: 'other',
        severity: 'low',
        issues: ['Unable to analyze question at this time'],
        suggestedAction: 'edit',
        reasoning: 'Analysis failed. Please manually review the question.'
      };
    }
  }

  async improveReportReason(originalReason: string, analysis: ReportAnalysis): Promise<string> {
    try {
      const response = await fetch(api.geminiImproveReason, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalReason, analysis })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data && data.data.improvedReason) {
        return data.data.improvedReason;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to improve report reason:', error);
      return originalReason;
    }
  }

  async validateQuestionEdit(original: Question, edited: Question): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
    try {
      const response = await fetch(api.geminiValidateEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, edited })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to validate edit:', error);
      return {
        isValid: true,
        issues: ['Unable to validate edit at this time'],
        suggestions: ['Please manually review the changes']
      };
    }
  }
}

export const geminiService = new GeminiService();