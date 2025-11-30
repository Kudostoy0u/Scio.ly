import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import React, { useCallback } from "react";

// Regex for splitting equation parts (moved to top level for performance)
const EQUATION_SPLIT_REGEX = /\s*[+\-=]\s*/;

interface CryptarithmDisplayProps {
  text: string;
  quoteIndex: number;
  solution: { [key: number]: string } | undefined;
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, position: number, letter: string) => void;
  cryptarithmData?: {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{
      digits: string;
      word: string;
    }>;
    operation?: "+" | "-";
  };
}

export const CryptarithmDisplay: React.FC<CryptarithmDisplayProps> = ({
  text: _text,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes: _quotes,
  onSolutionChange,
  cryptarithmData,
}) => {
  const { darkMode } = useTheme();
  const [focusedDigit, setFocusedDigit] = React.useState<string | null>(null);
  const [, setFocusedPos] = React.useState<number | null>(null);

  // Helper function to get input className
  const getDigitInputClassName = (
    isTestSubmitted: boolean,
    isHinted: boolean,
    isCorrect: boolean,
    isSameDigitFocused: boolean,
    _isBoundary: boolean
  ): string => {
    const baseClasses =
      "w-10 h-10 text-center border rounded text-sm font-mono focus:outline-none focus:ring-0";
    if (isTestSubmitted) {
      if (isHinted) {
        return `${baseClasses} border-yellow-500 text-yellow-800 bg-transparent`;
      }
      return isCorrect
        ? `${baseClasses} border-green-500 text-green-800 bg-transparent`
        : `${baseClasses} border-red-500 text-red-800 bg-transparent`;
    }
    if (isSameDigitFocused) {
      return `${baseClasses} border-blue-500 ${darkMode ? "bg-blue-900/30" : "bg-blue-50"}`;
    }
    return `${baseClasses} ${darkMode ? "bg-gray-800 border-gray-600 text-gray-300" : "bg-white border-gray-300 text-gray-900"}`;
  };

  // Helper function to handle digit input change
  const handleDigitInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    position: number,
    _digit: string,
    digitToPositions: { [digit: string]: number[] },
    inlineDigits: { digits: string[]; boundaries: Set<number> },
    quoteIndex: number,
    onSolutionChange: (quoteIndex: number, position: number, letter: string) => void
  ) => {
    const val = e.target.value.toUpperCase();
    const currentDigit = inlineDigits.digits[position];
    if (currentDigit !== undefined) {
      const positions = digitToPositions[currentDigit] || [position];
      for (const p of positions) {
        onSolutionChange(quoteIndex, p, val);
      }
    }
  };

  // Digit input component (extracted to reduce complexity)
  const DigitInput = ({
    digit,
    position,
    value,
    isCorrect,
    isHinted,
    isSameDigitFocused,
    isBoundary,
    quoteIndex,
    digitToPositions,
    inlineDigits,
    onSolutionChange,
    onFocus,
    onBlur,
    isTestSubmitted,
    darkMode,
  }: {
    digit: string;
    position: number;
    value: string;
    isCorrect: boolean;
    isHinted: boolean;
    isSameDigitFocused: boolean;
    isBoundary: boolean;
    quoteIndex: number;
    digitToPositions: { [digit: string]: number[] };
    inlineDigits: { digits: string[]; boundaries: Set<number> };
    onSolutionChange: (quoteIndex: number, position: number, letter: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    isTestSubmitted: boolean;
    darkMode: boolean;
  }) => (
    <React.Fragment key={`${digit}-${position}`}>
      <div className="flex flex-col items-center justify-start">
        <div className={`text-xs mb-1 font-mono ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          {digit}
        </div>
        <input
          type="text"
          maxLength={1}
          value={value}
          onChange={(e) =>
            handleDigitInputChange(
              e,
              position,
              digit,
              digitToPositions,
              inlineDigits,
              quoteIndex,
              onSolutionChange
            )
          }
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={isTestSubmitted}
          className={getDigitInputClassName(
            isTestSubmitted,
            isHinted,
            isCorrect,
            isSameDigitFocused,
            isBoundary
          )}
        />
      </div>
      {isBoundary && <div className="w-4" />}
    </React.Fragment>
  );

  const inlineDigits = React.useMemo(() => {
    if (!cryptarithmData?.digitGroups) {
      return { digits: [] as string[], boundaries: new Set<number>() };
    }
    const digits: string[] = [];
    const boundaries = new Set<number>();
    let idx = 0;
    cryptarithmData.digitGroups.forEach((group, gi) => {
      const parts = group.digits.split(" ").filter(Boolean);
      for (const d of parts) {
        digits.push(d);
        idx++;
      }
      if (gi < cryptarithmData.digitGroups.length - 1 && idx > 0) {
        boundaries.add(idx - 1); // add extra gap after this word
      }
    });
    return { digits, boundaries };
  }, [cryptarithmData]);

  const digitToPositions = React.useMemo(() => {
    const map: { [digit: string]: number[] } = {};
    inlineDigits.digits.forEach((d, i) => {
      if (!map[d]) {
        map[d] = [];
      }
      map[d].push(i);
    });
    return map;
  }, [inlineDigits]);

  // Helper function to build correct mapping
  const buildCorrectMapping = useCallback(
    (
      data: CryptarithmDisplayProps["cryptarithmData"],
      isTestSubmitted: boolean
    ): { [key: number]: string } => {
      const mapping: { [key: number]: string } = {};
      if (!(isTestSubmitted && data?.digitGroups)) {
        return mapping;
      }
      const allLetters = data.digitGroups
        .map((group: { digits: string; word: string }) => group.word.replace(/\s/g, ""))
        .join("");
      for (let i = 0; i < allLetters.length; i++) {
        const letter = allLetters[i];
        if (letter !== undefined) {
          mapping[i] = letter;
        }
      }
      return mapping;
    },
    []
  );

  const correctMapping = React.useMemo(
    () => buildCorrectMapping(cryptarithmData, isTestSubmitted),
    [cryptarithmData, isTestSubmitted, buildCorrectMapping]
  );

  // Helper function to build vertical display lines
  const buildVerticalLines = useCallback(
    (w1: string, w2: string, w3: string, maxLen: number, opSymbol: string) => {
      // Ensure proper padding without clipping the first letter
      const line1 = w1.padStart(maxLen + 1, " ");
      const line2 = opSymbol + w2.padStart(maxLen, " ");
      const separator = "-".repeat(maxLen + 1);
      const line3 = w3.padStart(maxLen + 1, " ");
      return { line1, line2, line3, separator };
    },
    []
  );

  // Parse equation for vertical display
  const verticalDisplay = React.useMemo(() => {
    if (!(cryptarithmData?.equation && cryptarithmData.digitGroups)) {
      return null;
    }

    const operation =
      cryptarithmData.operation || (cryptarithmData.equation.includes("-") ? "-" : "+");
    const parts = cryptarithmData.equation.split(EQUATION_SPLIT_REGEX).filter(Boolean);
    if (parts.length !== 3) {
      return null;
    }

    const [w1, w2, w3] = parts;
    if (!(w1 && w2 && w3)) {
      return null;
    }
    const maxLen = Math.max(w1.length || 0, w2.length || 0, (w3.length || 0) - 1);
    const opSymbol = operation === "-" ? "-" : "+";

    const { line1, line2, line3, separator } = buildVerticalLines(w1, w2, w3, maxLen, opSymbol);

    return { line1, line2, line3, separator, operation };
  }, [cryptarithmData, buildVerticalLines]);

  return (
    <div className="space-y-4">
      {/* Cryptarithm Equation - Vertical Format */}
      {cryptarithmData && verticalDisplay && (
        <div className={`${darkMode ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Cryptarithm Problem
          </h4>
          <div className="flex justify-center">
            {/* Letter Equation */}
            <div>
              <div
                className={`font-mono text-center space-y-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
              >
                <div className="text-lg">{verticalDisplay.line1}</div>
                <div className="text-lg">{verticalDisplay.line2}</div>
                <div className="text-lg">{verticalDisplay.separator}</div>
                <div className="text-lg font-semibold">{verticalDisplay.line3}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback to horizontal if vertical parsing fails */}
      {cryptarithmData && !verticalDisplay && (
        <div className={`${darkMode ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Cryptarithm Formula
          </h4>
          <div
            className={`font-mono text-center mb-2 whitespace-pre ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            {cryptarithmData.equation}
          </div>
        </div>
      )}

      {/* Digit values inline (with larger gaps at word boundaries) - Vertically aligned */}
      {inlineDigits.digits.length > 0 && (
        <div
          className={`p-4 rounded-lg border ${darkMode ? "border-gray-600" : "border-gray-300"} mt-4 mb-6`}
        >
          <h4 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Values to decode for solution
          </h4>
          <div className="flex flex-wrap gap-2 justify-center">
            {inlineDigits.digits.map((digit, i) => {
              const position = i;
              const isCorrect = correctMapping[position] === (solution?.[position] || "");
              const isHinted = _quotes[quoteIndex]?.cryptarithmHinted?.[position] === true;
              const isSameDigitFocused = focusedDigit !== null && focusedDigit === digit;
              const isBoundary = inlineDigits.boundaries.has(i);

              return (
                <DigitInput
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static digit inputs, index is stable
                  key={`${digit}-${i}`}
                  digit={digit}
                  position={position}
                  value={solution?.[position] || ""}
                  isCorrect={isCorrect}
                  isHinted={isHinted}
                  isSameDigitFocused={isSameDigitFocused}
                  isBoundary={isBoundary}
                  quoteIndex={quoteIndex}
                  digitToPositions={digitToPositions}
                  inlineDigits={inlineDigits}
                  onSolutionChange={onSolutionChange}
                  onFocus={() => {
                    setFocusedDigit(digit);
                    setFocusedPos(position);
                  }}
                  onBlur={() => {
                    setFocusedDigit(null);
                    setFocusedPos(null);
                  }}
                  isTestSubmitted={isTestSubmitted}
                  darkMode={darkMode}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
