import type { Question } from "@/app/utils/geminiService";
import type { Explanations, GradingResults, LoadingExplanation } from "@/app/utils/questionUtils";

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

  const newAnswers: Record<number, (string | null)[] | null> = {};
  Object.keys(userAnswers).forEach((key) => {
    const idx = Number.parseInt(key);
    if (idx < indexToRemove) {
      newAnswers[idx] = userAnswers[idx] ?? null;
    } else if (idx > indexToRemove) {
      newAnswers[idx - 1] = userAnswers[idx] ?? null;
    }
  });

  const newResults: GradingResults = {};
  Object.keys(gradingResults).forEach((key) => {
    const idx = Number.parseInt(key);
    const result = gradingResults[idx];
    if (result !== undefined) {
      if (idx < indexToRemove) {
        newResults[idx] = result;
      } else if (idx > indexToRemove) {
        newResults[idx - 1] = result;
      }
    }
  });

  const newExplanations: Explanations = {};
  Object.keys(explanations).forEach((key) => {
    const idx = Number.parseInt(key);
    const explanation = explanations[idx];
    if (explanation !== undefined) {
      if (idx < indexToRemove) {
        newExplanations[idx] = explanation;
      } else if (idx > indexToRemove) {
        newExplanations[idx - 1] = explanation;
      }
    }
  });

  const newLoading: LoadingExplanation = {};
  Object.keys(loadingExplanation).forEach((key) => {
    const idx = Number.parseInt(key);
    const loading = loadingExplanation[idx];
    if (loading !== undefined) {
      if (idx < indexToRemove) {
        newLoading[idx] = loading;
      } else if (idx > indexToRemove) {
        newLoading[idx - 1] = loading;
      }
    }
  });

  return { newData, newAnswers, newResults, newExplanations, newLoading };
}
