/**
 * Grading utility functions for Science Olympiad assessments
 * Provides percentage to letter grade conversion and grade calculations
 */

/**
 * Converts percentage to letter grade using traditional US high school scale
 * Supports plus/minus grading system with standard grade boundaries
 *
 * @param {number | string} percentageInput - Percentage score (0-100)
 * @returns {string} Letter grade (A+ to F) or 'N/A' for invalid inputs
 * @example
 * ```typescript
 * getLetterGradeFromPercentage(95.5); // Returns 'A'
 * getLetterGradeFromPercentage(87.2); // Returns 'B+'
 * getLetterGradeFromPercentage(65.0); // Returns 'D'
 * getLetterGradeFromPercentage('invalid'); // Returns 'N/A'
 * ```
 */
export function getLetterGradeFromPercentage(percentageInput: number | string): string {
  if (percentageInput === null || percentageInput === undefined) {
    return "N/A";
  }
  const percentage =
    typeof percentageInput === "string" ? Number(percentageInput) : percentageInput;
  if (!Number.isFinite(percentage)) {
    return "N/A";
  }

  const p = Math.max(0, Math.min(100, Math.round(percentage)));

  if (p >= 97) {
    return "A+";
  }
  if (p >= 93) {
    return "A";
  }
  if (p >= 90) {
    return "A-";
  }
  if (p >= 87) {
    return "B+";
  }
  if (p >= 83) {
    return "B";
  }
  if (p >= 80) {
    return "B-";
  }
  if (p >= 77) {
    return "C+";
  }
  if (p >= 73) {
    return "C";
  }
  if (p >= 70) {
    return "C-";
  }
  if (p >= 67) {
    return "D+";
  }
  if (p >= 63) {
    return "D";
  }
  if (p >= 60) {
    return "D-";
  }
  return "F";
}

/**
 * Calculates percentage from earned and total points
 * Handles edge cases and invalid inputs gracefully
 *
 * @param {number} earned - Points earned by student
 * @param {number} total - Total possible points
 * @returns {number} Percentage score (0-100) or 0 for invalid inputs
 * @example
 * ```typescript
 * percentageFromEarnedAndTotal(85, 100); // Returns 85
 * percentageFromEarnedAndTotal(17, 20); // Returns 85
 * percentageFromEarnedAndTotal(0, 0); // Returns 0 (invalid)
 * percentageFromEarnedAndTotal(NaN, 100); // Returns 0 (invalid)
 * ```
 */
export function percentageFromEarnedAndTotal(earned: number, total: number): number {
  if (!(Number.isFinite(earned) && Number.isFinite(total)) || total <= 0) {
    return 0;
  }
  return Math.round((earned / total) * 100);
}
