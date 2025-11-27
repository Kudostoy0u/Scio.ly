import type { QuoteData } from "../types";

const WHITESPACE_SPLIT_REGEX = /\s+/;

export const buildCheckerboardTokens = (encrypted: string): string[] => {
  const letters = encrypted.replace(/\s+/g, "");
  const tokens: string[] = [];
  for (let i = 0; i < letters.length; i += 2) {
    const a = letters[i];
    const b = letters[i + 1] || "";
    if (a) {
      tokens.push(b ? a + b : a);
    }
  }
  return tokens;
};

export const findCheckerboardCandidates = (
  tokens: string[],
  plain: string,
  current: { [key: number]: string }
): number[] => {
  const candidates: number[] = [];
  for (let i = 0; i < Math.min(tokens.length, plain.length); i++) {
    const currentValue = current[i];
    if (!currentValue || currentValue.length === 0) {
      candidates.push(i);
    }
  }
  return candidates;
};

export const updateCheckerboardQuote = (
  q: QuoteData,
  tokens: string[],
  targetToken: string,
  plain: string
): QuoteData => {
  const prev = q.checkerboardSolution || {};
  const prevHinted = q.checkerboardHinted || {};
  const updated: { [key: number]: string } = { ...prev };
  const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
  tokens.forEach((tok, i) => {
    if (tok === targetToken && i < plain.length) {
      const plainChar = plain[i];
      if (plainChar !== undefined) {
        updated[i] = plainChar;
        updatedHinted[i] = true;
      }
    }
  });
  return {
    ...q,
    checkerboardSolution: updated,
    checkerboardHinted: updatedHinted,
  } as QuoteData;
};

export const revealCheckerboardLetter = (
  questionIndex: number,
  quote: QuoteData,
  quotes: QuoteData[],
  setQuotes: (quotes: QuoteData[]) => void
): boolean => {
  if (quote.cipherType !== "Checkerboard") {
    return false;
  }
  const tokens = buildCheckerboardTokens(quote.encrypted);
  const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const current = quote.checkerboardSolution || {};
  const candidates = findCheckerboardCandidates(tokens, plain, current);
  if (candidates.length === 0) {
    return true;
  }
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  if (target === undefined) {
    return true;
  }
  const targetToken = tokens[target];
  if (targetToken === undefined) {
    return true;
  }
  const newQuotes = quotes.map((q, idx) => {
    if (idx !== questionIndex) {
      return q;
    }
    return updateCheckerboardQuote(q, tokens, targetToken, plain);
  });
  setQuotes(newQuotes);
  return true;
};

export const revealNihilistLetter = (
  questionIndex: number,
  quote: QuoteData,
  quotes: QuoteData[],
  setQuotes: (quotes: QuoteData[]) => void
): boolean => {
  if (quote.cipherType !== "Nihilist") {
    return false;
  }
  const groups = quote.encrypted
    .trim()
    .split(WHITESPACE_SPLIT_REGEX)
    .filter((g) => g.length > 0);
  const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const current = quote.nihilistSolution || {};
  const candidates: number[] = [];
  for (let i = 0; i < Math.min(groups.length, plain.length); i++) {
    const currentVal = current[i];
    if (!currentVal || currentVal.length === 0) {
      candidates.push(i);
    }
  }
  if (candidates.length > 0) {
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const newQuotes = quotes.map((q, idx) => {
      if (idx !== questionIndex) {
        return q;
      }
      const prev = q.nihilistSolution || {};
      const prevHinted = q.nihilistHinted || {};
      if (target !== undefined && plain[target] !== undefined) {
        return {
          ...q,
          nihilistSolution: { ...prev, [target]: plain[target] },
          nihilistHinted: { ...prevHinted, [target]: true },
        } as QuoteData;
      }
      return q;
    });
    setQuotes(newQuotes);
  }
  return true;
};
