/**
 * API type definitions for Science Olympiad platform
 * Comprehensive type definitions for API requests and responses
 */

/**
 * Question interface for API operations
 * Represents a Science Olympiad question with all metadata
 */
export interface Question {
	/** Unique question identifier */
	id: string;
	/** Question text content */
	question: string;
	/** Tournament name */
	tournament: string;
	/** Division (B or C) */
	division: string;
	/** Answer choices for multiple choice questions */
	options: string[];
	/** Correct answers (indices for MCQ, text for FRQ) */
	answers: (string | number)[];
	/** Array of subtopics */
	subtopics: string[];
	/** Difficulty level (0-1) */
	difficulty: number;
	/** Science Olympiad event name */
	event: string;
	/** Optional base64 image data */
	imageData?: string;
	/** Creation timestamp */
	created_at?: string;
	/** Last update timestamp */
	updated_at?: string;
	/** Base52 encoded identifier (5-character code: cxyzd where d is s (standard) or p (picture)) */
	base52?: string;
}

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface ShareCodeRequest extends Record<string, unknown> {
	questionIds: string[];
	idQuestionIds?: string[];
	testParamsRaw: Record<string, unknown>;
	timeRemainingSeconds?: number;
	code?: string;
}

export interface ShareCodeResponse {
	success: boolean;
	data?: {
		shareCode: string;
		expiresAt: string;
	};
	error?: string;
}

export interface ShareCodeData {
	success: boolean;
	data?: {
		questionIds: string[];
		idQuestionIds?: string[];
		testParamsRaw: Record<string, unknown>;
		timeRemainingSeconds?: number;
		createdAtMs: number;
	};
	error?: string;
}

export interface BlacklistRequest {
	event: string;
	questionData: Record<string, unknown>;
	reason?: string;
}

export interface EditRequest {
	event: string;
	originalQuestion: Record<string, unknown>;
	editedQuestion: Record<string, unknown>;
	reason?: string;
	bypass?: boolean;
	aiSuggestion?: {
		question: string;
		options?: string[];
		answers: string[];
		answerIndices?: number[];
	};
}

export interface GeminiGradeFreeResponsesRequest {
	responses: Array<{
		question: string;
		correctAnswers: (string | number)[];
		studentAnswer: string;
	}>;
}

export interface GeminiExtractQuestionsRequest {
	text: string;
}

export interface GeminiValidateEditRequest {
	originalQuestion: Record<string, unknown>;
	editedQuestion: Record<string, unknown>;
	event: string;
	reason: string;
}

export interface EventStat {
	event: string;
	count: string;
}

export interface DivisionStat {
	division: string;
	count: string;
}

export interface StatsResponse {
	total: number;
	byEvent: EventStat[];
	byDivision: DivisionStat[];
}
