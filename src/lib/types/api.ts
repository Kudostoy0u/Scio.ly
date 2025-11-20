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

/**
 * Create question request interface
 * Defines the structure for creating new questions
 */
export interface CreateQuestionRequest {
  /** Question text content */
  question: string;
  /** Tournament name */
  tournament: string;
  /** Division (B or C) */
  division: string;
  /** Science Olympiad event name */
  event: string;
  /** Optional answer choices for multiple choice questions */
  options?: string[];
  /** Optional correct answers */
  answers?: (string | number)[];
  /** Optional array of subtopics */
  subtopics?: string[];
  /** Optional difficulty level (0-1) */
  difficulty?: number;
}

/**
 * Update question request interface
 * Defines the structure for updating existing questions
 */
export interface UpdateQuestionRequest {
  /** Optional question text content */
  question?: string;
  /** Optional tournament name */
  tournament?: string;
  /** Optional division (B or C) */
  division?: string;
  /** Optional Science Olympiad event name */
  event?: string;
  /** Optional answer choices for multiple choice questions */
  options?: string[];
  /** Optional correct answers */
  answers?: (string | number)[];
  /** Optional array of subtopics */
  subtopics?: string[];
  /** Optional difficulty level (0-1) */
  difficulty?: number;
}

/**
 * Question filters interface
 * Defines filtering options for question queries
 */
export interface QuestionFilters {
  /** Optional event name filter */
  event?: string;
  /** Optional division filter (B or C) */
  division?: string;
  /** Optional tournament name filter */
  tournament?: string;
  /** Optional single subtopic filter */
  subtopic?: string;
  /** Optional multiple subtopics filter (comma-separated) */
  subtopics?: string;
  /** Optional minimum difficulty filter */
  difficulty_min?: string;
  /** Optional maximum difficulty filter */
  difficulty_max?: string;
  /** Optional question type filter */
  question_type?: "mcq" | "frq";
  /** Optional limit for number of results */
  limit?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
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

export interface EditResponse {
  success: boolean;
  edits?: Array<{
    original: Record<string, unknown>;
    edited: Record<string, unknown>;
    timestamp: string;
  }>;
  blacklist?: Record<string, unknown>[];
}

export interface ReportEditRequest {
  originalQuestion: Record<string, unknown>;
  editedQuestion: Record<string, unknown>;
  event: string;
  reason?: string;
  bypass?: boolean;
  aiSuggestion?: {
    question: string;
    options?: string[];
    answers: string[];
    answerIndices?: number[];
  };
}

export interface ReportRemoveRequest {
  question: Record<string, unknown>;
  originalQuestion?: Record<string, unknown>;
  event: string;
}

export interface GeminiSuggestEditRequest {
  question: Record<string, unknown>;
  userReason?: string;
}

export interface GeminiAnalyzeQuestionRequest {
  question: Record<string, unknown>;
}

export interface GeminiExplainRequest {
  question: Record<string, unknown>;
  userAnswer?: unknown;
  event: string;
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

export interface GeminiImproveReasonRequest {
  reason: string;
  question: Record<string, unknown>;
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

export interface Base52GenerateRequest {
  questionIds: string[];
  table?: "questions" | "idEvents";
}

export interface Base52GenerateResponse {
  success: boolean;
  data?: {
    codes: Record<string, string>;
    table: "questions" | "idEvents";
  };
  error?: string;
}

export interface Base52LookupResponse {
  success: boolean;
  data?: {
    question: Record<string, unknown>;
    table: "questions" | "idEvents";
  };
  error?: string;
}
