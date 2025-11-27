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
import type React from "react";

export interface SubmissionCallbacks {
  setIsSubmitted: (submitted: boolean) => void;
  setGradingResults: (results: GradingResults) => void;
  setGradingFrQs: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

function markTestAsSubmittedInSession(routerData: RouterParams): void {
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
    // Ignore errors
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
  setGradingResults: (results: GradingResults) => void,
  setGradingFrQs: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
): Promise<void> {
  if (frqsToGrade.length === 0) {
    return;
  }

  for (const item of frqsToGrade) {
    setGradingFrQs((prev) => ({ ...prev, [item.index]: true }));
  }

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const { gradeFrqBatch } = await import("../hooks/utils/grading");
  const scores = await gradeFrqBatch(frqsToGrade, online);

  for (const [idx, score] of scores.entries()) {
    const frqItem = frqsToGrade[idx];
    if (!frqItem) {
      continue;
    }
    const questionIndex = frqItem.index;
    finalGradingResults[questionIndex] = score;
    setGradingResults({ ...finalGradingResults, [questionIndex]: score });
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
    // Ignore errors
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

export async function handleTestSubmission(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
  routerData: RouterParams,
  timeLeft: number | null,
  callbacks: SubmissionCallbacks
): Promise<void> {
  const { setIsSubmitted, setGradingResults, setGradingFrQs } = callbacks;

  setIsSubmitted(true);
  markTestAsSubmittedInSession(routerData);
  window.scrollTo({ top: 0, behavior: "smooth" });

  const { computeMcqTotals } = await import("../hooks/utils/submission");
  const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(
    data,
    userAnswers,
    gradingResults,
    !!routerData.assignmentMode
  );
  setGradingResults(newGrading);

  const finalGradingResults = { ...newGrading };
  await gradeFrqQuestions(frqsToGrade, finalGradingResults, setGradingResults, setGradingFrQs);

  const validatedGrading = validateMcqScores(data, userAnswers, finalGradingResults);
  setGradingResults(validatedGrading);
  persistGradingResults(validatedGrading, routerData);

  await updateUserMetrics(routerData, mcqTotal, mcqScore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await submitAssignment(
    data,
    userAnswers,
    routerData,
    timeLeft,
    mcqScore,
    mcqTotal,
    user?.id || null,
    user?.user_metadata?.name || user?.email || ""
  );
}

function formatAnswersForSubmission(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>
): Record<string, unknown> {
  const formattedAnswers: Record<string, unknown> = {};
  for (const [index, question] of data.entries()) {
    const answer = userAnswers[index];
    if (answer !== null && answer !== undefined && question.id) {
      formattedAnswers[question.id] = answer;
    }
  }
  return formattedAnswers;
}

async function handleEnhancedAssignmentSubmission(
  assignmentId: string,
  formattedAnswers: Record<string, unknown>,
  routerData: RouterParams,
  timeLeft: number | null,
  mcqScore: number,
  mcqTotal: number
): Promise<void> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: formattedAnswers,
        score: mcqScore,
        totalPoints: mcqTotal,
        timeSpent: routerData.timeLimit
          ? Number.parseInt(routerData.timeLimit) * 60 - (timeLeft || 0)
          : 0,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      try {
        (await import("react-toastify")).toast.success("Assignment submitted successfully!");
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
        (await import("react-toastify")).toast.error(msg);
      } catch {
        // Ignore errors
      }
    }
  } catch (_error) {
    try {
      (await import("react-toastify")).toast.error("Failed to submit assignment");
    } catch {
      // Ignore errors
    }
  }
}

async function validateLegacyAssignmentId(assignmentIdStr: string): Promise<number | null> {
  const assignmentId = Number(assignmentIdStr);
  if (!assignmentId || Number.isNaN(assignmentId)) {
    localStorage.removeItem("currentAssignmentId");
    try {
      (await import("react-toastify")).toast.error(
        "Invalid assignment ID detected. Test submitted as practice mode."
      );
    } catch {
      // Ignore errors
    }
    return null;
  }
  return assignmentId;
}

async function submitLegacyAssignment(
  assignmentId: string,
  userId: string | null,
  userName: string,
  routerData: RouterParams,
  mcqScore: number,
  mcqTotal: number
): Promise<void> {
  try {
    const res = await fetch("/api/assignments/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: String(assignmentId),
        userId,
        name: userName,
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
          (await import("react-toastify")).toast.success(`Sent results to ${teamName}!`);
        }
      } catch {
        // Ignore errors
      }
    } else {
      try {
        const j = await res.json().catch(() => null);
        const msg = j?.error || "Failed to submit results";
        (await import("react-toastify")).toast.error(msg);
      } catch {
        // Ignore errors
      }
    }
    localStorage.removeItem("currentAssignmentId");
  } catch {
    // Ignore errors
  }
}

async function submitAssignment(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  routerData: RouterParams,
  timeLeft: number | null,
  mcqScore: number,
  mcqTotal: number,
  userId: string | null,
  userName: string
): Promise<void> {
  if (routerData.assignmentId) {
    const formattedAnswers = formatAnswersForSubmission(data, userAnswers);
    await handleEnhancedAssignmentSubmission(
      routerData.assignmentId,
      formattedAnswers,
      routerData,
      timeLeft,
      mcqScore,
      mcqTotal
    );
    return;
  }

  const isLegacyAssignmentMode = routerData.teamsAssign === "1" || routerData.teamsAssign === 1;
  if (!isLegacyAssignmentMode) {
    return;
  }

  const assignmentIdStr = localStorage.getItem("currentAssignmentId");
  if (!assignmentIdStr) {
    return;
  }

  const assignmentId = await validateLegacyAssignmentId(assignmentIdStr);
  if (assignmentId === null) {
    return;
  }

  await submitLegacyAssignment(assignmentIdStr, userId, userName, routerData, mcqScore, mcqTotal);
}
