import type { QuoteData } from "../types";

export const revealHillLetter = (
  questionIndex: number,
  quote: QuoteData,
  quotes: QuoteData[],
  setQuotes: (quotes: QuoteData[]) => void
): boolean => {
  if ((quote.cipherType !== "Hill 2x2" && quote.cipherType !== "Hill 3x3") || !quote.matrix) {
    return false;
  }
  const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const size = quote.cipherType === "Hill 2x2" ? 2 : 3;
  const required = Math.ceil(plain.length / size) * size;
  const actualSlots = required - (required - plain.length);
  const current = (quote.hillSolution?.plaintext || {}) as { [key: number]: string };
  const candidates: number[] = [];
  for (let i = 0; i < actualSlots; i++) {
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
      const prev = q.hillSolution || { matrix: [], plaintext: {} };
      if (target !== undefined && plain[target] !== undefined) {
        return {
          ...q,
          hillSolution: {
            matrix: prev.matrix || [],
            plaintext: { ...(prev.plaintext || {}), [target]: plain[target] },
          },
        } as QuoteData;
      }
      return q;
    });
    setQuotes(newQuotes);
  }
  return true;
};
