"use client";

/**
 * Plagiarism detection type definitions for Science Olympiad platform
 * Comprehensive type definitions for plagiarism detection and analysis
 */

/**
 * Extracted question interface
 * Represents a question extracted from user input
 */
export interface ExtractedQuestion {
	/** Question text content */
	question: string;
	/** Optional answer choices for multiple choice questions */
	options: string[] | null;
	/** Question type (multiple choice or free response) */
	type: "mcq" | "frq";
}

/**
 * Processed questions interface
 * Contains array of extracted questions
 */
export interface ProcessedQuestions {
	/** Array of extracted questions */
	questions: ExtractedQuestion[];
}

/**
 * Official question interface
 * Represents a question from the official database
 */
export interface OfficialQuestion {
	/** Unique question identifier */
	id: string;
	/** Question text content */
	question: string;
	/** Answer choices for multiple choice questions */
	options: string[];
	/** Correct answers */
	answers: string[];
	/** Tournament name */
	tournament: string;
	/** Division (B or C) */
	division: string;
	/** Science Olympiad event name */
	event: string;
	/** Array of subtopics */
	subtopics: string[];
	/** Question difficulty level */
	difficulty: number | string;
}

/**
 * Plagiarism match interface
 * Represents a match between input and official questions
 */
export interface PlagiarismMatch {
	/** The input question that was matched */
	inputQuestion: ExtractedQuestion;
	/** The official question that was matched */
	matchedQuestion: OfficialQuestion;
	/** Similarity score (0-1) */
	similarity: number;
	/** Type of match (question text or options) */
	matchType: "question" | "options";
}

/**
 * Question plagiarism summary interface
 * Contains comprehensive plagiarism analysis for a question
 */
export interface QuestionPlagiarismSummary {
	/** The question being analyzed */
	question: ExtractedQuestion;
	/** Index of the question in the input */
	questionIndex: number;
	/** All matches found */
	matches: PlagiarismMatch[];
	/** High-risk matches (high similarity) */
	highRiskMatches: PlagiarismMatch[];
	/** Medium-risk matches (medium similarity) */
	mediumRiskMatches: PlagiarismMatch[];
	/** Low-risk matches (low similarity) */
	lowRiskMatches: PlagiarismMatch[];
	/** Total number of matches */
	totalMatches: number;
	/** Highest similarity score found */
	highestSimilarity: number;
}

/**
 * Modal props interface
 * Props for plagiarism detection modal components
 */
export interface ModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Function to close the modal */
	onClose: () => void;
	/** Plagiarism summary to display */
	summary: QuestionPlagiarismSummary | null;
}
