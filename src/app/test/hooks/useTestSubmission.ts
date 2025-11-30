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

function markTestAsSubmitted(routerData: RouterParams): void {
  try {
    const session = getCurrentTestSession();
    if (session && !session.isSubmitted) {
      markTestSubmitted();
    } else if (!session) {
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
}

async function gradeFrqQuestions(
  frqsToGrade: Array<{
    index: number;
    question: string;
    correctAnswers: (string | number)[];
    studentAnswer: string;
  }>,
  finalGradingResults: GradingResults,
  setGradingFrQs: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void
): Promise<void> {
  if (frqsToGrade.length === 0) {
    return;
  }

  for (const item of frqsToGrade) {
    setGradingFrQs((prev) => ({ ...prev, [item.index]: true }));
  }

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const { gradeFrqBatch } = await import("./utils/grading");
  const scores = await gradeFrqBatch(frqsToGrade, online);

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

function validateMcqScores(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  finalGradingResults: GradingResults
): GradingResults {
  const validatedGrading: GradingResults = { ...finalGradingResults };
  for (const [index, question] of data.entries()) {
    if (question.options && question.options.length > 0) {
      const answer = userAnswers[index] || [];
      const storedScore = validatedGrading[index];
      const computedScore = calculateMCQScore(question, answer);

      if (storedScore === undefined || Math.abs(storedScore - computedScore) > 0.01) {
        validatedGrading[index] = computedScore;
        if (storedScore !== undefined) {
          logger.warn(
            `Corrected score for question ${index} on submit: ${storedScore} -> ${computedScore}`
          );
        }
      }
    }
  }
  return validatedGrading;
}

function persistGradingResults(validatedGrading: GradingResults, routerData: RouterParams): void {
  try {
    markTestSubmitted();
    const hasCurrentAssignmentId = !!localStorage.getItem("currentAssignmentId");
    const isAssignmentMode = !!(
      routerData.assignmentId ||
      ((routerData.teamsAssign === "1" || routerData.teamsAssign === 1) && hasCurrentAssignmentId)
    );

    if (isAssignmentMode && routerData.assignmentId) {
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
      localStorage.setItem("testGradingResults", JSON.stringify(validatedGrading));
    }
    localStorage.removeItem("testFromBookmarks");
  } catch {
    // Ignore localStorage errors
  }
}

async function updateUserMetrics(
  routerData: RouterParams,
  mcqTotal: number,
  mcqScore: number
): Promise<void> {
  if (!routerData.eventName) {
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  updateMetrics(user?.id || null, {
    questionsAttempted: mcqTotal,
    correctAnswers: Math.round(mcqScore),
    eventName: routerData.eventName,
  });
}

async function submitEnhancedAssignment(
  routerData: RouterParams,
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  mcqScore: number,
  mcqTotal: number,
  timeLeft: number | null
): Promise<void> {
  if (!routerData.assignmentId) {
    return;
  }

  try {
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
}

async function submitLegacyAssignment(
  routerData: RouterParams,
  mcqScore: number,
  mcqTotal: number
): Promise<void> {
  const isLegacyAssignmentMode = routerData.teamsAssign === "1" || routerData.teamsAssign === 1;
  if (!isLegacyAssignmentMode) {
    return;
  }

  try {
    const assignmentIdStr = localStorage.getItem("currentAssignmentId");
    if (!assignmentIdStr) {
      return;
    }

    const assignmentId = Number(assignmentIdStr);
    if (!assignmentId || Number.isNaN(assignmentId)) {
      localStorage.removeItem("currentAssignmentId");
      try {
        toast.error("Invalid assignment ID detected. Test submitted as practice mode.");
      } catch {
        // Ignore errors
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const name = (user?.user_metadata?.name || user?.email || "").toString();
    const res = await fetch("/api/assignments/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    localStorage.removeItem("currentAssignmentId");
  } catch {
    // Ignore errors
  }
}

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
    markTestAsSubmitted(routerData);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const { computeMcqTotals } = await import("./utils/submission");
    const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(
      data,
      userAnswers,
      gradingResults,
      !!routerData.assignmentMode
    );

    const finalGradingResults = { ...newGrading };
    await gradeFrqQuestions(frqsToGrade, finalGradingResults, setGradingFrQs);
    const validatedGrading = validateMcqScores(data, userAnswers, finalGradingResults);
    persistGradingResults(validatedGrading, routerData);
    await updateUserMetrics(routerData, mcqTotal, mcqScore);
    await submitEnhancedAssignment(routerData, data, userAnswers, mcqScore, mcqTotal, timeLeft);
    await submitLegacyAssignment(routerData, mcqScore, mcqTotal);
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
