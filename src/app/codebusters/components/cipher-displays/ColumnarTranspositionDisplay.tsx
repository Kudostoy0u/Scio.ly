"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMemo } from "react";
import type { QuoteData } from "@/app/codebusters/types";

interface ColumnarTranspositionDisplayProps {
  text: string;
  quoteIndex: number;
  solution?: { [key: string]: string };
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}

export const ColumnarTranspositionDisplay = ({
  text,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes,
  onSolutionChange,
}: ColumnarTranspositionDisplayProps) => {
  const { darkMode } = useTheme();
  const quote = quotes[quoteIndex];

  const correctMapping = useMemo(() => {
    const mapping: { [key: number]: string } = {};
    if (!isTestSubmitted || !quote?.quote) {
      return mapping;
    }
    const originalQuote = quote.quote.toUpperCase();
    let plainTextIndex = 0;
    for (let i = 0; i < text.length; i++) {
      const textChar = text[i];
      if (textChar && /[A-Z]/.test(textChar)) {
        while (plainTextIndex < originalQuote.length) {
          const origChar = originalQuote[plainTextIndex];
          if (origChar && /[A-Z]/.test(origChar)) {
            mapping[i] = origChar;
            plainTextIndex++;
            break;
          }
          plainTextIndex++;
        }
      }
    }
    return mapping;
  }, [isTestSubmitted, quote?.quote, text]);

  // where n = (#cipher inputs) - (#alphabetic characters in the original quote)
  const paddingPositions = useMemo(() => {
    const positions = new Set<number>();
    if (!isTestSubmitted) {
      return positions;
    }

    const cipherLetterIndices: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const textChar = text[i];
      if (textChar && /[A-Z]/.test(textChar)) {
        cipherLetterIndices.push(i);
      }
    }
    const cipherInputs = cipherLetterIndices.length;

    const cleanPlainLength = quote?.quote?.toUpperCase().replace(/[^A-Z]/g, "").length ?? 0;

    const paddingCount = Math.max(0, cipherInputs - cleanPlainLength);
    if (paddingCount === 0) {
      return positions;
    }

    const start = Math.max(0, cipherLetterIndices.length - paddingCount);
    for (let idx = start; idx < cipherLetterIndices.length; idx++) {
      const cipherIdx = cipherLetterIndices[idx];
      if (cipherIdx !== undefined) {
        positions.add(cipherIdx);
      }
    }

    return positions;
  }, [isTestSubmitted, quote?.quote, text]);

  const { displayChars, displayToOriginalIndex } = useMemo(() => {
    const chars: string[] = [];
    const indexMapping: { [key: number]: number } = {};
    let lettersSeen = 0;
    let displayIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch !== undefined) {
        chars.push(ch);
        indexMapping[displayIndex] = i;
        displayIndex++;

        if (/[A-Z]/.test(ch)) {
          lettersSeen++;
          if (lettersSeen % 5 === 0) {
            chars.push(" ");
            displayIndex++;
          }
        }
      }
    }

    return { displayChars: chars, displayToOriginalIndex: indexMapping };
  }, [text]);

  return (
    <div className="font-mono">
      <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        Complete Columnar Cipher
      </div>

      {/* Per-character layout identical to Substitution/Hill */}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {displayChars.map((char, displayIndex) => {
          const isLetter = /[A-Z]/.test(char);
          const originalIndex = displayToOriginalIndex[displayIndex];
          const value =
            isLetter && originalIndex !== undefined ? solution?.[String(originalIndex)] || "" : "";
          const correctLetter =
            isTestSubmitted && isLetter && originalIndex !== undefined
              ? correctMapping[originalIndex]
              : "";
          const isCorrect = value.toUpperCase() === correctLetter;

          const isPadding =
            isLetter &&
            isTestSubmitted &&
            originalIndex !== undefined &&
            paddingPositions.has(originalIndex);

          return (
            <div key={displayIndex} className="flex flex-col items-center mx-0.5">
              <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                {char}
              </span>
              {isLetter ? (
                <div className="relative h-12 sm:h-14">
                  <input
                    type="text"
                    id={`complete-columnar-${quoteIndex}-${originalIndex}`}
                    name={`complete-columnar-${quoteIndex}-${originalIndex}`}
                    maxLength={1}
                    disabled={isTestSubmitted}
                    value={value}
                    onChange={(e) =>
                      onSolutionChange(
                        quoteIndex,
                        String(originalIndex),
                        e.target.value.toUpperCase()
                      )
                    }
                    autoComplete="off"
                    className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
                      isPadding
                        ? darkMode
                          ? "bg-gray-700 border-gray-500 text-gray-400"
                          : "bg-gray-200 border-gray-300 text-gray-500"
                        : darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    } ${
                      isTestSubmitted && !isPadding
                        ? isCorrect
                          ? "border-green-500 bg-green-100/10"
                          : "border-red-500 bg-red-100/10"
                        : ""
                    }`}
                  />
                  {isTestSubmitted && isPadding && (
                    <div
                      className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      X
                    </div>
                  )}
                  {isTestSubmitted && !isPadding && !isCorrect && correctLetter && (
                    <div
                      className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                        darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      {correctLetter}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Show encoding key and original quote after submission */}
      {isTestSubmitted && (
        <>
          {/* Encoding Key */}
          {quote?.columnarKey && (
            <div className={`mt-8 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
              <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Encoding Key:
              </p>
              <p className={`font-medium font-mono ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                {quote.columnarKey}
              </p>
            </div>
          )}

          {/* Original Quote */}
          {quote?.quote && (
            <div className={`mt-4 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
              <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Original Quote:
              </p>
              <p className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                {quote.quote.replace(/\[.*?\]/g, "")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
