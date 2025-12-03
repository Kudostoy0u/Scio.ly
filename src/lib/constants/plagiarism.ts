/**
 * Constants for plagiarism detection system
 * Centralizes magic numbers used in similarity calculations
 */

/**
 * Similarity thresholds for plagiarism detection
 */
export const SIMILARITY_THRESHOLDS = {
	/** Minimum similarity to consider a match (30%) */
	MIN_MATCH: 0.3,
	/** Minimum similarity for options matching (40%) */
	MIN_OPTIONS_MATCH: 0.4,
	/** High risk plagiarism threshold (95%) */
	HIGH_RISK: 0.95,
	/** Medium risk plagiarism threshold (85%) */
	MEDIUM_RISK: 0.85,
	/** Low risk plagiarism threshold (40%) */
	LOW_RISK: 0.4,
	/** Maximum length difference ratio (70%) */
	MAX_LENGTH_DIFF_RATIO: 0.7,
} as const;

/**
 * Limits for plagiarism matching
 */
export const MATCH_LIMITS = {
	/** Maximum number of matches to return */
	MAX_MATCHES: 5,
	/** Maximum number of matches to display */
	MAX_DISPLAY_MATCHES: 5,
} as const;
