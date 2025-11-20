"use client";
import logger from "@/lib/utils/logger";

import { toast } from "react-toastify";
import api from "@/app/api";
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
    const allRanges = difficulties.map((d) => difficultyRanges[d]).filter((r): r is { min: number; max: number } => Boolean(r));
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
    const requestBody: any = {
      question: question,
      userAnswer: userAnswer,
      event: routerData.eventName || "Science Olympiad",
    };

    // Add image URLs to the request if they exist
    if (question.imageUrl || question.imageData) {
      const imageUrls: string[] = [];
      if (question.imageUrl) {
        imageUrls.push(question.imageUrl);
      }
      if (question.imageData) {
        imageUrls.push(question.imageData);
      }

      requestBody.imageUrls = imageUrls;
      requestBody.imageNote =
        "The above URLs contain relevant images for this question. The URLs themselves may or may not contain useful information for the explanation.";
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

    if (isMcq && correctIndices && correctIndices.length > 0) {
      logger.log("🔍 Found correct indices in explanation");
      try {
        const suggestedIndices = correctIndices.filter((n: number) => !Number.isNaN(n));
        if (suggestedIndices.length > 0) {
          const correctedAnswers = suggestedIndices;
          const currentAnswers = question.answers || [];

          const normalizedCurrentAnswers = currentAnswers
            .map((ans) => (typeof ans === "string" ? Number.parseInt(ans) : ans))
            .filter((n) => typeof n === "number" && !Number.isNaN(n));

          const normalizedNewAnswers = correctedAnswers;

          logger.log("🔍 Answer Comparison Debug:");
          logger.log("  Original question.answers:", currentAnswers);
          logger.log("  Normalized current answers:", normalizedCurrentAnswers);
          logger.log("  Explanation suggested answers:", normalizedNewAnswers);

          const answersChanged = !(
            normalizedNewAnswers.length === normalizedCurrentAnswers.length &&
            normalizedNewAnswers.every((val: number) => normalizedCurrentAnswers.includes(val)) &&
            normalizedCurrentAnswers.every((val: number) => normalizedNewAnswers.includes(val))
          );

          logger.log("  Answers changed?", answersChanged);

          if (answersChanged) {
            logger.log("✅ Explanation suggested different answers, submitting edit request.");
            const newQ = { ...question, answers: correctedAnswers };

            toast.info("Answer has been updated based on explanation");

            try {
              await fetch(api.reportEdit, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  question: question.question,
                  answer: question.answers,
                  originalQuestion: question,
                  editedQuestion: newQ,
                  event: routerData.eventName || "Unknown Event",
                  reason: "Explanation corrected answers",
                  bypass: true,
                }),
              });
            } catch (editError) {
              logger.error("Failed to submit auto-edit request:", editError);
            }
          } else {
            logger.log("✅ Explanation confirmed existing answers are correct - no edit needed.");
          }

          setData((prevData) => {
            const newData = [...prevData];
            const currentQuestion = newData[index];
            if (!currentQuestion) {
              return newData;
            }
            newData[index] = { ...currentQuestion, answers: correctedAnswers } as Question;

            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const correctAnswers = correctedAnswers;
              const updatedQuestion = newData[index];
              if (!updatedQuestion) {
                return newData;
              }
              const isMulti = isMultiSelectQuestion(updatedQuestion.question, correctAnswers);

              const userNumericAnswers = currentUserAnswers
                .map((ans) => {
                  const idx = updatedQuestion.options?.indexOf(ans ?? "");
                  return idx !== undefined && idx >= 0 ? idx : -1;
                })
                .filter((idx) => idx >= 0);

              let isNowCorrect = false;
              if (isMulti) {
                isNowCorrect =
                  correctAnswers.every((correctAns: number | string) => userNumericAnswers.includes(correctAns as number)) &&
                  userNumericAnswers.length === correctAnswers.length;
              } else {
                isNowCorrect = correctAnswers.includes(userNumericAnswers[0]);
              }

              logger.log(`🔍 MCQ Grading Debug for question ${index + 1}:`);
              logger.log(`  User's numeric answers:`, userNumericAnswers);
              logger.log("  Corrected answers:", correctAnswers);
              logger.log("  Is multi-select:", isMulti);
              logger.log("  Is now correct:", isNowCorrect);
              logger.log("  Current grading result:", gradingResults[index]);

              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                logger.log(
                  `✅ Updating grading result for question ${index + 1} to Correct based on explanation.`
                );
                setGradingResults((prev) => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                logger.log(
                  `❌ Updating grading result for question ${index + 1} to Incorrect based on explanation.`
                );
                setGradingResults((prev) => ({ ...prev, [index]: 0 }));
              } else {
                logger.log(`ℹ️ No grading change needed for question ${index + 1}`);
              }
            }

            return newData;
          });
        }
      } catch (parseError) {
        logger.error("Failed to parse correct indices:", parseError);
        explanationText = explanation;
      }
    }

    if (!isMcq && correctedAnswers && correctedAnswers.length > 0) {
      logger.log("🔍 Found corrected answers for FRQ in explanation");
      try {
        const currentAnswers = question.answers || [];

        const answersChanged = !(
          correctedAnswers.length === currentAnswers.length &&
          correctedAnswers.every(
            (ans: any, idx: number) =>
              String(ans).toLowerCase().trim() === String(currentAnswers[idx]).toLowerCase().trim()
          )
        );

        logger.log("🔍 FRQ Answer Comparison Debug:");
        logger.log("  Original question.answers:", currentAnswers);
        logger.log("  Explanation suggested answers:", correctedAnswers);
        logger.log("  Answers changed?", answersChanged);

        if (answersChanged) {
          logger.log(
            "✅ Explanation suggested different answers for FRQ, submitting edit request."
          );
          const newQ = { ...question, answers: correctedAnswers };

          toast.info("Answer has been updated based on explanation");

          try {
            await fetch(api.reportEdit, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: question.question,
                answer: question.answers,
                originalQuestion: question,
                editedQuestion: newQ,
                event: routerData.eventName || "Unknown Event",
                reason: "Explanation corrected answers",
                bypass: true,
              }),
            });
          } catch (editError) {
            logger.error("Failed to submit auto-edit request:", editError);
          }

          setData((prevData) => {
            const newData = [...prevData];
            const currentQuestion = newData[index];
            if (!currentQuestion) {
              return newData;
            }
            newData[index] = { ...currentQuestion, answers: correctedAnswers } as Question;

            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const userAnswerText = currentUserAnswers[0] || "";

              let isNowCorrect = false;
              if (userAnswerText.trim()) {
                isNowCorrect = correctedAnswers.some(
                  (correctAnswer: number | string) =>
                    String(correctAnswer).toLowerCase().trim() ===
                    userAnswerText.toLowerCase().trim()
                );
              }

              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                logger.log(
                  `Updating grading result for question ${index + 1} to Correct based on explanation.`
                );
                setGradingResults((prev) => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                logger.log(
                  `Updating grading result for question ${index + 1} to Incorrect based on explanation.`
                );
                setGradingResults((prev) => ({ ...prev, [index]: 0 }));
              }
            }

            return newData;
          });
        } else {
          logger.log("✅ Explanation confirmed existing FRQ answers are correct - no edit needed.");
        }
      } catch (parseError) {
        logger.error("Failed to parse corrected answers for FRQ:", parseError);
      }
    }

    logger.log("🎯 Setting explanation text:", explanationText);
    setExplanations((prev) => ({ ...prev, [index]: explanationText }));
  } catch (error) {
    logger.error("Error in getExplanation:", error);
    const errorMsg = `Failed to load explanation: ${(error as Error).message}`;
    setExplanations((prev) => ({
      ...prev,
      [index]: errorMsg,
    }));
    toast.error(errorMsg);
  } finally {
    setLoadingExplanation((prev) => ({ ...prev, [index]: false }));
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
