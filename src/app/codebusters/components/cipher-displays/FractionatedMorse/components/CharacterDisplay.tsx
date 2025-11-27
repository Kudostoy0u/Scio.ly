"use client";
import type React from "react";
import { processInputValue } from "../utils/inputProcessing";

interface CharacterDisplayProps {
  char: string;
  i: number;
  isLetter: boolean;
  value: string;
  isCorrect: boolean;
  isHinted: boolean;
  showCorrectAnswer: boolean;
  isSameCipherLetter: boolean;
  plaintextLetter: string;
  correctMappingValue: string;
  quoteIndex: number;
  onSolutionChange: (quoteIndex: number, char: string, value: string) => void;
  updateReplacementTableFromTriplet: (char: string, triplet: string) => void;
  clearReplacementTableFromTriplet: (char: string, triplet: string) => void;
  isTestSubmitted: boolean;
  darkMode: boolean;
  setFocusedCipherLetter: (char: string | null) => void;
}

// Helper function to get input className
function getInputClassName(
  isSameCipherLetter: boolean,
  showCorrectAnswer: boolean,
  isHinted: boolean,
  isCorrect: boolean,
  darkMode: boolean
): string {
  const baseClasses = "w-8 h-5 sm:w-10 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
  const focusClasses = isSameCipherLetter
    ? "border-2 border-blue-500"
    : darkMode
      ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
  const stateClasses = showCorrectAnswer
    ? isHinted
      ? "border-yellow-500 bg-yellow-100/10"
      : isCorrect
        ? "border-green-500 bg-green-100/10"
        : "border-red-500 bg-red-100/10"
    : "";
  return `${baseClasses} ${focusClasses} ${stateClasses}`;
}

export function CharacterDisplay({
  char,
  i,
  isLetter,
  value,
  isCorrect,
  isHinted,
  showCorrectAnswer,
  isSameCipherLetter,
  plaintextLetter,
  correctMappingValue,
  quoteIndex,
  onSolutionChange,
  updateReplacementTableFromTriplet,
  clearReplacementTableFromTriplet,
  isTestSubmitted,
  darkMode,
  setFocusedCipherLetter,
}: CharacterDisplayProps) {
  if (!isLetter) {
    return <div key={i} className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const finalValue = processInputValue(inputValue);

    if (finalValue !== inputValue) {
      e.target.value = finalValue;
    }

    onSolutionChange(quoteIndex, char, finalValue);

    if (finalValue.length === 3) {
      updateReplacementTableFromTriplet(char, finalValue);
    } else if (finalValue.length < 3) {
      clearReplacementTableFromTriplet(char, finalValue);
    }
  };

  return (
    <div key={i} className="flex flex-col items-center mx-0.5">
      <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
        {char}
      </span>
      <div className="relative h-12 sm:h-14">
        <input
          type="text"
          id={`fractionated-${quoteIndex}-${i}`}
          name={`fractionated-${quoteIndex}-${i}`}
          maxLength={3}
          value={value}
          disabled={isTestSubmitted}
          onFocus={() => setFocusedCipherLetter(char)}
          onBlur={() => setFocusedCipherLetter(null)}
          onChange={handleChange}
          autoComplete="off"
          className={getInputClassName(
            isSameCipherLetter,
            showCorrectAnswer,
            isHinted,
            isCorrect,
            darkMode
          )}
          placeholder=""
        />
        {showCorrectAnswer && !isCorrect && (
          <div
            className={`absolute top-6 sm:top-7 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] ${
              darkMode ? "text-red-400" : "text-red-600"
            }`}
          >
            {correctMappingValue}
          </div>
        )}
        {plaintextLetter && (
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-bold ${
              darkMode ? "text-blue-400" : "text-blue-600"
            }`}
          >
            {plaintextLetter}
          </div>
        )}
      </div>
    </div>
  );
}
