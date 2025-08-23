// API Types matching the Go server models

export interface Question {
  id: string;
  question: string;
  tournament: string;
  division: string;
  options: string[];
  answers: (string | number)[];
  subtopics: string[];
  difficulty: number;
  event: string;
  imageData?: string; // Optional CDN URL for ID questions
  created_at?: string;
  updated_at?: string;
  base52?: string; // 5-character code: CXYZD where D is S (standard) or P (picture)
}

export interface CreateQuestionRequest {
  question: string;
  tournament: string;
  division: string;
  event: string;
  options?: string[];
  answers?: (string | number)[];
  subtopics?: string[];
  difficulty?: number;
}

export interface UpdateQuestionRequest {
  question?: string;
  tournament?: string;
  division?: string;
  event?: string;
  options?: string[];
  answers?: (string | number)[];
  subtopics?: string[];
  difficulty?: number;
}

export interface QuestionFilters {
  event?: string;
  division?: string;
  tournament?: string;
  subtopic?: string;
  subtopics?: string;
  difficulty_min?: string;
  difficulty_max?: string;
  question_type?: 'mcq' | 'frq';
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

// Share-related types
export interface ShareCodeRequest {
  questionIds: string[];
  idQuestionIds?: string[]; // IDs of questions that are ID questions (have imageData)
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
    idQuestionIds?: string[]; // IDs of questions that are ID questions (have imageData)
    testParamsRaw: Record<string, unknown>;
    timeRemainingSeconds?: number;
    createdAtMs: number;
  };
  error?: string;
}

// Blacklist types
export interface BlacklistRequest {
  event: string;
  questionData: Record<string, unknown>;
  reason?: string;
}

// Edit types
export interface EditRequest {
  event: string;
  originalQuestion: Record<string, unknown>;
  editedQuestion: Record<string, unknown>;
  reason?: string;
  bypass?: boolean;
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

// Report types
export interface ReportEditRequest {
  originalQuestion: Record<string, unknown>;
  editedQuestion: Record<string, unknown>;
  event: string;
  reason?: string;
  bypass?: boolean;
}

export interface ReportRemoveRequest {
  question: Record<string, unknown>;
  originalQuestion?: Record<string, unknown>;
  event: string;
}

// Gemini AI types
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
  responses: Array<Record<string, unknown>>;
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

// Stats types
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

// Base52 code types
export interface Base52GenerateRequest {
  questionIds: string[];
  table?: 'questions' | 'idEvents';
}

export interface Base52GenerateResponse {
  success: boolean;
  data?: {
    codes: Record<string, string>;
    table: 'questions' | 'idEvents';
  };
  error?: string;
}

export interface Base52LookupResponse {
  success: boolean;
  data?: {
    question: Record<string, unknown>;
    table: 'questions' | 'idEvents';
  };
  error?: string;
}