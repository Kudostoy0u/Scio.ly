"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import { useCallback, useMemo } from "react";

// Top-level regex patterns
const UPPERCASE_LETTER_REGEX = /[A-Z]/;
const NON_UPPERCASE_REGEX = /[^A-Z]/;

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

  // Helper function to find next letter in original quote
  const findNextLetter = useCallback(
    (originalQuote: string, startIndex: number): { char: string; index: number } | null => {
      for (let i = startIndex; i < originalQuote.length; i++) {
        const char = originalQuote[i];
        if (char && UPPERCASE_LETTER_REGEX.test(char)) {
          return { char, index: i + 1 };
        }
      }
      return null;
    },
    []
  );

  // Helper function to build correct mapping
  const buildCorrectMapping = useCallback(
    (text: string, originalQuote: string): { [key: number]: string } => {
      const mapping: { [key: number]: string } = {};
      let plainTextIndex = 0;
      for (let i = 0; i < text.length; i++) {
        const textChar = text[i];
        if (textChar && UPPERCASE_LETTER_REGEX.test(textChar)) {
          const result = findNextLetter(originalQuote, plainTextIndex);
          if (result) {
            mapping[i] = result.char;
            plainTextIndex = result.index;
          }
        }
      }
      return mapping;
    },
    [findNextLetter]
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const correctMapping = useMemo(() => {
    if (!(isTestSubmitted && quote?.quote)) {
      return {};
    }
    const originalQuote = quote.quote.toUpperCase();
    return buildCorrectMapping(text, originalQuote);
  }, [isTestSubmitted, quote?.quote, text, buildCorrectMapping]);

  // Helper function to find cipher letter indices
  const findCipherLetterIndices = useCallback((text: string): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const textChar = text[i];
      if (textChar && UPPERCASE_LETTER_REGEX.test(textChar)) {
        indices.push(i);
      }
    }
    return indices;
  }, []);

  // Helper function to calculate padding positions
  const calculatePaddingPositions = useCallback(
    (cipherLetterIndices: number[], cleanPlainLength: number): Set<number> => {
      const positions = new Set<number>();
      const paddingCount = Math.max(0, cipherLetterIndices.length - cleanPlainLength);
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
    },
    []
  );

  // where n = (#cipher inputs) - (#alphabetic characters in the original quote)
  const paddingPositions = useMemo(() => {
    if (!isTestSubmitted) {
      return new Set<number>();
    }
    const cipherLetterIndices = findCipherLetterIndices(text);
    const cleanPlainLength =
      quote?.quote?.toUpperCase().replace(NON_UPPERCASE_REGEX, "").length ?? 0;
    return calculatePaddingPositions(cipherLetterIndices, cleanPlainLength);
  }, [isTestSubmitted, text, quote, findCipherLetterIndices, calculatePaddingPositions]);

  // Helper function to process text into display chars and index mapping
  const processDisplayChars = useCallback(
    (
      text: string
    ): {
      displayChars: string[];
      displayToOriginalIndex: { [key: number]: number };
    } => {
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

          if (UPPERCASE_LETTER_REGEX.test(ch)) {
            lettersSeen++;
            if (lettersSeen % 5 === 0) {
              chars.push(" ");
              displayIndex++;
            }
          }
        }
      }

      return { displayChars: chars, displayToOriginalIndex: indexMapping };
    },
    []
  );

  const { displayChars, displayToOriginalIndex } = useMemo(
    () => processDisplayChars(text),
    [text, processDisplayChars]
  );

  // Helper function to calculate character display data
  const getCharacterData = (
    char: string,
    displayIndex: number,
    displayToOriginalIndex: { [key: number]: number },
    solution: { [key: string]: string } | undefined,
    isTestSubmitted: boolean,
    correctMapping: { [key: number]: string },
    paddingPositions: Set<number>
  ) => {
    const isLetter = UPPERCASE_LETTER_REGEX.test(char);
    const originalIndex = displayToOriginalIndex[displayIndex];
    const value =
      isLetter && originalIndex !== undefined ? solution?.[String(originalIndex)] || "" : "";
    const correctLetter =
      isTestSubmitted && isLetter && originalIndex !== undefined
        ? (correctMapping[originalIndex] ?? "")
        : "";
    const isCorrect = value.toUpperCase() === correctLetter;
    const isPadding =
      isLetter &&
      isTestSubmitted &&
      originalIndex !== undefined &&
      paddingPositions.has(originalIndex);

    return {
      isLetter,
      originalIndex,
      value,
      correctLetter,
      isCorrect,
      isPadding,
    };
  };

  // Helper function to get input className
  const getInputClassName = (
    isPadding: boolean,
    isTestSubmitted: boolean,
    isCorrect: boolean
  ): string => {
    const baseClasses = "w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
    const paddingClasses = isPadding
      ? darkMode
        ? "bg-gray-700 border-gray-500 text-gray-400"
        : "bg-gray-200 border-gray-300 text-gray-500"
      : darkMode
        ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
    const stateClasses = isTestSubmitted
      ? isCorrect
        ? "border-green-500 bg-green-100/10"
        : "border-red-500 bg-red-100/10"
      : "";
    return `${baseClasses} ${paddingClasses} ${stateClasses}`;
  };

  // Character display component (extracted to reduce complexity)
  const CharacterDisplay = ({
    char,
    displayIndex,
    originalIndex,
    value,
    correctLetter,
    isCorrect,
    isPadding,
    quoteIndex,
    darkMode,
    isTestSubmitted,
    onSolutionChange,
  }: {
    char: string;
    displayIndex: number;
    originalIndex: number | undefined;
    value: string;
    correctLetter: string;
    isCorrect: boolean;
    isPadding: boolean;
    quoteIndex: number;
    darkMode: boolean;
    isTestSubmitted: boolean;
    onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  }) => {
    const isLetter = UPPERCASE_LETTER_REGEX.test(char);

    if (!isLetter || originalIndex === undefined) {
      return (
        <div key={displayIndex} className="flex flex-col items-center mx-0.5">
          <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
            {char}
          </span>
        </div>
      );
    }

    return (
      <div key={displayIndex} className="flex flex-col items-center mx-0.5">
        <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
          {char}
        </span>
        <div className="relative h-12 sm:h-14">
          <input
            type="text"
            id={`complete-columnar-${quoteIndex}-${originalIndex}`}
            name={`complete-columnar-${quoteIndex}-${originalIndex}`}
            maxLength={1}
            disabled={isTestSubmitted}
            value={value}
            onChange={(e) =>
              onSolutionChange(quoteIndex, String(originalIndex), e.target.value.toUpperCase())
            }
            autoComplete="off"
            className={getInputClassName(isPadding, isTestSubmitted, isCorrect)}
          />
          {isTestSubmitted && !isCorrect && (
            <div
              className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                darkMode ? "text-red-400" : "text-red-600"
              }`}
            >
              {correctLetter}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="font-mono">
      <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        Complete Columnar Cipher
      </div>

      {/* Per-character layout identical to Substitution/Hill */}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {displayChars.map((char, displayIndex) => {
          const charData = getCharacterData(
            char,
            displayIndex,
            displayToOriginalIndex,
            solution,
            isTestSubmitted,
            correctMapping,
            paddingPositions
          );

          return (
            <CharacterDisplay
              // biome-ignore lint/suspicious/noArrayIndexKey: Display characters are stable and index is needed for mapping
              key={displayIndex}
              char={char}
              displayIndex={displayIndex}
              originalIndex={charData.originalIndex}
              value={charData.value}
              correctLetter={charData.correctLetter}
              isCorrect={charData.isCorrect}
              isPadding={charData.isPadding}
              quoteIndex={quoteIndex}
              darkMode={darkMode}
              isTestSubmitted={isTestSubmitted}
              onSolutionChange={onSolutionChange}
            />
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
              <p
                className={`font-medium font-mono ${darkMode ? "text-gray-300" : "text-gray-900"}`}
              >
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
