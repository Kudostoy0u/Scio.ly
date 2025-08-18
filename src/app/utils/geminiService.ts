// Shared Gemini 2.5 Flash Lite service for AI-powered features
import api from '../api';

export interface Question {
  id?: string;
  question: string;
  options?: string[];
  answers: (number | string)[];
  difficulty: number;
  tournament?: string;
  division?: string;
  subject?: string;
  subtopic?: string;
  event?: string;
  imageUrl?: string; // optional Cloudinary URL for ID questions (legacy)
  imageData?: string; // optional CDN URL for ID questions (new)
}

export interface EditSuggestion {
  suggestedQuestion: string;
  suggestedOptions?: string[];
  suggestedAnswers: (number | string)[];
  reasoning: string;
  confidence: number;
}

export interface ReportAnalysis {
  category: 'accuracy' | 'clarity' | 'formatting' | 'duplicate' | 'inappropriate' | 'other';
  severity: 'low' | 'medium' | 'high';
  issues: string[];
  suggestedAction: 'edit' | 'remove';
  reasoning: string;
}

class GeminiService {
  private getRandomApiKey(): string {
    const keys = api.arr;
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private async callGemini(_prompt: string): Promise<string> {
    // This method is deprecated - geminiService now uses Express API endpoints
    // Keeping for backward compatibility but should not be used
    console.warn('Direct Gemini calls are deprecated. Use Express API endpoints instead.');
    throw new Error('Direct Gemini calls have been migrated to Express API endpoints');
  }

  async suggestQuestionEdit(question: Question, userReason?: string): Promise<EditSuggestion> {
    try {
      // Prepare request body with image information
      const requestBody: any = { 
        question, 
        userReason 
      };

      // Add image information if present
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
        reasoning: 'Unable to generate suggestions at this time.',
        confidence: 0
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