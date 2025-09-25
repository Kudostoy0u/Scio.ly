import { Question } from '@/app/utils/geminiService';
import { GradingResults, Explanations, LoadingExplanation } from '@/app/utils/questionUtils';

export function removeQuestionAtIndex(
  data: Question[],
  indexToRemove: number,
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
  explanations: Explanations,
  loadingExplanation: LoadingExplanation,
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
    const idx = parseInt(key);
    if (idx < indexToRemove) newAnswers[idx] = userAnswers[idx];
    else if (idx > indexToRemove) newAnswers[idx - 1] = userAnswers[idx];
  });

  const newResults: GradingResults = {};
  Object.keys(gradingResults).forEach((key) => {
    const idx = parseInt(key);
    if (idx < indexToRemove) newResults[idx] = gradingResults[idx];
    else if (idx > indexToRemove) newResults[idx - 1] = gradingResults[idx];
  });

  const newExplanations: Explanations = {};
  Object.keys(explanations).forEach((key) => {
    const idx = parseInt(key);
    if (idx < indexToRemove) newExplanations[idx] = explanations[idx];
    else if (idx > indexToRemove) newExplanations[idx - 1] = explanations[idx];
  });

  const newLoading: LoadingExplanation = {};
  Object.keys(loadingExplanation).forEach((key) => {
    const idx = parseInt(key);
    if (idx < indexToRemove) newLoading[idx] = loadingExplanation[idx];
    else if (idx > indexToRemove) newLoading[idx - 1] = loadingExplanation[idx];
  });

  return { newData, newAnswers, newResults, newExplanations, newLoading };
}


