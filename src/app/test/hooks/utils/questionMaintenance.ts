import type { Question } from "@/app/utils/geminiService";
import type { Explanations, GradingResults, LoadingExplanation } from "@/app/utils/questionUtils";

// Helper function to shift indices after removing an item
function shiftIndicesAfterRemoval<T>(
  original: Record<number, T>,
  indexToRemove: number
): Record<number, T> {
  const result: Record<number, T> = {};

  for (const key of Object.keys(original)) {
    const idx = Number.parseInt(key);
    const value = original[idx];

    if (value !== undefined) {
      if (idx < indexToRemove) {
        result[idx] = value;
      } else if (idx > indexToRemove) {
        result[idx - 1] = value;
      }
    }
  }

  return result;
}

export function removeQuestionAtIndex(
  data: Question[],
  indexToRemove: number,
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
  explanations: Explanations,
  loadingExplanation: LoadingExplanation
): {
  newData: Question[];
  newAnswers: Record<number, (string | null)[] | null>;
  newResults: GradingResults;
  newExplanations: Explanations;
  newLoading: LoadingExplanation;
} {
  const newData = data.filter((_, idx) => idx !== indexToRemove);
  const newAnswers = shiftIndicesAfterRemoval(userAnswers, indexToRemove);
  const newResults = shiftIndicesAfterRemoval(gradingResults, indexToRemove);
  const newExplanations = shiftIndicesAfterRemoval(explanations, indexToRemove);
  const newLoading = shiftIndicesAfterRemoval(loadingExplanation, indexToRemove);

  return { newData, newAnswers, newResults, newExplanations, newLoading };
}
