"use client";
import logger from "@/lib/utils/logger";
import type React from "react";

import api from "@/app/api";
import { toast } from "react-toastify";
import { processFrqExplanation, processMcqExplanation } from "./explanationLogic";
import type { Question } from "./geminiService";

/**
 * Router parameters interface for question filtering
 * Contains all possible parameters for filtering and configuring questions
 */
export interface RouterParams {
  /** Name of the Science Olympiad event */
  eventName?: string;
  /** Number of questions to request */
  questionCount?: string;
  /** Single difficulty level */
  difficulty?: string;
  /** Multiple difficulty levels */
  difficulties?: string[];
  /** Type of questions (multiple-choice, free-response) */
  types?: string;
  /** Time limit for the test */
  timeLimit?: string;
  /** Division (B or C) */
  division?: string;
  /** Tournament name */
  tournament?: string;
  /** Single subtopic */
  subtopic?: string;
  /** Multiple subtopics */
  subtopics?: string[];
  /** Assignment ID for assignment mode */
  assignmentId?: string;
  /** View results mode for assignments */
  viewResults?: string;
  /** Assignment mode flag */
  assignmentMode?: boolean;
  /** Teams assignment flag (legacy: "1" or 1) */
  teamsAssign?: string | number;
  /** Index signature for compatibility */
  [key: string]: unknown;
}

/**
 * Grading results mapping
 * Maps question indices to their scores (0 = incorrect, 0.5 = partial, 1 = correct)
 */
export interface GradingResults {
  [key: string]: number;
}

/**
 * Explanations mapping
 * Maps question indices to their explanation text
 */
export interface Explanations {
  [key: number]: string;
}

/**
 * Loading state for explanations
 * Maps question indices to their loading state
 */
export interface LoadingExplanation {
  [key: number]: boolean;
}

/**
 * Difficulty ranges for question filtering
 * Maps difficulty names to their numerical ranges (0.0 to 1.0)
 */
export const difficultyRanges: Record<string, { min: number; max: number }> = {
  "very-easy": { min: 0, max: 0.19 },
  easy: { min: 0.2, max: 0.39 },
  medium: { min: 0.4, max: 0.59 },
  hard: { min: 0.6, max: 0.79 },
  "very-hard": { min: 0.8, max: 1.0 },
};

/**
 * Determine if a question is a multi-select question
 * Checks for multi-select keywords in the question text and validates answer format
 *
 * @param {string} question - The question text to analyze
 * @param {number | string[]} [answers] - Optional array of correct answers
 * @returns {boolean} True if the question is multi-select, false otherwise
 * @example
 * ```typescript
 * const isMulti = isMultiSelectQuestion("Choose all that apply: Which are mammals?");
 * console.log(isMulti); // true
 * ```
 */
export const isMultiSelectQuestion = (question: string, answers?: (number | string)[]): boolean => {
  const multiSelectKeywords = [
    "choose all",
    "select all",
    "all that apply",
    "multi select",
    "multiple select",
    "multiple answers",
    "check all",
    "mark all",
  ];

  const hasKeywords = multiSelectKeywords.some((keyword) =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasKeywords) {
    return true;
  }

  if (answers && answers.length > 1) {
    return true;
  }

  return false;
};

/**
 * Grade free response questions using AI
 * Sends free response questions to the AI grading service
 *
 * @param {Object[]} freeResponses - Array of free response questions to grade
 * @param {string} freeResponses[].question - The question text
 * @param {string | number[]} freeResponses[].correctAnswers - Array of correct answers
 * @param {string} freeResponses[].studentAnswer - The student's answer
 * @returns {Promise<number[]>} Array of scores (0-1) for each response
 * @throws {Error} When API request fails
 * @example
 * ```typescript
 * const scores = await gradeFreeResponses([
 *   {
 *     question: "What is the capital of France?",
 *     correctAnswers: ["Paris"],
 *     studentAnswer: "Paris"
 *   }
 * ]);
 * console.log(scores[0]); // 1 (correct)
 * ```
 */
export const gradeFreeResponses = async (
  freeResponses: { question: string; correctAnswers: (string | number)[]; studentAnswer: string }[]
): Promise<number[]> => {
  if (freeResponses.length === 0) {
    return [];
  }

  try {
    const response = await fetch(api.geminiGradeFreeResponses, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: freeResponses }),
    });

    if (!response.ok) {
      logger.error("API error:", await response.text());
      return freeResponses.map(() => 0);
    }

    const data = await response.json();
    if (data.success && data.data.scores) {
      return data.data.scores;
    }
    return freeResponses.map(() => 0);
  } catch (error) {
    logger.error("Error grading with API:", error);
    return freeResponses.map(() => 0);
  }
};

/**
 * Grade a single free response question using AI
 * Sends a single question to the AI grading service
 *
 * @param {string} userAnswer - The student's answer to grade
 * @param {string | number[]} correctAnswers - Array of correct answers
 * @param {string} question - The question text
 * @returns {Promise<number>} Score (0-1) for the response
 * @throws {Error} When API request fails
 * @example
 * ```typescript
 * const score = await gradeWithGemini("Paris", ["Paris"], "What is the capital of France?");
 * console.log(score); // 1 (correct)
 * ```
 */
export const gradeWithGemini = async (
  userAnswer: string,
  correctAnswers: (string | number)[],
  question: string
): Promise<number> => {
  if (!userAnswer) {
    return 0;
  }

  try {
    const response = await fetch(api.geminiGradeFreeResponses, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [
          {
            question: question,
            correctAnswers: correctAnswers,
            studentAnswer: userAnswer,
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error("API error:", await response.text());
      return 0;
    }

    const data = await response.json();
    if (data.success && data.data.scores && data.data.scores.length > 0) {
      return data.data.scores[0];
    }
    return 0;
  } catch (error) {
    logger.error("Error grading with API:", error);
    return 0;
  }
};

/**
 * Build API parameters string from router parameters
 * Converts router parameters into a query string for API requests
 *
 * @param {RouterParams} routerParams - Router parameters to convert
 * @param {number} requestCount - Number of questions to request
 * @returns {string} URL-encoded query string
 * @example
 * ```typescript
 * const params = buildApiParams({
 *   eventName: "Anatomy & Physiology",
 *   difficulties: ["easy", "medium"],
 *   division: "C"
 * }, 10);
 * console.log(params); // "event=Anatomy%20%26%20Physiology&difficulty_min=0.20&difficulty_max=0.59&limit=10"
 * ```
 */
export const buildApiParams = (routerParams: RouterParams, requestCount: number): string => {
  const { eventName, difficulties, division, tournament, subtopics, types } = routerParams;

  const params: string[] = [];

  let apiEventName = eventName;
  if (eventName === "Dynamic Planet") {
    apiEventName = "Dynamic Planet - Oceanography";
  }

  if (apiEventName) {
    params.push(`event=${encodeURIComponent(apiEventName)}`);
  }
  if (division && division !== "any") {
    params.push(`division=${encodeURIComponent(division)}`);
  }
  if (tournament && tournament !== "any") {
    params.push(`tournament=${encodeURIComponent(tournament)}`);
  }
  if (subtopics && subtopics.length > 0) {
    params.push(`subtopics=${encodeURIComponent(subtopics.join(","))}`);
  }

  if (types) {
    if (types === "multiple-choice") {
      params.push("question_type=mcq");
    } else if (types === "free-response") {
      params.push("question_type=frq");
    }
  }

  if (difficulties && difficulties.length > 0) {
    const allRanges = difficulties
      .map((d) => difficultyRanges[d])
      .filter((r): r is { min: number; max: number } => Boolean(r));
    if (allRanges.length > 0) {
      const minValue = Math.min(...allRanges.map((r) => r.min));
      const maxValue = Math.max(...allRanges.map((r) => r.max));
      params.push(`difficulty_min=${minValue.toFixed(2)}`);
      params.push(`difficulty_max=${maxValue.toFixed(2)}`);
    }
  }

  params.push(`limit=${requestCount}`);

  return params.join("&");
};

/**
 * Filter questions by type (multiple-choice or free-response)
 * Returns questions that match the specified type
 *
 * @param {Question[]} questions - Array of questions to filter
 * @param {string} types - Type to filter by ("multiple-choice" or "free-response")
 * @returns {Question[]} Filtered array of questions
 * @example
 * ```typescript
 * const mcQuestions = filterQuestionsByType(questions, "multiple-choice");
 * const frQuestions = filterQuestionsByType(questions, "free-response");
 * ```
 */
export const filterQuestionsByType = (questions: Question[], types: string): Question[] => {
  if (types === "multiple-choice") {
    return questions.filter((q) => q.options && q.options.length > 0);
  }
  if (types === "free-response") {
    return questions.filter((q) => !q.options || q.options.length === 0);
  }
  return questions;
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 * Returns a new array with elements in random order
 *
 * @param {T[]} array - Array to shuffle
 * @returns {T[]} New array with shuffled elements
 * @example
 * ```typescript
 * const shuffled = shuffleArray([1, 2, 3, 4, 5]);
 * console.log(shuffled); // [3, 1, 5, 2, 4] (random order)
 * ```
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newArray[i];
    const temp2 = newArray[j];
    if (temp !== undefined && temp2 !== undefined) {
      newArray[i] = temp2;
      newArray[j] = temp;
    }
  }
  return newArray;
};

export const getExplanation = async (
  index: number,
  question: Question,
  userAnswer: (string | null)[],
  routerData: RouterParams,
  explanations: Explanations,
  setExplanations: React.Dispatch<React.SetStateAction<Explanations>>,
  setLoadingExplanation: React.Dispatch<React.SetStateAction<LoadingExplanation>>,
  lastCallTime: number,
  setLastCallTime: React.Dispatch<React.SetStateAction<number>>,
  setData: React.Dispatch<React.SetStateAction<Question[]>>,
  gradingResults: GradingResults,
  setGradingResults: React.Dispatch<React.SetStateAction<GradingResults>>,
  userAnswers?: Record<number, (string | null)[] | null>,
  rateLimitDelay = 2000
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex logic required for explanation generation with rate limiting and error handling
) => {
  if (explanations[index]) {
    return;
  }

  const now = Date.now();
  if (now - lastCallTime < rateLimitDelay) {
    toast.error("Please wait a moment before requesting another explanation");
    return;
  }
  setLastCallTime(now);

  setLoadingExplanation((prev) => ({ ...prev, [index]: true }));

  try {
    const isMcq = question.options && question.options.length > 0;

    logger.log("🚀 Making request to:", api.geminiExplain);

    // Prepare the request body with image URLs if they exist
    const userAnswerString = Array.isArray(userAnswer)
      ? userAnswer.filter((a): a is string => a !== null).join(", ")
      : typeof userAnswer === "string"
        ? userAnswer
        : String(userAnswer ?? "");
    const requestBody: {
      question: Question;
      userAnswer: string;
      event: string;
      imageUrls?: string[];
      imageNote?: string;
    } = {
      question: question,
      userAnswer: userAnswerString,
      event: routerData.eventName || "Science Olympiad",
    };

    // Add image URLs to the request if they exist
    if (question.imageUrl || question.imageData) {
      const imageUrls: string[] = [];
      if (question.imageUrl && typeof question.imageUrl === "string") {
        imageUrls.push(question.imageUrl);
      }
      if (question.imageData && typeof question.imageData === "string") {
        imageUrls.push(question.imageData);
      }

      if (imageUrls.length > 0) {
        requestBody.imageUrls = imageUrls.filter((url): url is string => url !== null);
        requestBody.imageNote =
          "The above URLs contain relevant images for this question. The URLs themselves may or may not contain useful information for the explanation.";
      }
    }

    const response = await fetch(api.geminiExplain, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("API Response error:", errorText);
      throw new Error(`Failed to fetch explanation: ${response.status} ${response.statusText}`);
    }

    logger.log("✅ Received response, status:", response.status);
    const data = await response.json();
    logger.log("📦 Received data:", data);
    if (!(data.success && data.data)) {
      throw new Error("Invalid response format from API");
    }

    const { explanation, correctIndices, correctedAnswers } = data.data;
    let explanationText = explanation;

    let result: import("./explanationLogic").ExplanationResult | null = null;

    if (isMcq && correctIndices && correctIndices.length > 0) {
      logger.log("🔍 Found correct indices in explanation");
      try {
        result = processMcqExplanation(
          index,
          question,
          explanation,
          correctIndices,
          userAnswers,
          gradingResults
        );
      } catch (parseError) {
        logger.error("Failed to parse correct indices:", parseError);
      }
    }

    if (!isMcq && correctedAnswers && correctedAnswers.length > 0) {
      logger.log("🔍 Found corrected answers for FRQ in explanation");
      try {
        result = processFrqExplanation(
          index,
          question,
          explanation,
          correctedAnswers,
          userAnswers,
          gradingResults
        );
      } catch (parseError) {
        logger.error("Failed to parse corrected answers for FRQ:", parseError);
      }
    }

    if (result) {
      await handleExplanationResult(
        result,
        index,
        question,
        routerData,
        setData,
        setGradingResults
      );
      explanationText = result.explanationText;
    }

    logger.log("🎯 Setting explanation text:", explanationText);
    setExplanations((prev) => ({ ...prev, [index]: explanationText }));
  } catch (error) {
    handleExplanationError(error, index, setExplanations);
  } finally {
    setLoadingExplanation((prev) => ({ ...prev, [index]: false }));
  }
};

const handleExplanationError = (
  error: unknown,
  index: number,
  setExplanations: React.Dispatch<React.SetStateAction<Record<number, string>>>
) => {
  logger.error("Error in getExplanation:", error);
  const errorMsg = `Failed to load explanation: ${(error as Error).message}`;
  setExplanations((prev) => ({
    ...prev,
    [index]: errorMsg,
  }));
  toast.error(errorMsg);
};

const handleExplanationResult = async (
  result: import("./explanationLogic").ExplanationResult,
  index: number,
  question: Question,
  routerData: RouterParams,
  setData: React.Dispatch<React.SetStateAction<Question[]>>,
  setGradingResults: React.Dispatch<React.SetStateAction<GradingResults>>
) => {
  if (result.shouldSubmitEdit && result.updatedQuestion) {
    logger.log("✅ Explanation suggested different answers, submitting edit request.");
    toast.info("Answer has been updated based on explanation");

    try {
      await fetch(api.reportEdit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          answer: question.answers,
          originalQuestion: question,
          editedQuestion: result.updatedQuestion,
          event: routerData.eventName || "Unknown Event",
          reason: result.editReason,
          bypass: true,
        }),
      });
    } catch (editError) {
      logger.error("Failed to submit auto-edit request:", editError);
    }

    setData((prevData) => {
      const newData = [...prevData];
      if (newData[index]) {
        newData[index] = result.updatedQuestion as Question;
      }
      return newData;
    });
  }

  if (result.gradingUpdate) {
    const { isCorrect } = result.gradingUpdate;
    if (isCorrect) {
      logger.log(
        `✅ Updating grading result for question ${index + 1} to Correct based on explanation.`
      );
      setGradingResults((prev) => ({ ...prev, [index]: 1 }));
    } else {
      logger.log(
        `❌ Updating grading result for question ${index + 1} to Incorrect based on explanation.`
      );
      setGradingResults((prev) => ({ ...prev, [index]: 0 }));
    }
  }
};

/**
 * Calculate score for multiple choice questions
 * Handles both single-select and multi-select questions
 *
 * @param {Question} question - The question object
 * @param {string | null[]} userAnswers - Array of user's selected answers
 * @returns {number} Score (0, 0.5, or 1) for the question
 * @example
 * ```typescript
 * const score = calculateMCQScore(question, ["A", "B"]);
 * console.log(score); // 1 if correct, 0.5 if partial, 0 if incorrect
 * ```
 */
export const calculateMCQScore = (question: Question, userAnswers: (string | null)[]): number => {
  if (!question.answers || question.answers.length === 0) {
    return 0;
  }

  const filteredUserAnswers = userAnswers.filter((a) => a !== null) as string[];
  const correctOptions = question.answers.map((ans) => question.options?.[Number(ans)]);

  if (isMultiSelectQuestion(question.question, question.answers)) {
    if (filteredUserAnswers.length === 0) {
      return 0;
    }

    const numCorrectSelected = filteredUserAnswers.filter((a) => correctOptions.includes(a)).length;
    const hasIncorrectAnswers = filteredUserAnswers.some((a) => !correctOptions.includes(a));

    if (numCorrectSelected === correctOptions.length && !hasIncorrectAnswers) {
      return 1;
    }
    if (numCorrectSelected > 0) {
      return 0.5;
    }
    return 0;
  }
  const result =
    filteredUserAnswers.length === 1 && filteredUserAnswers[0] === correctOptions[0] ? 1 : 0;
  return result;
};

/**
 * Format seconds into MM:SS time format
 * Converts seconds to a readable time string
 *
 * @param {number} seconds - Number of seconds to format
 * @returns {string} Formatted time string (MM:SS)
 * @example
 * ```typescript
 * const timeStr = formatTime(125);
 * console.log(timeStr); // "2:05"
 * ```
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
};
