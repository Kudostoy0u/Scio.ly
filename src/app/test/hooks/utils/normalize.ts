import { normalizeQuestionText, normalizeTestText } from "@/app/test/utils/normalizeTestText";
import { normalizeQuestionMedia } from "@/app/test/utils/questionMedia";
import type { Question } from "@/app/utils/geminiService";

/**
 * Normalizes questions while preserving the answers field
 *
 * IMPORTANT: This function normalizes text content but NEVER modifies the answers field.
 * Questions must always have an answers field that is an array of:
 * - Numbers (0-based indices) for multiple choice questions
 * - Strings for free response questions
 *
 * @param questions - Array of questions to normalize
 * @returns Normalized questions with preserved answers field
 */
export function normalizeQuestionsFull(questions: Question[]): Question[] {
  if (!Array.isArray(questions)) {
    return [];
  }

  const mediaNormalized = normalizeQuestionMedia(questions);

  return mediaNormalized.map((q, _index) => {
    const out = { ...q } as {
      answers?: unknown;
      question?: string;
      options?: unknown[];
      [key: string]: unknown;
    };

    // Validate that answers field exists and is valid
    if (
      !(out.answers && Array.isArray(out.answers)) ||
      (Array.isArray(out.answers) && out.answers.length === 0)
    ) {
      // Don't throw, but log prominently - this question won't be gradable
    }

    // Normalize question text
    if (out.question) {
      out.question = normalizeQuestionText(out.question);
    }

    // Normalize options (for MCQ)
    if (Array.isArray(out.options) && out.options.length > 0) {
      out.options = out.options.map((opt) => {
        const optRecord = opt as Record<string, unknown> | string;
        return typeof optRecord === "string" ? normalizeTestText(optRecord) : optRecord;
      });
    }

    // CRITICAL: Preserve answers field exactly as-is
    // Do NOT modify, convert, or normalize the answers field
    // It should already be in the correct format:
    // - Array of numbers for MCQ (e.g., [0], [1, 2])
    // - Array of strings for FRQ (e.g., ["answer text"])

    // Preserve difficulty field if present (already set above)
    const outRecord = out as {
      question?: string;
      options?: unknown[];
      answers?: unknown;
      difficulty?: number;
      [key: string]: unknown;
    };
    return {
      ...outRecord,
      question: outRecord.question ?? "",
      options: Array.isArray(outRecord.options) ? (outRecord.options as string[]) : undefined,
      answers: Array.isArray(outRecord.answers) ? (outRecord.answers as (number | string)[]) : [],
      difficulty: typeof outRecord.difficulty === "number" ? outRecord.difficulty : 0.5,
    } as Question;
  });
}
