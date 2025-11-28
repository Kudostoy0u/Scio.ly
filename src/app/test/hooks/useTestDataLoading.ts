"use client";

import type { Question } from "@/app/utils/geminiService";
import type { RouterParams } from "@/app/utils/questionUtils";
import logger from "@/lib/utils/logger";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchQuestionsForParams } from "./utils/fetchQuestions";
import { initLoad } from "./utils/initLoad";
import { normalizeQuestionsFull } from "./utils/normalize";
import { buildPreviewAutofill } from "./utils/preview";
import { resolveRouterParams } from "./utils/ssr";

/**
 * Validation function for assignment questions
 * Ensures questions have required answers field
 */
function validateAssignmentQuestions(questions: unknown[]): void {
  for (const [index, question] of questions.entries()) {
    const q = question as { answers?: unknown; question?: string };
    if (!q.answers) {
      throw new Error(
        `Assignment question ${index + 1} (${q.question ?? "unknown"}) missing required answers field`
      );
    }

    if (q.answers === undefined) {
      throw new Error(
        `Assignment question ${index + 1} (${q.question ?? "unknown"}) has undefined answers field`
      );
    }

    if (q.answers === null) {
      throw new Error(
        `Assignment question ${index + 1} (${q.question ?? "unknown"}) has null answers field`
      );
    }

    if (Array.isArray(q.answers) && q.answers.length === 0) {
      throw new Error(
        `Assignment question ${index + 1} (${q.question ?? "unknown"}) has empty answers array`
      );
    }
  }
}

/**
 * Custom hook for managing test data loading and initialization
 *
 * Handles all data-related state and effects for the test system:
 * - SSR data application
 * - Assignment loading from API
 * - View results mode restoration
 * - localStorage resumption
 * - Fallback fetch when no data is available
 *
 * @param initialData - Optional initial question data from SSR
 * @param initialRouterData - Optional initial router parameters from SSR
 * @param stableRouterData - Stable router data reference (memoized)
 * @returns Data loading state and setters
 *
 * @example
 * ```typescript
 * const {
 *   data,
 *   setData,
 *   isLoading,
 *   setIsLoading,
 *   fetchError,
 *   routerData
 * } = useTestDataLoading(initialData, initialRouterData, stableRouterData);
 * ```
 */
export function useTestDataLoading(
  initialData?: Question[],
  initialRouterData?: RouterParams,
  stableRouterData?: RouterParams
) {
  // Core data state
  const [data, setData] = useState<Question[]>(Array.isArray(initialData) ? initialData : []);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [routerData, setRouterData] = useState<RouterParams>(initialRouterData || {});

  // State tracking refs
  const fetchStartedRef = useRef(false);
  const fetchCompletedRef = useRef(false);
  const ssrAppliedRef = useRef(false);

  // Stable reference to router data
  const stableRouterDataMemo = useMemo(
    () => stableRouterData || initialRouterData || {},
    [stableRouterData, initialRouterData]
  );

  // Client-side check for preview mode
  const isClient = typeof window !== "undefined";
  const previewSearch = isClient ? new URLSearchParams(window.location.search) : null;
  const isPreviewMode = !!(previewSearch && previewSearch.get("preview") === "1");

  // Debug data state changes
  useEffect(() => {
    if (data.length > 0) {
      logger.log("Data loaded", { count: data.length });
    }
  }, [data]);

  /**
   * Effect 1: Complex initialization - handles SSR, assignments, and view results mode
   * This is the main data loading effect that runs on mount
   *
   * NOTE: This effect has high cognitive complexity because it handles multiple loading paths:
   * - View results mode restoration
   * - Assignment loading (old and new format)
   * - localStorage resumption
   * - SSR data application
   * This complexity is intentional to centralize all data loading logic.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This effect consolidates multiple data loading paths
  useEffect(() => {
    // Handle view results mode - set submitted state and load stored data
    if (stableRouterDataMemo.viewResults === "true") {
      const assignmentKey = `assignment_${stableRouterDataMemo.assignmentId}`;
      const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);

      if (storedQuestions) {
        try {
          const parsedQuestions = JSON.parse(storedQuestions);

          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            // Validate assignment questions have required answers field
            validateAssignmentQuestions(parsedQuestions);
            setData(parsedQuestions);
            setIsLoading(false);
            fetchCompletedRef.current = true;
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("Assignment question")) {
            // Clear invalid questions from localStorage
            localStorage.removeItem(`${assignmentKey}_questions`);
            localStorage.removeItem(`${assignmentKey}_answers`);
            localStorage.removeItem(`${assignmentKey}_grading`);
          }
        }
      }
    }

    // Handle assignment loading
    const isAssignmentMode = !!(
      stableRouterDataMemo.assignmentId ||
      stableRouterDataMemo.teamsAssign === "1" ||
      stableRouterDataMemo.teamsAssign === 1
    );

    if (isAssignmentMode && !fetchCompletedRef.current) {
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This function handles multiple assignment loading scenarios
      const loadAssignment = async () => {
        try {
          const assignmentId = stableRouterDataMemo.assignmentId;
          const assignmentKey = `assignment_${assignmentId}`;

          // If coming from /assign/[id] route, check old localStorage format
          if (stableRouterDataMemo.teamsAssign === "1" || stableRouterDataMemo.teamsAssign === 1) {
            const storedQuestions = localStorage.getItem("testQuestions");
            const answersKey = assignmentId
              ? `assignment_${assignmentId}_answers`
              : "testUserAnswers";
            const gradesKey = assignmentId
              ? `assignment_${assignmentId}_grading`
              : "testGradingResults";

            if (storedQuestions) {
              try {
                const questions = JSON.parse(storedQuestions);

                // Validate questions have valid answers field
                const hasInvalidQuestions = questions.some(
                  (q: Question) =>
                    !(q.answers && Array.isArray(q.answers)) || q.answers.length === 0
                );

                if (hasInvalidQuestions) {
                  // Clear the invalid old cache
                  localStorage.removeItem("testQuestions");
                  localStorage.removeItem(answersKey);
                  localStorage.removeItem(gradesKey);
                  localStorage.removeItem("testSubmitted");
                  localStorage.removeItem("testParams");
                  localStorage.removeItem("currentTestSession");
                } else {
                  setData(normalizeQuestionsFull(questions));
                  setRouterData({
                    ...stableRouterDataMemo,
                    eventName:
                      (stableRouterDataMemo.eventName as string | undefined) || "Assignment",
                    timeLimit: (stableRouterDataMemo.timeLimit as string | undefined) || "60",
                    assignmentMode: true,
                  });

                  setIsLoading(false);
                  fetchCompletedRef.current = true;
                  return;
                }
              } catch (_error) {
                // Continue to load from API
              }
            }
          }

          // Check for existing assignment progress in new localStorage format
          if (assignmentId) {
            const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
            const storedSession = localStorage.getItem(`${assignmentKey}_session`);

            if (storedQuestions) {
              try {
                const questions = JSON.parse(storedQuestions);
                const session = storedSession ? JSON.parse(storedSession) : null;

                // Validate questions have valid answers field
                const hasInvalidQuestions = questions.some(
                  (q: Question) =>
                    !(q.answers && Array.isArray(q.answers)) || q.answers.length === 0
                );

                if (hasInvalidQuestions) {
                  // Clear the invalid cache
                  localStorage.removeItem(`${assignmentKey}_questions`);
                  localStorage.removeItem(`${assignmentKey}_answers`);
                  localStorage.removeItem(`${assignmentKey}_session`);
                  localStorage.removeItem(`${assignmentKey}_grading`);
                } else {
                  setData(normalizeQuestionsFull(questions));
                  setRouterData({
                    ...stableRouterDataMemo,
                    eventName: session?.eventName || "Assignment",
                    timeLimit: session?.timeLimit || "60",
                    assignmentMode: true,
                  });

                  setIsLoading(false);
                  fetchCompletedRef.current = true;
                  return;
                }
              } catch (_error) {
                // Continue to load from API
              }
            }
          }

          // Clear localStorage test state
          localStorage.removeItem("testSubmitted");
          localStorage.removeItem("testUserAnswers");
          localStorage.removeItem("testQuestions");
          localStorage.removeItem("testParams");
          localStorage.removeItem("testGradingResults");
          localStorage.removeItem("currentTestSession");

          // Fetch from API
          const response = await fetch(`/api/assignments/${assignmentId}`);
          if (response.ok) {
            const data = await response.json();
            const assignment = data.assignment;
            const questions = assignment.questions;
            const normalized = normalizeQuestionsFull(questions);

            setData(normalized);
            setRouterData({
              ...stableRouterDataMemo,
              eventName: assignment.title,
              timeLimit: "60",
              assignmentMode: true,
            });

            // Save to localStorage
            localStorage.setItem(`${assignmentKey}_questions`, JSON.stringify(normalized));
            localStorage.setItem(
              `${assignmentKey}_session`,
              JSON.stringify({
                eventName: assignment.title,
                timeLimit: "60",
                assignmentMode: true,
                isSubmitted: false,
                timeLeft: 60 * 60,
              })
            );

            setIsLoading(false);
            fetchCompletedRef.current = true;
            logger.log("loaded assignment questions", { count: normalized.length });
            return;
          }
        } catch (_error) {
          setFetchError("Failed to load assignment");
          setIsLoading(false);
          fetchCompletedRef.current = true;
          return;
        }
      };

      loadAssignment();
      return;
    }

    // Prefer locally stored questions over SSR on reload to resume tests
    if (!ssrAppliedRef.current) {
      try {
        // Only clear practice data when starting a new assignment
        const currentAssignmentId = localStorage.getItem("currentAssignmentId");
        const isAssignmentMode = !!stableRouterDataMemo.assignmentId;
        const newAssignmentId = stableRouterDataMemo.assignmentId;

        if (isAssignmentMode && newAssignmentId && newAssignmentId !== currentAssignmentId) {
          // Starting a new assignment - clear practice data
          localStorage.removeItem("testQuestions");
          localStorage.removeItem("testUserAnswers");
          localStorage.removeItem("testGradingResults");
          localStorage.removeItem("testParams");

          // Clear previous assignment data if switching to a different assignment
          if (currentAssignmentId) {
            const oldAssignmentKey = `assignment_${currentAssignmentId}`;
            localStorage.removeItem(`${oldAssignmentKey}_questions`);
            localStorage.removeItem(`${oldAssignmentKey}_answers`);
            localStorage.removeItem(`${oldAssignmentKey}_grading`);
            localStorage.removeItem(`${oldAssignmentKey}_session`);
          }

          // Update current assignment ID
          localStorage.setItem("currentAssignmentId", String(newAssignmentId));
        }

        const stored = localStorage.getItem("testQuestions");
        if (stored && !isAssignmentMode) {
          const parsed = JSON.parse(stored);
          const hasQs = Array.isArray(parsed) && parsed.length > 0;
          if (hasQs) {
            const normalized = normalizeQuestionsFull(parsed as Question[]);
            setData(normalized);
            setIsLoading(false);
            fetchCompletedRef.current = true;
            logger.log("resume from localStorage before SSR", { count: normalized.length });
            return;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Short-circuit if SSR provided data
    if (ssrAppliedRef.current) {
      return;
    }

    if (
      Array.isArray(initialData) &&
      initialData.length > 0 &&
      isLoading &&
      !fetchCompletedRef.current
    ) {
      ssrAppliedRef.current = true;
      logger.log("short-circuit: applying SSR initialData", { count: initialData.length });

      // Persist SSR data with normalization for consistent reloads
      const paramsStr = localStorage.getItem("testParams");
      resolveRouterParams(initialRouterData ?? {}, paramsStr);
      const base = normalizeQuestionsFull(initialData as Question[]);
      setData(base);
      setIsLoading(false);
      fetchCompletedRef.current = true;
    }
  }, [
    initialData,
    initialRouterData,
    stableRouterDataMemo,
    isLoading,
    setData,
    setIsLoading,
    setRouterData,
    setFetchError,
  ]);

  /**
   * Effect 2: initLoad fallback fetch
   * Runs when no data is available from SSR, localStorage, or assignments
   */
  useEffect(() => {
    // Skip initLoad if we're in assignment mode - assignment loading is handled separately
    if (stableRouterDataMemo.assignmentId) {
      return;
    }

    if (
      fetchStartedRef.current ||
      fetchCompletedRef.current ||
      data.length > 0 ||
      isLoading === false
    ) {
      return;
    }

    fetchStartedRef.current = true;
    initLoad({
      initialData,
      stableRouterData: stableRouterDataMemo,
      setRouterData,
      setFetchError,
      setIsLoading,
      setData,
      // Timer is handled separately in the parent hook
      setTimeLeft: () => {
        // No-op: Timer management is handled in useTestState
      },
      fetchCompletedRef,
    });
  }, [initialData, stableRouterDataMemo, data.length, isLoading, setRouterData, setFetchError, setIsLoading, setData]);

  /**
   * Effect 3: Preview mode auto-fill (optional, data-related)
   * If in preview mode, this prepares the data display state
   */
  useEffect(() => {
    if (!isPreviewMode) {
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    try {
      const { filled, grades } = buildPreviewAutofill(data);
      // Store preview data for later use
      localStorage.setItem("testUserAnswers", JSON.stringify(filled));
      localStorage.setItem("testGradingResults", JSON.stringify(grades));
    } catch {
      // Ignore errors
    }
  }, [isPreviewMode, data]);

  return {
    // State
    data,
    isLoading,
    fetchError,
    routerData,

    // Setters
    setData,
    setIsLoading,
    setFetchError,
    setRouterData,

    // Utility function for reloading questions
    reloadQuestions: async () => {
      setFetchError(null);
      try {
        const total = Number.parseInt(routerData.questionCount || "10");
        const questions = await fetchQuestionsForParams(
          routerData as Record<string, unknown>,
          total
        );
        setData(questions);
        localStorage.setItem("testQuestions", JSON.stringify(questions));
      } catch (error) {
        logger.error("Error reloading questions:", error);
        setFetchError("Failed to reload questions. Please try again.");
      }
    },
  };
}
