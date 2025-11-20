"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useMemo } from "react";
import { numberToLetter } from "@/app/codebusters/cipher-utils";
import type { QuoteData } from "@/app/codebusters/types";

interface HillDisplayProps {
  text: string;
  matrix: number[][];
  quoteIndex: number;
  solution?: { matrix: string[][]; plaintext: { [key: number]: string } };
  onSolutionChange: (
    type: "matrix" | "plaintext",
    value: string[][] | { [key: number]: string }
  ) => void;
  isTestSubmitted: boolean;
  quotes: QuoteData[];
}

export const HillDisplay = ({
  text,
  matrix,
  quoteIndex,
  solution,
  onSolutionChange,
  isTestSubmitted,
  quotes,
}: HillDisplayProps) => {
  const { darkMode } = useTheme();
  const quote = quotes[quoteIndex];
  if (!quote) {
    return <div>Quote not found</div>;
  }
  const is3x3 = quote.cipherType === "Hill 3x3";
  const matrixSize = is3x3 ? 3 : 2;

  useEffect(() => {
    if (is3x3 && quote.decryptionMatrix) {
      const hasEmptyMatrix =
        !solution?.matrix || solution.matrix.every((row) => row.every((cell) => cell === ""));

      if (hasEmptyMatrix) {
        const decryptionMatrix = quote.decryptionMatrix.map((row) =>
          row.map((num) => num.toString())
        );
        onSolutionChange("matrix", decryptionMatrix);
      }
    }
  }, [is3x3, quote.decryptionMatrix, solution?.matrix, onSolutionChange]);

  const correctMapping = useMemo(() => {
    const mapping: { [key: number]: string } = {};
    if (!isTestSubmitted) {
      return mapping;
    }

    const originalQuote = quote.quote?.toUpperCase() || "";
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
  }, [isTestSubmitted, quote.quote, text]);

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

    const cleanPlainLength = quote.quote?.toUpperCase().replace(/[^A-Z]/g, "").length ?? 0;

    const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
    const paddingCount = requiredLength - cleanPlainLength;

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
  }, [isTestSubmitted, quote.quote, text, matrixSize]);

  return (
    <div className="font-mono">
      {/* Matrix display section */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
        <div>
          <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Encryption Matrix:
          </p>
          <div className={`grid gap-2 ${is3x3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {matrix.map((row, i) =>
              row.map((num, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
                    darkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <span
                    className={`text-base sm:text-lg font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                  >
                    {num}
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {numberToLetter(num)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Decryption Matrix:
          </p>
          <div className={`grid gap-2 ${is3x3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {Array.from({ length: matrixSize }, (_, i) =>
              Array.from({ length: matrixSize }, (_, j) => {
                const value = solution?.matrix?.[i]?.[j] || "";
                const numValue = Number.parseInt(value) || 0;
                const correctNum = quote.decryptionMatrix?.[i]?.[j] ?? 0;
                const correctLetter = numberToLetter(correctNum);
                const isCorrect = isTestSubmitted && numValue === correctNum;

                return is3x3 ? (
                  <div
                    key={`solution-${i}-${j}`}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
                      darkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <span
                      className={`text-base sm:text-lg font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
                    >
                      {value || "?"}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {numberToLetter(numValue)}
                    </span>
                  </div>
                ) : (
                  <div key={`solution-${i}-${j}`} className="flex flex-col items-center">
                    <input
                      type="text"
                      id={`hill-matrix-${i}-${j}`}
                      name={`hill-matrix-${i}-${j}`}
                      maxLength={2}
                      disabled={isTestSubmitted}
                      value={value}
                      onChange={(e) => {
                        const newMatrix =
                          solution?.matrix ||
                          Array.from({ length: matrixSize }, () => new Array(matrixSize).fill(""));
                        const row = newMatrix[i];
                        if (row) {
                          row[j] = e.target.value;
                        }
                        onSolutionChange("matrix", newMatrix);
                      }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 text-center border rounded text-base sm:text-lg ${
                        darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
                          : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                      } ${
                        isTestSubmitted
                          ? isCorrect
                            ? "border-green-500 bg-green-100/10"
                            : "border-red-500 bg-red-100/10"
                          : ""
                      }`}
                      placeholder="?"
                      autoComplete="off"
                      style={{ textTransform: "uppercase" }}
                    />
                    {isTestSubmitted && !isCorrect && (
                      <div
                        className={`${darkMode ? "text-red-400" : "text-red-600"} text-[10px] sm:text-xs mt-1`}
                      >
                        {correctLetter}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Updated Encrypted text and solution section */}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {text.split("").map((char, i) => {
          const isLetter = /[A-Z]/.test(char);
          const value = solution?.plaintext?.[i] || "";
          const correctLetter = isTestSubmitted && isLetter ? correctMapping[i] : "";
          const isCorrect = value.toUpperCase() === correctLetter;

          const isPadding = isLetter && isTestSubmitted && paddingPositions.has(i);

          return (
            <div key={i} className="flex flex-col items-center mx-0.5">
              <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                {char}
              </span>
              {isLetter && (
                <div className="relative h-12 sm:h-14">
                  <input
                    type="text"
                    id={`hill-plaintext-${quoteIndex}-${i}`}
                    name={`hill-plaintext-${quoteIndex}-${i}`}
                    maxLength={1}
                    disabled={isTestSubmitted}
                    value={value}
                    onChange={(e) => {
                      const newValue = e.target.value.toUpperCase();
                      const newPlaintext = { ...(solution?.plaintext || {}) };
                      newPlaintext[i] = newValue;
                      onSolutionChange("plaintext", newPlaintext);
                    }}
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
                    autoComplete="off"
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
              )}
              {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
            </div>
          );
        })}
      </div>

      {/* Show original quote after submission */}
      {isTestSubmitted && (
        <div className={`mt-8 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Original Quote:
          </p>
          <p className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
            {quote.quote.replace(/\[.*?\]/g, "")}
          </p>
        </div>
      )}
    </div>
  );
};
