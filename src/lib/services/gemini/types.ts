/**
 * Types and interfaces for Gemini service
 */

export interface GeminiStreamChunk {
	type: "text" | "final";
	chunk?: string;
	data?: Record<string, unknown>;
}

export interface QuestionAnalysisResult {
	analysis: string;
	correctness: string;
	suggestions: string;
}

export interface QuestionRemovalAnalysis {
	shouldRemove: boolean;
	reason: string;
	issues: string[];
	confidence: number;
}

export interface ExplanationResult {
	explanation: string;
}

export interface GradingResult {
	scores: number[];
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

export interface QuoteValidationResult {
	action: "remove" | "edit" | "keep";
	reason: string;
	issues: string[];
	editedQuote?: {
		quote: string;
		author: string;
		language: string;
	};
}
