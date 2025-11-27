"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { KeywordInputCell } from "./KeywordInputCell";

interface KeywordInputSectionProps {
  quote: QuoteData;
  isTestSubmitted: boolean;
  darkMode: boolean;
  quoteIndex: number;
  onKeywordSolutionChange?: (quoteIndex: number, keyword: string) => void;
}

export function KeywordInputSection({
  quote,
  isTestSubmitted,
  darkMode,
  quoteIndex,
  onKeywordSolutionChange,
}: KeywordInputSectionProps) {
  if (!quote.askForKeyword) {
    return null;
  }

  return (
    <>
      <div
        className={`mb-4 p-3 rounded-lg border-2 ${
          darkMode
            ? "bg-blue-900/20 border-blue-500/50 text-blue-300"
            : "bg-blue-50 border-blue-300 text-blue-800"
        }`}
      >
        <div className="font-semibold mb-1">⚠️ Special Instructions:</div>
        <div>
          The decrypted text will not be graded for this quote. Instead, figure out the{" "}
          <strong>key used to encode the cipher</strong>.
        </div>
        <div className="text-sm mt-1 opacity-80">Enter the key in the input boxes below.</div>
      </div>

      <div className="mb-6">
        <div className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Key:
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: quote.key?.length || 0 }, (_, i) => {
            const currentValue = quote.keywordSolution?.[i] || "";
            const expectedValue = quote.key?.[i] || "";
            const isCorrect =
              isTestSubmitted && currentValue.toUpperCase() === expectedValue.toUpperCase();
            const showCorrectAnswer = isTestSubmitted;

            const handleKeywordChange = (index: number, value: string) => {
              if (onKeywordSolutionChange) {
                const currentKeyword = quote.keywordSolution || "";
                const newKeyword =
                  currentKeyword.slice(0, index) +
                  value.toUpperCase() +
                  currentKeyword.slice(index + 1);
                onKeywordSolutionChange(quoteIndex, newKeyword);
              }
            };

            return (
              <KeywordInputCell
                key={`sub-keyword-${i}-${expectedValue}`}
                i={i}
                currentValue={currentValue}
                expectedValue={expectedValue}
                isCorrect={isCorrect}
                showCorrectAnswer={showCorrectAnswer}
                darkMode={darkMode}
                onKeywordChange={handleKeywordChange}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
