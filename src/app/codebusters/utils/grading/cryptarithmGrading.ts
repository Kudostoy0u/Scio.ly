import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

export const gradeCryptarithm = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.cryptarithmSolution && Object.keys(quote.cryptarithmSolution).length > 0) {
    const expectedWords =
      quote.cryptarithmData?.digitGroups.map((group) => group.word.replace(/\s/g, "")) || [];
    const allExpectedLetters = expectedWords.join("");
    const hintedPositions = Object.entries(quote.cryptarithmHinted || {})
      .filter(([, v]) => v === true)
      .map(([k]) => Number(k));
    const hintedCount = hintedPositions.length;
    totalInputs = Math.max(0, allExpectedLetters.length - hintedCount);

    for (let i = 0; i < totalInputs; i++) {
      const userAnswer = quote.cryptarithmSolution[i];
      const isHinted = Boolean(quote.cryptarithmHinted?.[i]);
      if (!isHinted && userAnswer && userAnswer.trim().length > 0) {
        filledInputs++;
        if (userAnswer.trim() === allExpectedLetters[i]) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};
