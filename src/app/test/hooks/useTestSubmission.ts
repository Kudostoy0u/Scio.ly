"use client";

import type { Question } from "@/app/utils/geminiService";
import { updateMetrics } from "@/app/utils/metrics";
import type { GradingResults, RouterParams } from "@/app/utils/questionUtils";
import { calculateMCQScore } from "@/app/utils/questionUtils";
import {
  getCurrentTestSession,
  initializeTestSession,
  markTestSubmitted,
} from "@/app/utils/timeManagement";
import { supabase } from "@/lib/supabase";
import logger from "@/lib/utils/logger";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { fetchQuestionsForParams } from "./utils/fetchQuestions";

/**
 * Custom hook for handling test submission and scoring logic
 *
 * Manages the entire test submission process including:
 * - Computing MCQ scores and totals
 * - Batch grading of free response questions
 * - Tracking metrics (questions attempted, correct answers)
 * - Submitting to assignment APIs (both enhanced and legacy formats)
 * - Managing localStorage cleanup and state persistence
 *
 * @param data - Array of questions in the current test
 * @param userAnswers - Record mapping question indices to user's selected answers
 * @param gradingResults - Record mapping question indices to scores (0-1 range)
 * @param routerData - Router parameters including event name, time limit, assignment info
 * @param timeLeft - Current time remaining in seconds (null if no timer)
 * @param onDataRefresh - Callback to update the questions data after reload
 *
 * @returns Object containing submission state and handlers
 * @returns isSubmitted - Whether the test has been submitted
 * @returns setIsSubmitted - Function to manually set submission state
 * @returns handleSubmit - Main submission handler function
 * @returns reloadQuestions - Function to fetch new questions with same parameters
 *
 * @example
 * ```typescript
 * const { isSubmitted, handleSubmit, reloadQuestions } = useTestSubmission(
 *   questions,
 *   userAnswers,
 *   gradingResults,
 *   routerData,
 *   timeLeft,
 *   setData
 * );
 * ```
 */
export function useTestSubmission(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
  routerData: RouterParams,
  timeLeft: number | null,
  onDataRefresh: (newData: Question[]) => void
) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradingFrQs, setGradingFrQs] = useState<Record<number, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);

  /**
   * Main test submission handler
   *
   * Process flow:
   * 1. Mark test as submitted in state and localStorage
   * 2. Compute MCQ scores and identify FRQs that need grading
   * 3. Grade all FRQ questions in a batch (using Gemini or fuzzy matching)
   * 4. Validate and correct all MCQ scores to ensure consistency
   * 5. Update metrics for user statistics
   * 6. Submit to assignment API if in assignment mode
   * 7. Clean up localStorage
   */
  const handleSubmit = useCallback(async () => {
    setIsSubmitted(true);

    // Mark test as submitted in session storage
    try {
      const session = getCurrentTestSession();
      if (session && !session.isSubmitted) {
        markTestSubmitted();
      } else if (!session) {
        // Ensure a session exists so submitted state persists
        initializeTestSession(
          routerData.eventName || "Unknown Event",
          Number.parseInt((routerData.timeLimit as string) || "30"),
          false
        );
        markTestSubmitted();
      }
      localStorage.setItem("testSubmitted", "true");
    } catch {
      // Ignore errors - submission will still proceed
    }

    // Scroll to top to show results
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Step 1: Compute MCQ totals and identify FRQs to grade
    const { computeMcqTotals } = await import("./utils/submission");
    const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(
      data,
      userAnswers,
      gradingResults,
      !!routerData.assignmentMode
    );

    // Track final grading results for localStorage persistence
    const finalGradingResults = { ...newGrading };

    // Step 2: Grade all FRQ questions in batch
    if (frqsToGrade.length > 0) {
      // Set loading state for each FRQ
      for (const item of frqsToGrade) {
        setGradingFrQs((prev) => ({ ...prev, [item.index]: true }));
      }

      // Check online status for grading strategy
      const online = typeof navigator !== "undefined" ? navigator.onLine : true;
      const { gradeFrqBatch } = await import("./utils/grading");
      const scores = await gradeFrqBatch(frqsToGrade, online);

      // Update grading results with FRQ scores
      for (const [idx, score] of scores.entries()) {
        const frqItem = frqsToGrade[idx];
        if (!frqItem) {
          continue;
        }
        const questionIndex = frqItem.index;
        finalGradingResults[questionIndex] = score;
        setGradingFrQs((prev) => ({ ...prev, [questionIndex]: false }));
      }
    }

    // Step 3: Validate and correct all MCQ scores before saving
    // This ensures consistency between stored and computed scores
    const validatedGrading: GradingResults = { ...finalGradingResults };
    for (const [index, question] of data.entries()) {
      if (question.options && question.options.length > 0) {
        const answer = userAnswers[index] || [];
        const storedScore = validatedGrading[index];
        const computedScore = calculateMCQScore(question, answer);

        if (storedScore === undefined || Math.abs(storedScore - computedScore) > 0.01) {
          // Correct invalid or missing score
          validatedGrading[index] = computedScore;
          if (storedScore !== undefined) {
            logger.warn(
              `Corrected score for question ${index} on submit: ${storedScore} -> ${computedScore}`
            );
          }
        }
      }
    }

    // Step 4: Persist validated grading results to localStorage
    try {
      markTestSubmitted();

      // Use assignment-specific localStorage keys if in assignment mode
      const hasCurrentAssignmentId = !!localStorage.getItem("currentAssignmentId");
      const isAssignmentMode = !!(
        routerData.assignmentId ||
        ((routerData.teamsAssign === "1" || routerData.teamsAssign === 1) && hasCurrentAssignmentId)
      );

      if (isAssignmentMode && routerData.assignmentId) {
        // Assignment mode with specific assignmentId
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_grading`, JSON.stringify(validatedGrading));
        localStorage.setItem(
          `${assignmentKey}_session`,
          JSON.stringify({
            ...JSON.parse(localStorage.getItem(`${assignmentKey}_session`) || "{}"),
            isSubmitted: true,
          })
        );
      } else {
        // General practice mode
        localStorage.setItem("testGradingResults", JSON.stringify(validatedGrading));
      }

      // Clean up bookmark flag
      localStorage.removeItem("testFromBookmarks");
    } catch {
      // Ignore localStorage errors
    }

    // Step 5: Update user metrics
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (routerData.eventName) {
      updateMetrics(user?.id || null, {
        questionsAttempted: mcqTotal,
        correctAnswers: Math.round(mcqScore),
        eventName: routerData.eventName,
      });
    }

    // Step 6: Handle assignment submission for enhanced assignments
    if (routerData.assignmentId) {
      try {
        // Format answers for submission - map by question ID
        const formattedAnswers: Record<string, unknown> = {};
        for (const [index, question] of data.entries()) {
          const answer = userAnswers[index];
          if (answer !== null && answer !== undefined && question.id) {
            formattedAnswers[question.id] = answer;
          }
        }

        const res = await fetch(`/api/assignments/${routerData.assignmentId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: formattedAnswers,
            score: mcqScore,
            totalPoints: mcqTotal,
            timeSpent: routerData.timeLimit
              ? Number.parseInt(routerData.timeLimit as string) * 60 - (timeLeft || 0)
              : 0,
            submittedAt: new Date().toISOString(),
          }),
        });

        if (res.ok) {
          try {
            toast.success("Assignment submitted successfully!");

            // Remove assignment query parameter from URL after successful submission
            const url = new URL(window.location.href);
            url.searchParams.delete("assignment");
            window.history.replaceState({}, "", url.pathname + url.search);
          } catch {
            // Ignore errors
          }
        } else {
          try {
            const j = await res.json().catch(() => null);
            const msg = j?.error || "Failed to submit assignment";
            toast.error(msg);
          } catch {
            // Ignore errors
          }
        }
      } catch (_error) {
        try {
          toast.error("Failed to submit assignment");
        } catch {
          // Ignore errors
        }
      }
    } else {
      // Step 7: Handle legacy assignment submission (old format)
      const isLegacyAssignmentMode = routerData.teamsAssign === "1" || routerData.teamsAssign === 1;
      if (isLegacyAssignmentMode) {
        try {
          const assignmentIdStr = localStorage.getItem("currentAssignmentId");
          if (assignmentIdStr) {
            const assignmentId = Number(assignmentIdStr);
            if (!assignmentId || Number.isNaN(assignmentId)) {
              // Clear invalid assignment ID and show helpful error message
              localStorage.removeItem("currentAssignmentId");
              try {
                toast.error("Invalid assignment ID detected. Test submitted as practice mode.");
              } catch {
                // Ignore errors
              }
              return;
            }

            const name = (user?.user_metadata?.name || user?.email || "").toString();
            const res = await fetch("/api/assignments/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // Use string form to preserve INT8 precision server-side
              body: JSON.stringify({
                assignmentId: String(assignmentIdStr),
                userId: user?.id || null,
                name,
                eventName: routerData.eventName,
                score: mcqScore,
                detail: { total: mcqTotal },
              }),
            });

            if (res.ok) {
              try {
                const selStr = localStorage.getItem("teamsSelection") || "";
                const sel = selStr ? JSON.parse(selStr) : null;
                const teamName = sel?.school ? `${sel.school} ${sel.division || ""}`.trim() : null;
                if (teamName) {
                  toast.success(`Sent results to ${teamName}!`);
                }
              } catch {
                // Ignore errors
              }
            } else {
              try {
                const j = await res.json().catch(() => null);
                const msg = j?.error || "Failed to submit results";
                toast.error(msg);
              } catch {
                // Ignore errors
              }
            }

            // Clean up assignment ID from localStorage
            localStorage.removeItem("currentAssignmentId");
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }, [data, userAnswers, gradingResults, routerData, timeLeft]);

  /**
   * Reload questions with the same parameters
   *
   * Fetches a new set of questions based on current router parameters.
   * Used when user wants to practice more with same settings.
   */
  const reloadQuestions = useCallback(async () => {
    setIsResetting(true);

    try {
      const total = Number.parseInt((routerData.questionCount as string) || "10");
      const questions = await fetchQuestionsForParams(routerData as Record<string, unknown>, total);
      onDataRefresh(questions);
      localStorage.setItem("testQuestions", JSON.stringify(questions));
    } catch (error) {
      logger.error("Error reloading questions:", error);
      toast.error("Failed to reload questions. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }, [routerData, onDataRefresh]);

  return {
    isSubmitted,
    setIsSubmitted,
    handleSubmit,
    reloadQuestions,
    gradingFRQs: gradingFrQs,
    isResetting,
  };
}
