import type { QuoteData } from "../types";

export const extractCryptarithmData = (
  quote: QuoteData
): { allLetters: string; allDigitsArr: string[] } => {
  const allLetters =
    quote.cryptarithmData?.digitGroups.map((g) => g.word.replace(/\s/g, "")).join("") || "";
  const allDigitsArr: string[] = [];
  for (const g of quote.cryptarithmData?.digitGroups || []) {
    const digits = g.digits.split(" ").filter(Boolean);
    for (const d of digits) {
      allDigitsArr.push(d);
    }
  }
  return { allLetters, allDigitsArr };
};

export const findUnfilledCryptarithmPositions = (
  allLetters: string,
  current: { [key: number]: string }
): number[] => {
  const unfilled: number[] = [];
  for (let i = 0; i < allLetters.length; i++) {
    if (!current[i]) {
      unfilled.push(i);
    }
  }
  return unfilled;
};

export const findPositionsToFill = (allDigitsArr: string[], targetDigit: string): number[] => {
  const positionsToFill: number[] = [];
  allDigitsArr.forEach((d, pos) => {
    if (d === targetDigit) {
      positionsToFill.push(pos);
    }
  });
  return positionsToFill;
};

export const updateCryptarithmQuote = (
  q: QuoteData,
  positionsToFill: number[],
  correct: string
): QuoteData => {
  const prevSol = q.cryptarithmSolution || {};
  const prevHinted = q.cryptarithmHinted || {};
  const updatedSol: { [key: number]: string } = { ...prevSol };
  const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
  for (const p of positionsToFill) {
    updatedSol[p] = correct;
    updatedHinted[p] = true;
  }
  return {
    ...q,
    cryptarithmSolution: updatedSol,
    cryptarithmHinted: updatedHinted,
  } as QuoteData;
};

export const handleCryptarithmHint = (
  questionIndex: number,
  quote: QuoteData,
  quotes: QuoteData[],
  setQuotes: (quotes: QuoteData[]) => void
): boolean => {
  if (quote.cipherType !== "Cryptarithm" || !quote.cryptarithmData) {
    return false;
  }
  const { allLetters, allDigitsArr } = extractCryptarithmData(quote);
  const current = quote.cryptarithmSolution || {};
  const unfilled = findUnfilledCryptarithmPositions(allLetters, current);
  if (unfilled.length === 0) {
    return true;
  }
  const target = unfilled[Math.floor(Math.random() * unfilled.length)];
  if (target === undefined) {
    return true;
  }
  const targetDigit = allDigitsArr[target];
  const correctLetter = allLetters[target];
  if (targetDigit === undefined || correctLetter === undefined) {
    return true;
  }
  const correct = correctLetter.toUpperCase();
  const positionsToFill = findPositionsToFill(allDigitsArr, targetDigit);
  const newQuotes = quotes.map((q, idx) => {
    if (idx !== questionIndex) {
      return q;
    }
    return updateCryptarithmQuote(q, positionsToFill, correct);
  });
  setQuotes(newQuotes);
  return true;
};
