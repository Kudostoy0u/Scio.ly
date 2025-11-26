"use client";

import type { Question } from "@/app/utils/geminiService";
import {
  type GradingResults,
  type RouterParams,
  calculateMCQScore,
} from "@/app/utils/questionUtils";
import logger from "@/lib/utils/logger";
import { useEffect, useState } from "react";

/**
 * Custom hook for managing grading state and logic in test sessions
 *
 * This hook handles all grading-related functionality including:
 * - MCQ (Multiple Choice Question) automatic grading and validation
 * - FRQ (Free Response Question) grading state management
 * - Score validation and correction for consistency
 * - localStorage persistence of grading results
 * - Computing missing grades for unanswered questions
 *
 * @param data - Array of questions to grade
 * @param userAnswers - Map of question indices to user's selected answers
 * @param isSubmitted - Whether the test has been submitted
 * @param routerData - Router parameters including assignment mode and IDs
 *
 * @returns {Object} Grading state and setters
 * @returns {GradingResults} gradingResults - Map of question indices to scores (0-1)
 * @returns {Function} setGradingResults - Setter for grading results
 * @returns {Record<number, boolean>} gradingFRQs - Map of FRQ indices to loading states
 * @returns {Function} setGradingFrQs - Setter for FRQ loading states
 *
 * @example
 * ```typescript
 * const { gradingResults, setGradingResults, gradingFRQs, setGradingFrQs } = useTestGrading(
 *   questions,
 *   userAnswers,
 *   isSubmitted,
 *   routerParams
 * );
 * ```
 */
export function useTestGrading(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  isSubmitted: boolean,
  routerData: RouterParams
) {
  // State for grading results - maps question index to score (0 = wrong, 0.5 = partial, 1 = correct)
  const [gradingResults, setGradingResults] = useState<GradingResults>({});

  // State for FRQ grading loading indicators - maps question index to loading state
  const [gradingFrQs, setGradingFrQs] = useState<Record<number, boolean>>({});

  /**
   * Effect: Validate and correct MCQ scores, compute missing grades
   *
   * This effect runs after test submission and ensures data integrity by:
   * 1. Checking all MCQ questions have valid scores that match computed values
   * 2. Correcting any invalid scores immediately (e.g., from stale localStorage)
   * 3. Computing missing grades for both MCQ and FRQ questions
   *
   * Why this is needed:
   * - localStorage might have stale/incorrect scores from previous sessions
   * - Ensures consistency between stored scores and actual answer correctness
   * - Prevents score manipulation or data corruption
   *
   * The validation happens in two passes:
   * 1. Invalid scores (stored != computed) are corrected synchronously
   * 2. Missing scores are computed asynchronously using the grading utility
   */
  useEffect(() => {
    // Only run validation after test submission
    if (!isSubmitted || data.length === 0) {
      return;
    }

    const missing: number[] = [];
    const invalid: number[] = [];

    // Pass 1: Check for missing and invalid grades
    for (let i = 0; i < data.length; i++) {
      const question = data[i];
      if (!question) {
        continue;
      }
      const answer = userAnswers[i] || [];

      // For MCQ questions, validate stored score matches computed score
      if (question.options && question.options.length > 0) {
        const storedScore = gradingResults[i];
        if (storedScore !== undefined) {
          const computedScore = calculateMCQScore(question, answer);
          // If scores don't match (allowing for floating point precision), mark as invalid
          if (Math.abs(storedScore - computedScore) > 0.01) {
            invalid.push(i);
            logger.warn(
              `Invalid score detected for question ${i}: stored=${storedScore}, computed=${computedScore}`
            );
          }
        } else {
          missing.push(i);
        }
      } else {
        // For FRQ questions, just check if missing
        if (typeof gradingResults[i] === "undefined") {
          missing.push(i);
        }
      }
    }

    // Pass 2: Fix invalid scores immediately (synchronous)
    if (invalid.length > 0) {
      const corrected: GradingResults = {};
      for (const i of invalid) {
        const question = data[i];
        if (!question) {
          continue;
        }
        const answer = userAnswers[i] || [];
        corrected[i] = calculateMCQScore(question, answer);
      }
      setGradingResults((prev) => ({ ...prev, ...corrected }));
    }

    // Pass 3: Compute missing grades (asynchronous)
    if (missing.length === 0) {
      return;
    }

    (async () => {
      try {
        const { gradeMissing } = await import("./utils/grading");
        const computed: GradingResults = gradeMissing(
          data,
          userAnswers,
          calculateMCQScore,
          missing
        );
        if (Object.keys(computed).length > 0) {
          setGradingResults((prev) => ({ ...prev, ...computed }));
        }
      } catch (error) {
        logger.error("Error computing missing grades:", error);
      }
    })();
  }, [isSubmitted, data, userAnswers, gradingResults]);

  /**
   * Effect: Persist grading results to localStorage
   *
   * This effect ensures grading results are saved to localStorage whenever they change.
   * It uses different keys depending on whether we're in assignment mode or practice mode:
   * - Assignment mode: `assignment_${assignmentId}_grading`
   * - Practice mode: `testGradingResults`
   *
   * This allows users to:
   * - Refresh the page without losing their graded results
   * - Navigate away and come back to see their scores
   * - Support multiple concurrent assignments without conflicts
   */
  useEffect(() => {
    try {
      // Determine if we're in assignment mode
      const isAssignmentMode = !!(
        routerData.assignmentId ||
        routerData.teamsAssign === "1" ||
        routerData.teamsAssign === 1
      );

      if (isAssignmentMode && routerData.assignmentId) {
        // Assignment mode with specific assignmentId
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_grading`, JSON.stringify(gradingResults));
      } else {
        // General practice mode
        localStorage.setItem("testGradingResults", JSON.stringify(gradingResults));
      }
    } catch (error) {
      logger.error("Error persisting grading results to localStorage:", error);
    }
  }, [gradingResults, routerData]);

  return {
    gradingResults,
    setGradingResults,
    gradingFRQs: gradingFrQs,
    setGradingFrQs,
  };
}
