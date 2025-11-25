/**
 * Constants for test parameters validation
 * Centralizes magic numbers used in test configuration
 */

/**
 * Question count limits
 */
export const QUESTION_LIMITS = {
  /** Minimum number of questions */
  MIN: 1,
  /** Maximum number of questions */
  MAX: 200,
} as const;

/**
 * Time limit constraints (in minutes)
 */
export const TIME_LIMITS = {
  /** Minimum time limit */
  MIN: 1,
  /** Maximum time limit */
  MAX: 120,
} as const;

/**
 * ID percentage limits
 */
export const ID_PERCENTAGE_LIMITS = {
  /** Minimum ID percentage */
  MIN: 0,
  /** Maximum ID percentage */
  MAX: 100,
} as const;

/**
 * Character length limits for questions
 */
export const CHAR_LENGTH_LIMITS = {
  /** Minimum character length */
  MIN: 10,
  /** Maximum character length */
  MAX: 200,
} as const;
