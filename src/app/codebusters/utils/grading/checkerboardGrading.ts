import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

const getCheckerboardHintedCount = (quote: QuoteData): number => {
  const hintedPositions = Object.entries(quote.checkerboardHinted || {})
    .filter(([, v]) => v === true)
    .map(([k]) => Number(k));
  return hintedPositions.length;
};

const processCheckerboardLetters = (
  quote: QuoteData,
  expectedPlaintext: string
): { filled: number; correct: number } => {
  let filled = 0;
  let correct = 0;
  for (let i = 0; i < expectedPlaintext.length; i++) {
    const isHinted = Boolean(quote.checkerboardHinted?.[i]);
    if (isHinted) {
      continue;
    }
    const userAnswer = quote.checkerboardSolution?.[i];
    if (userAnswer && userAnswer.trim().length > 0) {
      filled++;
      if (userAnswer.trim() === expectedPlaintext[i]) {
        correct++;
      }
    }
  }
  return { filled, correct };
};

export const gradeCheckerboard = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.checkerboardSolution && Object.keys(quote.checkerboardSolution).length > 0) {
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const hintedCount = getCheckerboardHintedCount(quote);
    totalInputs = Math.max(0, expectedPlaintext.length - hintedCount);
    const { filled, correct } = processCheckerboardLetters(quote, expectedPlaintext);
    filledInputs = filled;
    correctInputs = correct;
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};
