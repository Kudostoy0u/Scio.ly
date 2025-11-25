"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import { FrequencyTable } from "./FrequencyTable";
import { ReplacementTable } from "./ReplacementTable";

// Top-level regex for uppercase letter matching
const UPPERCASE_LETTER_REGEX = /[A-Z]/;

// Character display component (extracted to reduce complexity)
const CharacterDisplay = ({
  char,
  index,
  quoteIndex,
  isLetter,
  value,
  isCorrect,
  showCorrectAnswer,
  correctMapping,
  darkMode,
  isTestSubmitted,
  onSolutionChange,
}: {
  char: string;
  index: number;
  quoteIndex: number;
  isLetter: boolean;
  value: string;
  isCorrect: boolean;
  showCorrectAnswer: boolean;
  correctMapping: Record<string, string>;
  darkMode: boolean;
  isTestSubmitted: boolean;
  onSolutionChange: (quoteIndex: number, char: string, value: string) => void;
}) => (
  <div key={index} className="flex flex-col items-center mx-0.5">
    <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
      {char}
    </span>
    {isLetter && (
      <div className="relative h-12 sm:h-14">
        <input
          type="text"
          id={`aristocrat-${quoteIndex}-${index}`}
          name={`aristocrat-${quoteIndex}-${index}`}
          maxLength={1}
          value={value}
          disabled={isTestSubmitted}
          onChange={(e) => onSolutionChange(quoteIndex, char, e.target.value.toUpperCase())}
          autoComplete="off"
          className={`w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm ${
            darkMode
              ? "bg-gray-800 border-gray-600 text-gray-300"
              : "bg-white border-gray-300 text-gray-900"
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            showCorrectAnswer
              ? isCorrect
                ? "border-green-500 bg-green-100/10"
                : "border-red-500 bg-red-100/10"
              : ""
          }`}
        />
        {showCorrectAnswer && !isCorrect && (
          <div
            className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
              darkMode ? "text-red-400" : "text-red-600"
            }`}
          >
            {correctMapping[char]}
          </div>
        )}
      </div>
    )}
    {!isLetter && <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />}
  </div>
);

interface AristocratDisplayProps {
  text: string;
  quoteIndex: number;
  solution?: { [key: string]: string };
  frequencyNotes?: { [key: string]: string };
  isTestSubmitted: boolean;
  cipherType: string;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  onFrequencyNoteChange: (quoteIndex: number, letter: string, note: string) => void;
  onKeywordSolutionChange?: (quoteIndex: number, keyword: string) => void;
}

export const AristocratDisplay = ({
  text,
  quoteIndex,
  solution,
  frequencyNotes,
  isTestSubmitted,
  cipherType,
  quotes,
  onSolutionChange,
  onFrequencyNoteChange,
  onKeywordSolutionChange,
}: AristocratDisplayProps) => {
  const { darkMode } = useTheme();

  const correctMapping: { [key: string]: string } = {};
  const currentQuote = quotes[quoteIndex];
  if (isTestSubmitted && currentQuote?.key) {
    for (let i = 0; i < 26; i++) {
      const plainLetter = String.fromCharCode(65 + i);
      const cipherLetter = currentQuote.key?.[i];
      if (cipherLetter !== undefined) {
        correctMapping[cipherLetter] = plainLetter;
      }
    }
  }

  return (
    <div className="font-mono">
      {currentQuote?.askForKeyword && (
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
      )}

      {/* Keyword Input Section */}
      {currentQuote?.askForKeyword && (
        <div className="mb-6">
          <div
            className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Key:
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: currentQuote?.key?.length || 0 }, (_, i) => {
              const currentValue = currentQuote?.keywordSolution?.[i] || "";
              const expectedValue = currentQuote?.key?.[i] || "";
              const isCorrect =
                isTestSubmitted && currentValue.toUpperCase() === expectedValue.toUpperCase();
              const showCorrectAnswer = isTestSubmitted;

              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: Keyword input fields are stable and index is needed for mapping
                  key={i}
                  className="flex flex-col items-center"
                >
                  <input
                    type="text"
                    maxLength={1}
                    value={currentValue}
                    disabled={isTestSubmitted}
                    onChange={(e) => {
                      if (onKeywordSolutionChange && currentQuote) {
                        const currentKeyword = currentQuote.keywordSolution || "";
                        const newKeyword =
                          currentKeyword.slice(0, i) +
                          e.target.value.toUpperCase() +
                          currentKeyword.slice(i + 1);
                        onKeywordSolutionChange(quoteIndex, newKeyword);
                      }
                    }}
                    className={`w-8 h-8 text-center border rounded text-sm ${
                      darkMode
                        ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    } ${
                      showCorrectAnswer
                        ? isCorrect
                          ? "border-green-500 bg-green-100/10"
                          : "border-red-500 bg-red-100/10"
                        : ""
                    }`}
                  />
                  {showCorrectAnswer && !isCorrect && (
                    <div className={`text-xs mt-1 ${darkMode ? "text-red-400" : "text-red-600"}`}>
                      {expectedValue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {text.split("").map((char, i) => {
          const isLetter = UPPERCASE_LETTER_REGEX.test(char);
          const value = solution?.[char] || "";
          const isCorrect = isLetter && value === correctMapping[char];
          const showCorrectAnswer = isTestSubmitted && isLetter;

          return (
            <CharacterDisplay
              // biome-ignore lint/suspicious/noArrayIndexKey: Text characters are stable and index is needed for mapping
              key={i}
              char={char}
              index={i}
              quoteIndex={quoteIndex}
              isLetter={isLetter}
              value={value}
              isCorrect={isCorrect}
              showCorrectAnswer={showCorrectAnswer}
              correctMapping={correctMapping}
              darkMode={darkMode}
              isTestSubmitted={isTestSubmitted}
              onSolutionChange={onSolutionChange}
            />
          );
        })}
      </div>
      <FrequencyTable
        text={text}
        frequencyNotes={frequencyNotes}
        onNoteChange={(letter, note) => onFrequencyNoteChange(quoteIndex, letter, note)}
        quoteIndex={quoteIndex}
      />
      <ReplacementTable
        text={text}
        solution={solution}
        quoteIndex={quoteIndex}
        isTestSubmitted={isTestSubmitted}
        cipherType={cipherType}
        correctMapping={correctMapping}
        onSolutionChange={(cipherLetter: string, plainLetter: string) =>
          onSolutionChange(quoteIndex, cipherLetter, plainLetter)
        }
      />
    </div>
  );
};
