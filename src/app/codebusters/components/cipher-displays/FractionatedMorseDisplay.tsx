"use client";
import logger from "@/lib/utils/logger";

import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import type React from "react";
import { useMemo, useState } from "react";

// Top-level regex patterns
const UPPERCASE_LETTER_REGEX = /^[A-Z]$/;
const UPPERCASE_LETTER_TEST_REGEX = /[A-Z]/;
const MORSE_CHAR_REGEX = /[.\-x]/i;
const MORSE_PATTERN_REGEX = /[.-]/;

interface FractionatedMorseDisplayProps {
  text: string;
  quoteIndex: number;
  solution?: { [key: string]: string };
  fractionationTable?: { [key: string]: string };
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  hintedLetters?: { [questionIndex: number]: { [letter: string]: boolean } };
}

// Helper function to build correct mapping from fractionation table
const buildMappingFromFractionationTable = (
  fractionationTable: Record<string, string>
): Record<string, string> => {
  const mapping: Record<string, string> = {};
  for (const [triplet, letter] of Object.entries(fractionationTable)) {
    mapping[letter] = triplet;
  }
  return mapping;
};

// Helper function to build correct mapping from key
const buildMappingFromKey = (key: string[] | undefined): Record<string, string> => {
  const mapping: Record<string, string> = {};
  if (!key) {
    return mapping;
  }
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = key[i];
    if (cipherLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

export const FractionatedMorseDisplay = ({
  text,
  quoteIndex,
  solution,
  fractionationTable,
  isTestSubmitted,
  quotes,
  onSolutionChange,
  hintedLetters = {},
}: FractionatedMorseDisplayProps) => {
  const { darkMode } = useTheme();
  const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(null);

  // Helper function to filter and process input value
  const processInputValue = (inputValue: string): string => {
    const filteredValue = inputValue
      .split("")
      .filter((char) => MORSE_CHAR_REGEX.test(char))
      .join("")
      .toUpperCase();
    let finalValue = filteredValue.replace(/X/g, "x");
    finalValue = finalValue.replace(/xxx/g, "xx");
    return finalValue;
  };

  // Helper function to get input className
  const getInputClassName = (
    isSameCipherLetter: boolean,
    showCorrectAnswer: boolean,
    isHinted: boolean,
    isCorrect: boolean,
    darkMode: boolean
  ): string => {
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
  };

  // Helper function to check if letter is already used
  const isLetterAlreadyUsed = (
    newLetter: string,
    currentValue: string,
    usedTriplets: string[],
    solution: Record<string, string> | undefined
  ): boolean => {
    if (newLetter === currentValue) {
      return false;
    }
    const existingLetters = usedTriplets
      .map((t) => solution?.[`replacement_${t}`] || "")
      .filter((letter) => letter !== "");
    return existingLetters.includes(newLetter);
  };

  // Helper function to get color class for submitted cell
  const getSubmittedCellColorClass = (isCorrect: boolean, darkMode: boolean): string => {
    if (isCorrect) {
      return darkMode ? "text-green-400" : "text-green-600";
    }
    return darkMode ? "text-red-400" : "text-red-600";
  };

  // Helper function to render incorrect answer display
  const renderIncorrectAnswer = (
    replacementValue: string,
    correctValue: string,
    darkMode: boolean
  ): React.ReactNode => (
    <div className="flex items-center justify-center space-x-1">
      <div className={`text-xs line-through ${darkMode ? "text-red-400" : "text-red-600"}`}>
        {replacementValue}
      </div>
      <div className={`text-xs font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}>
        {correctValue}
      </div>
    </div>
  );

  // Helper function to get submitted cell content
  const getSubmittedCellContent = (
    hasUserInput: boolean,
    isCorrect: boolean,
    replacementValue: string,
    correctValue: string,
    darkMode: boolean
  ): React.ReactNode => {
    if (hasUserInput && !isCorrect) {
      return renderIncorrectAnswer(replacementValue, correctValue, darkMode);
    }
    const colorClass = getSubmittedCellColorClass(isCorrect, darkMode);
    return <div className={`text-center text-xs font-medium ${colorClass}`}>{correctValue}</div>;
  };

  // Replacement table cell component (extracted to reduce complexity)
  const ReplacementTableCell = ({
    triplet,
    replacementValue,
    correctValue,
    isCorrect,
    hasUserInput,
    isTestSubmitted,
    darkMode,
    usedTriplets,
    solution,
    quoteIndex,
    onSolutionChange,
    handleReplacementTableChange,
  }: {
    triplet: string;
    replacementValue: string;
    correctValue: string;
    isCorrect: boolean;
    hasUserInput: boolean;
    isTestSubmitted: boolean;
    darkMode: boolean;
    usedTriplets: string[];
    solution: Record<string, string> | undefined;
    quoteIndex: number;
    onSolutionChange: (quoteIndex: number, key: string, value: string) => void;
    handleReplacementTableChange: (triplet: string, value: string) => void;
  }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLetter = e.target.value.toUpperCase();
      if (isLetterAlreadyUsed(newLetter, replacementValue, usedTriplets, solution)) {
        return;
      }
      onSolutionChange(quoteIndex, `replacement_${triplet}`, newLetter);
      handleReplacementTableChange(triplet, e.target.value);
    };

    return (
      <td
        key={triplet}
        className={`p-1 border min-w-[2rem] ${darkMode ? "border-gray-600" : "border-gray-300"}`}
      >
        {isTestSubmitted ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {getSubmittedCellContent(
              hasUserInput,
              isCorrect,
              replacementValue,
              correctValue,
              darkMode
            )}
          </div>
        ) : (
          <input
            type="text"
            maxLength={1}
            value={replacementValue}
            onFocus={() => {
              // Intentionally empty - focus handling not needed
            }}
            onBlur={() => {
              // Intentionally empty - blur handling not needed
            }}
            onChange={handleChange}
            autoComplete="off"
            className={`w-full text-center text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-900"} focus:outline-none focus:ring-1 focus:ring-blue-500 border-0`}
          />
        )}
      </td>
    );
  };

  // Character display component (extracted to reduce complexity)
  const CharacterDisplay = ({
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
  }: {
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
  }) => {
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
  };

  const correctMapping = useMemo(() => {
    if (!(isTestSubmitted && quotes[quoteIndex] && fractionationTable)) {
      return {};
    }
    const quote = quotes[quoteIndex];
    if (!quote) {
      return {};
    }
    if (quote.cipherType === "Fractionated Morse") {
      return buildMappingFromFractionationTable(fractionationTable);
    }
    if (quote.key) {
      // Convert string key to array of characters
      const keyArray = quote.key.split("").filter((char) => char.trim() !== "");
      return buildMappingFromKey(keyArray.length > 0 ? keyArray : undefined);
    }
    return {};
  }, [isTestSubmitted, quoteIndex, quotes, fractionationTable]);

  const usedTriplets = useMemo(
    () =>
      fractionationTable
        ? Object.keys(fractionationTable)
            .filter((triplet) => triplet !== "xxx" && !triplet.includes("xxx"))
            .sort()
        : [],
    [fractionationTable]
  );

  const validCipherLetters = useMemo(() => {
    const set = new Set<string>();
    if (fractionationTable) {
      for (const letter of Object.values(fractionationTable)) {
        if (letter && UPPERCASE_LETTER_REGEX.test(letter)) {
          set.add(letter);
        }
      }
    }
    return set;
  }, [fractionationTable]);

  const cipherToTriplet: { [key: string]: string } = {};
  if (fractionationTable) {
    for (const [triplet, letter] of Object.entries(fractionationTable)) {
      cipherToTriplet[letter] = triplet;
    }
  }

  const tripletToCipher: { [key: string]: string } = {};
  if (fractionationTable) {
    for (const [triplet, letter] of Object.entries(fractionationTable)) {
      tripletToCipher[triplet] = letter;
    }
  }

  const handleReplacementTableChange = (triplet: string, newLetter: string) => {
    if (!fractionationTable) {
      return;
    }

    if (newLetter) {
      onSolutionChange(quoteIndex, newLetter.toUpperCase(), triplet);
    } else {
      const previousLetter = solution?.[`replacement_${triplet}`];
      if (previousLetter) {
        onSolutionChange(quoteIndex, previousLetter.toUpperCase(), "");
      }
    }
  };

  const updateReplacementTableFromTriplet = (cipherLetter: string, triplet: string) => {
    if (!fractionationTable) {
      return;
    }

    logger.log("Updating replacement table from triplet:", {
      cipherLetter,
      triplet,
      fractionationTable,
    });

    const matchingTriplet = usedTriplets.find((t) => t === triplet);
    if (matchingTriplet) {
      logger.log("Found matching triplet:", matchingTriplet);

      onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, cipherLetter);
    } else {
      logger.log("No matching triplet found for:", triplet);
      logger.log("Available triplets:", usedTriplets);
    }
  };

  const clearReplacementTableFromTriplet = (cipherLetter: string, incompleteTriplet: string) => {
    if (!fractionationTable) {
      return;
    }

    logger.log("Clearing replacement table from incomplete triplet:", {
      cipherLetter,
      incompleteTriplet,
    });

    const matchingTriplet = usedTriplets.find((t) => {
      const currentReplacement = solution?.[`replacement_${t}`];
      return currentReplacement === cipherLetter;
    });

    if (matchingTriplet) {
      logger.log("Found triplet to clear:", matchingTriplet);

      onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, "");
    }
  };

  // Helper function to create morse map
  const createMorseMap = (): { [key: string]: string } => ({
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
  });

  // Helper function to create reverse morse map
  const createReverseMorseMap = (morseMap: { [key: string]: string }): {
    [key: string]: string;
  } => {
    const reverseMap: { [key: string]: string } = {};
    for (const [letter, morse] of Object.entries(morseMap)) {
      reverseMap[morse] = letter;
    }
    return reverseMap;
  };

  // Helper function to add letter to plaintext
  const addLetterToPlaintext = (
    morse: string,
    morseStartIndex: number,
    plaintextLetters: string[],
    reverseMorseMap: { [key: string]: string }
  ): void => {
    const letter = reverseMorseMap[morse];
    if (letter) {
      const inputIndex = Math.floor(morseStartIndex / 3);
      if (inputIndex < plaintextLetters.length) {
        plaintextLetters[inputIndex] += letter;
      }
    }
  };

  // Helper function to process morse character
  const processMorseCharacter = (
    char: string,
    currentMorse: string,
    morseStartIndex: number,
    currentIndex: number,
    plaintextLetters: string[],
    reverseMorseMap: { [key: string]: string }
  ): { currentMorse: string; morseStartIndex: number; currentIndex: number } => {
    if (char === "x") {
      if (currentMorse.length > 0) {
        addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
      }
      return { currentMorse: "", morseStartIndex, currentIndex: currentIndex + 1 };
    }
    const newMorseStartIndex = currentMorse.length === 0 ? currentIndex : morseStartIndex;
    return {
      currentMorse: currentMorse + char,
      morseStartIndex: newMorseStartIndex,
      currentIndex: currentIndex + 1,
    };
  };

  // Helper function to handle double x separator
  const handleDoubleXSeparator = (
    i: number,
    morseString: string,
    currentIndex: number,
    plaintextLetters: string[]
  ): { shouldSkip: boolean; newIndex: number } => {
    if (i + 1 < morseString.length && morseString[i + 1] === "x" && i + 2 < morseString.length) {
      const inputIndex = Math.floor(currentIndex / 3);
      if (inputIndex < plaintextLetters.length) {
        const letter = plaintextLetters[inputIndex];
        if (letter && !letter.includes("/")) {
          plaintextLetters[inputIndex] = `${letter}/`;
        }
      }
      return { shouldSkip: true, newIndex: currentIndex + 1 };
    }
    return { shouldSkip: false, newIndex: currentIndex };
  };

  // Helper function to finalize remaining morse
  const finalizeRemainingMorse = (
    currentMorse: string,
    morseStartIndex: number,
    plaintextLetters: string[],
    reverseMorseMap: { [key: string]: string }
  ): void => {
    if (currentMorse.length > 0) {
      addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
    }
  };

  // Helper function to process x character
  const processXCharacter = (
    i: number,
    morseString: string,
    currentMorse: string,
    morseStartIndex: number,
    currentIndex: number,
    plaintextLetters: string[],
    reverseMorseMap: { [key: string]: string }
  ): { newMorse: string; newMorseStartIndex: number; newIndex: number; skipNext: boolean } => {
    if (currentMorse.length > 0) {
      addLetterToPlaintext(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);
    }
    const doubleXResult = handleDoubleXSeparator(i, morseString, currentIndex, plaintextLetters);
    if (doubleXResult.shouldSkip) {
      return {
        newMorse: "",
        newMorseStartIndex: morseStartIndex,
        newIndex: doubleXResult.newIndex,
        skipNext: true,
      };
    }
    return {
      newMorse: "",
      newMorseStartIndex: morseStartIndex,
      newIndex: currentIndex + 1,
      skipNext: false,
    };
  };

  const calculatePlaintextLetters = (triplets: string[]): string[] => {
    const morseMap = createMorseMap();
    const reverseMorseMap = createReverseMorseMap(morseMap);
    const plaintextLetters: string[] = Array.from({ length: triplets.length }, () => "");
    const morseString = triplets.join("");

    let currentIndex = 0;
    let currentMorse = "";
    let morseStartIndex = 0;

    for (let i = 0; i < morseString.length; i++) {
      const char = morseString[i];
      if (char === undefined) {
        continue;
      }

      if (char === "x") {
        const xResult = processXCharacter(
          i,
          morseString,
          currentMorse,
          morseStartIndex,
          currentIndex,
          plaintextLetters,
          reverseMorseMap
        );
        currentMorse = xResult.newMorse;
        morseStartIndex = xResult.newMorseStartIndex;
        currentIndex = xResult.newIndex;
        if (xResult.skipNext) {
          i++;
        }
      } else {
        const result = processMorseCharacter(
          char,
          currentMorse,
          morseStartIndex,
          currentIndex,
          plaintextLetters,
          reverseMorseMap
        );
        currentMorse = result.currentMorse;
        morseStartIndex = result.morseStartIndex;
        currentIndex = result.currentIndex;
      }
    }

    finalizeRemainingMorse(currentMorse, morseStartIndex, plaintextLetters, reverseMorseMap);

    const filteredPlaintextLetters = plaintextLetters.map((letters) =>
      letters === "xxx" || letters.includes("xxx") ? "" : letters
    );

    return filteredPlaintextLetters;
  };

  // Helper function to get triplet for character
  const getTripletForChar = (
    char: string,
    isTestSubmitted: boolean,
    correctMapping: Record<string, string>,
    solution: Record<string, string> | undefined
  ): string => {
    if (isTestSubmitted && correctMapping[char]) {
      return correctMapping[char];
    }
    return solution?.[char] || "";
  };

  // Helper function to create placeholder triplet
  const createPlaceholderTriplet = (triplet: string): string => {
    if (triplet.length === 0) {
      return "xxx";
    }
    return triplet + "x".repeat(3 - triplet.length);
  };

  // Helper function to process character for triplets
  const processCharForTriplets = (
    char: string,
    index: number,
    isTestSubmitted: boolean,
    correctMapping: Record<string, string>,
    solution: Record<string, string> | undefined,
    triplets: string[],
    incompleteTriplets: Set<number>
  ): void => {
    if (!UPPERCASE_LETTER_TEST_REGEX.test(char)) {
      return;
    }
    const triplet = getTripletForChar(char, isTestSubmitted, correctMapping, solution);
    if (triplet.length === 3) {
      triplets.push(triplet);
    } else {
      const placeholder = createPlaceholderTriplet(triplet);
      triplets.push(placeholder);
      incompleteTriplets.add(index);
    }
  };

  // Helper function to build triplets from text
  const buildTripletsFromText = (
    text: string,
    isTestSubmitted: boolean,
    correctMapping: Record<string, string>,
    solution: Record<string, string> | undefined
  ): { triplets: string[]; incompleteTriplets: Set<number> } => {
    const triplets: string[] = [];
    const incompleteTriplets: Set<number> = new Set();
    for (const [index, char] of text.split("").entries()) {
      processCharForTriplets(
        char,
        index,
        isTestSubmitted,
        correctMapping,
        solution,
        triplets,
        incompleteTriplets
      );
    }
    return { triplets, incompleteTriplets };
  };

  // Helper function to remove trailing partial triplets
  const removeTrailingPartialTriplets = (triplets: string[]): void => {
    const morseJoined = triplets.join("");
    const lastSeparator = morseJoined.lastIndexOf("x");
    if (lastSeparator !== -1) {
      const trailing = morseJoined.slice(lastSeparator + 1);
      const isTrailingPartial = MORSE_PATTERN_REGEX.test(trailing);
      if (isTrailingPartial) {
        const dropFrom = Math.floor((lastSeparator + 1) / 3);
        triplets.splice(dropFrom);
      }
    }
  };

  return (
    <div className="font-mono">
      <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        Fractionated Morse Cipher
      </div>

      {/* Cipher text */}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {(() => {
          const { triplets, incompleteTriplets } = buildTripletsFromText(
            text,
            isTestSubmitted,
            correctMapping,
            solution
          );

          const plaintextLetters = calculatePlaintextLetters(triplets);
          removeTrailingPartialTriplets(triplets);

          const charsWithPositions = text.split("").map((char, i) => ({ char, position: i }));
          return charsWithPositions.map(({ char, position }) => {
            const isLetter = UPPERCASE_LETTER_TEST_REGEX.test(char);
            if (isLetter && fractionationTable && !validCipherLetters.has(char)) {
              return (
                <div
                  key={`fm-spacer-${char}-${position}`}
                  className="w-5 h-12 sm:w-6 sm:h-14 mt-1"
                />
              );
            }
            const value = solution?.[char] || "";
            const isCorrect = Boolean(
              isTestSubmitted &&
                correctMapping[char] &&
                value.toLowerCase() === correctMapping[char].toLowerCase()
            );
            const isHinted = Boolean(isLetter && hintedLetters[quoteIndex]?.[char]);
            const showCorrectAnswer = Boolean(isTestSubmitted && isLetter);
            const isSameCipherLetter = Boolean(isLetter && focusedCipherLetter === char);
            const plaintextLetter =
              isLetter && !incompleteTriplets.has(position) ? plaintextLetters[position] || "" : "";

            return (
              <CharacterDisplay
                key={`fm-char-${char}-${position}`}
                char={char}
                i={position}
                isLetter={isLetter}
                value={value}
                isCorrect={isCorrect}
                isHinted={isHinted}
                showCorrectAnswer={showCorrectAnswer}
                isSameCipherLetter={isSameCipherLetter}
                plaintextLetter={plaintextLetter}
                correctMappingValue={correctMapping[char] || ""}
                quoteIndex={quoteIndex}
                onSolutionChange={onSolutionChange}
                updateReplacementTableFromTriplet={updateReplacementTableFromTriplet}
                clearReplacementTableFromTriplet={clearReplacementTableFromTriplet}
                isTestSubmitted={isTestSubmitted}
                darkMode={darkMode}
                setFocusedCipherLetter={setFocusedCipherLetter}
              />
            );
          });
        })()}
      </div>

      {/* Replacement Table */}
      <div
        className={`mt-4 mb-4 p-3 rounded border replacement-table-container ${darkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-300"}`}
      >
        <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Replacement Table
        </div>
        <div className="overflow-x-auto replacement-table-wrapper">
          <table className="text-xs border-collapse min-w-full replacement-table">
            <tbody>
              {/* Replacement row - editable cells */}
              <tr>
                <td
                  className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
                >
                  Replacement
                </td>
                {usedTriplets.map((triplet) => {
                  const replacementValue = solution?.[`replacement_${triplet}`] || "";
                  const correctValue = fractionationTable?.[triplet] || "";
                  const isCorrect = replacementValue === correctValue;
                  const hasUserInput = replacementValue !== "";

                  return (
                    <ReplacementTableCell
                      key={triplet}
                      triplet={triplet}
                      replacementValue={replacementValue}
                      correctValue={correctValue}
                      isCorrect={isCorrect}
                      hasUserInput={hasUserInput}
                      isTestSubmitted={isTestSubmitted}
                      darkMode={darkMode}
                      usedTriplets={usedTriplets}
                      solution={solution}
                      quoteIndex={quoteIndex}
                      onSolutionChange={onSolutionChange}
                      handleReplacementTableChange={handleReplacementTableChange}
                    />
                  );
                })}
              </tr>
              {/* Morse triplet rows - 3 rows for the 3 positions in each triplet */}
              {[0, 1, 2].map((position) => (
                <tr key={`fm-position-${position}`}>
                  <td
                    className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
                  >
                    {position === 0 ? "Morse code" : ""}
                  </td>
                  {usedTriplets.map((triplet) => (
                    <td
                      key={`fm-triplet-${triplet}-${position}`}
                      className={`p-1 border text-center ${darkMode ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
                    >
                      {triplet[position] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show original quote and morse code when test is submitted */}
      {isTestSubmitted && (
        <div className={`mt-4 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Original Quote & Morse Code:
          </p>
          <p className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
            {quotes[quoteIndex]?.quote || ""}
          </p>
        </div>
      )}
    </div>
  );
};
