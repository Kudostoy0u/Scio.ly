import { AssignmentQuestionSchema } from "@/lib/schemas/question";
import { parseDifficulty } from "@/lib/types/difficulty";
import { z } from "zod";
import type { QuestionCandidate } from "./questionUtils";
import { buildAbsoluteUrl } from "./urlUtils";

const LETTER_REGEX = /^[A-Z]$/i;

export function formatQuestion(
  question: QuestionCandidate,
  index: number,
  origin: string
): z.infer<typeof AssignmentQuestionSchema> {
  const optionList = Array.isArray(question.options) ? question.options : undefined;
  const answerList = Array.isArray(question.answers) ? question.answers : undefined;
  const isMcq = (optionList?.length ?? 0) > 0;

  /**
   * Extract correct answer indices from question data
   *
   * Supports multiple formats:
   * 1. answers array with numeric indices: [0], [1, 2]
   * 2. answers array with string indices: ["0"], ["1", "2"]
   * 3. correct_answer as letter: "A", "B"
   * 4. correct_answer as number: 0, 1
   *
   * @returns Array of numbers for MCQ, array of strings for FRQ
   */
  let answers: (number | string)[] = [];

  // Try extracting from answers field first (preferred)
  if (answerList && answerList.length > 0) {
    if (isMcq) {
      // For MCQ, convert to numeric indices
      answers = answerList.map((a: unknown) => {
        const num = typeof a === "number" ? a : Number.parseInt(String(a));
        if (Number.isNaN(num) || num < 0 || num >= (optionList?.length ?? 0)) {
          throw new Error(
            `Invalid answer index ${a} for question: ${question.question || question.question_text}`
          );
        }
        return num;
      });
    } else {
      // For FRQ, keep as strings
      answers = answerList.map((a: unknown) => String(a));
    }
  }
  // Fallback: try extracting from correct_answer field
  else if (
    question.correct_answer !== null &&
    question.correct_answer !== undefined &&
    question.correct_answer !== ""
  ) {
    const correctAnswer = question.correct_answer ?? question.correctAnswer;
    if (isMcq) {
      const answerStr = String(correctAnswer).trim();

      // Handle comma-separated answers (e.g., "A,B" or "0,1")
      const parts = answerStr
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      answers = parts.map((part) => {
        // Try parsing as letter (A, B, C, etc.)
        if (LETTER_REGEX.test(part)) {
          const index = part.toUpperCase().charCodeAt(0) - 65;
          if (index < 0 || index >= (optionList?.length ?? 0)) {
            throw new Error(
              `Invalid answer letter "${part}" for question with ${
                optionList?.length ?? 0
              } options: ${question.question || question.question_text}`
            );
          }
          return index;
        }
        // Try parsing as number
        const num = Number.parseInt(part);
        if (Number.isNaN(num) || num < 0 || num >= (optionList?.length ?? 0)) {
          throw new Error(
            `Invalid answer "${part}" for question: ${question.question || question.question_text}`
          );
        }
        return num;
      });
    } else {
      // For FRQ, use the answer directly
      answers = [String(correctAnswer)];
    }
  }

  // CRITICAL VALIDATION: Reject questions without valid answers
  if (!answers || answers.length === 0) {
    throw new Error(
      `Question "${
        question.question || question.question_text
      }" has no valid answers. Cannot generate assignment with invalid questions.`
    );
  }

  const formattedQuestion = {
    question_text: question.question || question.question_text || question.questionText,
    question_type: isMcq ? "multiple_choice" : "free_response",
    options: isMcq ? optionList : undefined,
    answers: answers,
    points: 1,
    order_index: index,
    difficulty: parseDifficulty(question.difficulty),
    imageData: (() => {
      let candidate = question.imageData;
      if (!candidate && Array.isArray(question.images) && question.images.length > 0) {
        const images = question.images as unknown[];
        const validImages = images.filter((img): img is string => typeof img === "string");
        if (validImages.length > 0) {
          candidate = validImages[Math.floor(Math.random() * validImages.length)];
        }
      }
      return buildAbsoluteUrl(candidate, origin);
    })(),
  };

  // Validate the formatted question with strict schema
  try {
    const validated = AssignmentQuestionSchema.parse(formattedQuestion);
    // Double-check the formatted question (belt and suspenders)
    if (!validated.answers || validated.answers.length === 0) {
      throw new Error(
        `INTERNAL ERROR: Formatted question has invalid answers: ${validated.question_text}`
      );
    }
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues?.map((err) => `${err.path.join(".")}: ${err.message}`) || [
        "Unknown validation error",
      ];
      throw new Error(`Question ${index + 1} validation failed:\n${errorMessages.join("\n")}`);
    }
    throw new Error(
      `Question ${index + 1} validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
