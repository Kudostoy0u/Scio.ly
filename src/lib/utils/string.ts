/**
 * String manipulation utilities for Science Olympiad content processing
 * Provides text cleaning, formatting, and transformation functions
 */

/**
 * Removes trailing parenthetical content from a string
 * Strips text in parentheses at the end of the string
 *
 * @param {string} input - The input string to process
 * @returns {string} String with trailing parenthetical content removed
 * @example
 * ```typescript
 * stripTrailingParenthetical("Anatomy & Physiology (Human Body)"); // Returns "Anatomy & Physiology"
 * stripTrailingParenthetical("Dynamic Planet (Oceanography)"); // Returns "Dynamic Planet"
 * stripTrailingParenthetical("Simple text"); // Returns "Simple text"
 * ```
 */
export function stripTrailingParenthetical(input: string): string {
  if (typeof input !== "string") {
    return input as unknown as string;
  }
  return input.replace(/\s*\([^)]*\)\s*$/, "").trimEnd();
}
