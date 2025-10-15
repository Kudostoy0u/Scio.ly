import { Question } from '@/app/utils/geminiService';
import { normalizeQuestionText, normalizeTestText } from '../../utils/normalizeTestText';
import { normalizeQuestionMedia } from '../../utils/questionMedia';

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
    console.error('❌ normalizeQuestionsFull received non-array:', questions);
    return [];
  }

  const mediaNormalized = normalizeQuestionMedia(questions);

  return mediaNormalized.map((q, index) => {
    const out: any = { ...q };

    // Validate that answers field exists and is valid
    if (!out.answers || !Array.isArray(out.answers) || out.answers.length === 0) {
      console.error(`❌ Question ${index + 1} missing valid answers field:`, {
        question: out.question || out.question_text,
        answers: out.answers,
        hasAnswers: !!out.answers,
        isArray: Array.isArray(out.answers),
        length: out.answers?.length
      });
      // Don't throw, but log prominently - this question won't be gradable
    }

    // Normalize question text
    if (out.question) {
      out.question = normalizeQuestionText(out.question);
    }

    // Normalize options (for MCQ)
    if (Array.isArray(out.options) && out.options.length > 0) {
      out.options = out.options.map((opt: any) =>
        typeof opt === 'string' ? normalizeTestText(opt) : opt
      );
    }

    // CRITICAL: Preserve answers field exactly as-is
    // Do NOT modify, convert, or normalize the answers field
    // It should already be in the correct format:
    // - Array of numbers for MCQ (e.g., [0], [1, 2])
    // - Array of strings for FRQ (e.g., ["answer text"])

    // Preserve difficulty field if present
    if (out.difficulty !== undefined) {
      out.difficulty = out.difficulty;
    }

    return out as Question;
  });
}


