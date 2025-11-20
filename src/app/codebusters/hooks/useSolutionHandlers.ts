import { type Dispatch, type SetStateAction, useCallback } from "react";
import type { QuoteData } from "@/app/codebusters/types";

export const useSolutionHandlers = (
  _quotes: QuoteData[],
  setQuotes: Dispatch<SetStateAction<QuoteData[]>>
) => {
  const handleSolutionChange = useCallback(
    (quoteIndex: number, cipherLetter: string, plainLetter: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) =>
          index === quoteIndex
            ? { ...quote, solution: { ...(quote.solution || {}), [cipherLetter]: plainLetter } }
            : quote
        )
      );
    },
    [setQuotes]
  );

  const handleBaconianSolutionChange = useCallback(
    (quoteIndex: number, position: number, plainLetter: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) =>
          index === quoteIndex
            ? {
                ...quote,
                solution: { ...(quote.solution || {}), [position]: plainLetter.toUpperCase() },
              }
            : quote
        )
      );
    },
    [setQuotes]
  );

  const handleFrequencyNoteChange = useCallback(
    (quoteIndex: number, letter: string, note: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) =>
          index === quoteIndex
            ? { ...quote, frequencyNotes: { ...(quote.frequencyNotes || {}), [letter]: note } }
            : quote
        )
      );
    },
    [setQuotes]
  );

  const handleHillSolutionChange = useCallback(
    (
      quoteIndex: number,
      type: "matrix" | "plaintext",
      value: string[][] | { [key: number]: string }
    ) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) =>
          index === quoteIndex
            ? {
                ...quote,
                hillSolution: {
                  ...(quote.hillSolution || { matrix: [], plaintext: {} }),
                  [type]: value,
                } as {
                  matrix: string[][];
                  plaintext: { [key: number]: string };
                },
              }
            : quote
        )
      );
    },
    [setQuotes]
  );

  const handleNihilistSolutionChange = useCallback(
    (quoteIndex: number, position: number, plainLetter: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) => {
          if (index === quoteIndex) {
            return {
              ...quote,
              nihilistSolution: {
                ...(quote.nihilistSolution || {}),
                [position]: plainLetter,
              },
            };
          }
          return quote;
        })
      );
    },
    [setQuotes]
  );

  const handleCheckerboardSolutionChange = useCallback(
    (quoteIndex: number, position: number, plainLetter: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) => {
          if (index !== quoteIndex) {
            return quote;
          }

          // Build tokens honoring block separators (triple spaces)
          const blocks = (quote.encrypted || "").trim().split(/\s{3,}/);
          const tokens: string[] = [];
          blocks.forEach((block) => {
            const compact = block.replace(/\s+/g, "");
            for (let i = 0; i < compact.length; i += 2) {
              const a = compact[i];
              if (a) {
                const b = compact[i + 1] || "";
                tokens.push(b ? a + b : a);
              }
            }
          });

          const targetToken = tokens[position];
          const upper = plainLetter.toUpperCase();

          const updated: { [key: number]: string } = { ...(quote.checkerboardSolution || {}) };
          tokens.forEach((tok, idx) => {
            if (tok === targetToken) {
              updated[idx] = upper;
            }
          });

          return {
            ...quote,
            checkerboardSolution: updated,
          };
        })
      );
    },
    [setQuotes]
  );

  const handleKeywordSolutionChange = useCallback(
    (quoteIndex: number, keyword: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) =>
          index === quoteIndex ? { ...quote, keywordSolution: keyword } : quote
        )
      );
    },
    [setQuotes]
  );

  const handleCryptarithmSolutionChange = useCallback(
    (quoteIndex: number, position: number, plainLetter: string) => {
      setQuotes((prevQuotes) =>
        prevQuotes.map((quote, index) => {
          if (index === quoteIndex) {
            return {
              ...quote,
              cryptarithmSolution: {
                ...(quote.cryptarithmSolution || {}),
                [position]: plainLetter.toUpperCase(),
              },
            };
          }
          return quote;
        })
      );
    },
    [setQuotes]
  );

  return {
    handleSolutionChange,
    handleBaconianSolutionChange,
    handleFrequencyNoteChange,
    handleHillSolutionChange,
    handleNihilistSolutionChange,
    handleCheckerboardSolutionChange,
    handleKeywordSolutionChange,
    handleCryptarithmSolutionChange,
  };
};
