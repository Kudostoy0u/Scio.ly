"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import { useState } from "react";
import { toast } from "react-toastify";
import { ReplacementTable } from "./ReplacementTable";

// Top-level regex patterns
const XENOCRYPT_LETTER_REGEX = /[A-ZÑ]/;
const STANDARD_LETTER_REGEX = /[A-Z]/;

const generateKeywordAlphabet = (keyword: string): string => {
  const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, "");
  const used = new Set<string>();
  const result: string[] = [];

  for (const char of cleanKeyword) {
    if (!used.has(char)) {
      used.add(char);
      result.push(char);
    }
  }

  for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(char)) {
      result.push(char);
    }
  }

  return result.join("");
};

interface SubstitutionDisplayProps {
  text: string;
  quoteIndex: number;
  solution?: { [key: string]: string };
  isTestSubmitted: boolean;
  cipherType: string;
  key?: string;
  caesarShift?: number;
  affineA?: number;
  affineB?: number;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } };
  _hintCounts: { [questionIndex: number]: number };
  onKeywordSolutionChange?: (quoteIndex: number, keyword: string) => void;
}

export const SubstitutionDisplay = ({
  text,
  quoteIndex,
  solution,
  isTestSubmitted,
  cipherType,
  key: _key,
  caesarShift,
  affineA,
  affineB,
  quotes,
  onSolutionChange,
  hintedLetters,
  onKeywordSolutionChange,
}: SubstitutionDisplayProps) => {
  const { darkMode } = useTheme();
  const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(null);

  // Helper function to get character input className
  const getCharacterInputClassName = (
    isSameCipherLetter: boolean,
    showCorrectAnswer: boolean,
    isHinted: boolean,
    isCorrect: boolean,
    darkMode: boolean
  ): string => {
    const baseClasses = "w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
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
    correctMappingValue,
    darkMode,
    quoteIndex,
    onCharChange,
    onFocus,
    onBlur,
  }: {
    char: string;
    i: number;
    isLetter: boolean;
    value: string;
    isCorrect: boolean;
    isHinted: boolean;
    showCorrectAnswer: boolean;
    isSameCipherLetter: boolean;
    correctMappingValue: string;
    darkMode: boolean;
    quoteIndex: number;
    onCharChange: (char: string, value: string) => void;
    onFocus: (char: string) => void;
    onBlur: () => void;
  }) => {
    if (!isLetter) {
      return <div className="w-5 h-12 sm:w-6 sm:h-14 mt-1" />;
    }

    return (
      <div className="flex flex-col items-center mx-0.5">
        <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
          {char}
        </span>
        <div className="relative h-12 sm:h-14">
          <input
            type="text"
            id={`substitution-${quoteIndex}-${i}`}
            name={`substitution-${quoteIndex}-${i}`}
            maxLength={1}
            value={value}
            disabled={showCorrectAnswer}
            onChange={(e) => onCharChange(char, e.target.value.toUpperCase())}
            onFocus={() => onFocus(char)}
            onBlur={onBlur}
            autoComplete="off"
            className={getCharacterInputClassName(
              isSameCipherLetter,
              showCorrectAnswer,
              isHinted,
              isCorrect,
              darkMode
            )}
          />
          {showCorrectAnswer && !isCorrect && (
            <div
              className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
                darkMode ? "text-red-400" : "text-red-600"
              }`}
            >
              {correctMappingValue}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Keyword input cell component (extracted to reduce complexity)
  const KeywordInputCell = ({
    i,
    currentValue,
    expectedValue,
    isCorrect,
    showCorrectAnswer,
    darkMode,
    onKeywordChange,
  }: {
    i: number;
    currentValue: string;
    expectedValue: string;
    isCorrect: boolean;
    showCorrectAnswer: boolean;
    darkMode: boolean;
    onKeywordChange: (index: number, value: string) => void;
  }) => {
    return (
      <div className="flex flex-col items-center">
        <input
          type="text"
          maxLength={1}
          value={currentValue}
          disabled={showCorrectAnswer}
          onChange={(e) => onKeywordChange(i, e.target.value.toUpperCase())}
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
  };

  // Handle solution change with duplicate letter validation
  const handleSolutionChangeWithValidation = (cipherLetter: string, newPlainLetter: string) => {
    if (isTestSubmitted) {
      return;
    }

    // Check for duplicate letters in the current solution
    const existingPlainLetters = Object.values(solution || {}).filter((letter) => letter !== "");

    // If the new letter already exists and it's not the same as the current value for this cipher letter
    if (
      existingPlainLetters.includes(newPlainLetter) &&
      newPlainLetter !== solution?.[cipherLetter]
    ) {
      toast.warning(
        `Letter "${newPlainLetter}" is already used in the replacement table. Each letter can only be used once.`
      );
      return;
    }

    // Proceed with the solution change
    onSolutionChange(quoteIndex, cipherLetter, newPlainLetter);
  };

  const correctMapping: { [key: string]: string } =
    isTestSubmitted && quotes[quoteIndex]
      ? buildCorrectMappingForSubstitution(cipherType, quotes[quoteIndex], quoteIndex, quotes)
      : {};

  return (
    <div className="font-mono">
      {quotes[quoteIndex]?.askForKeyword && (
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
      {quotes[quoteIndex]?.askForKeyword && (
        <div className="mb-6">
          <div
            className={`text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Key:
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: quotes[quoteIndex]?.key?.length || 0 }, (_, i) => {
              const currentValue = quotes[quoteIndex]?.keywordSolution?.[i] || "";
              const expectedValue = quotes[quoteIndex]?.key?.[i] || "";
              const isCorrect =
                isTestSubmitted && currentValue.toUpperCase() === expectedValue.toUpperCase();
              const showCorrectAnswer = isTestSubmitted;

              const handleKeywordChange = (index: number, value: string) => {
                if (onKeywordSolutionChange && quotes[quoteIndex]) {
                  const currentKeyword = quotes[quoteIndex].keywordSolution || "";
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
      )}
      <div className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        {getCipherInfo(cipherType, caesarShift, affineA, affineB)}
      </div>
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
        {(() => {
          const charsWithPositions = text.split("").map((char, i) => ({ char, position: i }));
          return charsWithPositions.map(({ char, position }) => {
            const isXenocrypt = cipherType.includes("Xenocrypt");
            const isLetter = isXenocrypt
              ? XENOCRYPT_LETTER_REGEX.test(char)
              : STANDARD_LETTER_REGEX.test(char);
            const value = solution?.[char] || "";
            const isCorrect = isLetter && value === correctMapping[char];
            const isHinted = Boolean(isLetter && hintedLetters[quoteIndex]?.[char]);
            const showCorrectAnswer = Boolean(isTestSubmitted && isLetter);
            const isSameCipherLetter = Boolean(isLetter && focusedCipherLetter === char);

            return (
              <CharacterDisplay
                key={`sub-char-${char}-${position}`}
                char={char}
                i={position}
                isLetter={isLetter}
                value={value}
                isCorrect={isCorrect}
                isHinted={isHinted}
                showCorrectAnswer={showCorrectAnswer}
                isSameCipherLetter={isSameCipherLetter}
                correctMappingValue={correctMapping[char] || ""}
                darkMode={darkMode}
                quoteIndex={quoteIndex}
                onCharChange={handleSolutionChangeWithValidation}
                onFocus={setFocusedCipherLetter}
                onBlur={() => setFocusedCipherLetter(null)}
              />
            );
          });
        })()}
      </div>

      {/* Replacement Table for substitution ciphers */}
      {[
        "K1 Aristocrat",
        "K2 Aristocrat",
        "K3 Aristocrat",
        "K1 Patristocrat",
        "K2 Patristocrat",
        "K3 Patristocrat",
        "Random Aristocrat",
        "Random Patristocrat",
        "Atbash",
        "Caesar",
        "Affine",
        "Random Xenocrypt",
        "K1 Xenocrypt",
        "K2 Xenocrypt",
        "K3 Xenocrypt",
      ].includes(cipherType) && (
        <ReplacementTable
          text={text}
          cipherType={cipherType}
          quoteIndex={quoteIndex}
          solution={solution || {}}
          onSolutionChange={handleSolutionChangeWithValidation}
          correctMapping={correctMapping}
          isTestSubmitted={isTestSubmitted}
          hintedLetters={{ [quoteIndex]: hintedLetters[quoteIndex] || {} }}
        />
      )}
    </div>
  );
};

// Helper function to get Caesar cipher info
const getCaesarCipherInfo = (caesarShift?: number): string => {
  return caesarShift !== undefined ? `Caesar Cipher (Shift: ${caesarShift})` : "Caesar Cipher";
};

// Helper function to get Affine cipher info
const getAffineCipherInfo = (affineA?: number, affineB?: number): string => {
  return `Affine Cipher (a=${affineA || "?"}, b=${affineB || "?"})`;
};

// Helper function to get cipher info (extracted to reduce complexity)
const getCipherInfo = (
  cipherType: string,
  caesarShift?: number,
  affineA?: number,
  affineB?: number
): string => {
  const cipherInfoMap: { [key: string]: string } = {
    "Random Aristocrat": "Random Aristocrat Cipher",
    "K1 Aristocrat": "K1 Aristocrat Cipher",
    "K2 Aristocrat": "K2 Aristocrat Cipher",
    "K3 Aristocrat": "K3 Aristocrat Cipher",
    "Random Patristocrat": "Random Patristocrat Cipher",
    "K1 Patristocrat": "K1 Patristocrat Cipher",
    "K2 Patristocrat": "K2 Patristocrat Cipher",
    "K3 Patristocrat": "K3 Patristocrat Cipher",
    Atbash: "Atbash Cipher",
    Nihilist: "Nihilist Substitution Cipher",
    "Fractionated Morse": "Fractionated Morse Cipher",
    "Complete Columnar": "Complete Columnar Cipher",
    "Random Xenocrypt": "Random Xenocrypt Cipher",
    "K1 Xenocrypt": "K1 Xenocrypt Cipher",
    "K2 Xenocrypt": "K2 Xenocrypt Cipher",
    "K3 Xenocrypt": "K3 Xenocrypt Cipher",
  };

  if (cipherInfoMap[cipherType]) {
    return cipherInfoMap[cipherType];
  }

  if (cipherType === "Caesar") {
    return getCaesarCipherInfo(caesarShift);
  }

  if (cipherType === "Affine") {
    return getAffineCipherInfo(affineA, affineB);
  }

  return "Substitution Cipher";
};

// Helper function to build correct mapping from stored alphabets
const buildMappingFromAlphabets = (
  plainAlphabet: string[],
  cipherAlphabet: string[]
): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build K1 mapping
const buildK1Mapping = (
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const plainAlphabet = isXeno
    ? `${generateKeywordAlphabet(keyword)}Ñ`
    : generateKeywordAlphabet(keyword);
  const baseCipher = isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build K2 mapping
const buildK2Mapping = (
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const plainAlphabet = isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const baseCipher = isXeno
    ? `${generateKeywordAlphabet(keyword)}Ñ`
    : generateKeywordAlphabet(keyword);
  const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build K3 mapping
const buildK3Mapping = (
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const baseAlphabet = generateKeywordAlphabet(keyword);
  const alphabet = isXeno ? `${baseAlphabet}Ñ` : baseAlphabet;
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const shiftedIndex = (i + kShift) % len;
    const cipherLetter = alphabet[shiftedIndex];
    const plainLetter = alphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build mapping from key array
const buildMappingFromKeyArray = (key: string[]): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = key[i];
    if (cipherLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build Caesar mapping with shift
const buildCaesarMappingWithShift = (shift: number): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
    mapping[cipherLetter] = plainLetter;
  }
  return mapping;
};

// Helper function to build Caesar mapping without shift
const buildCaesarMappingWithoutShift = (
  encrypted: string,
  quote: string
): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const ciphertext = encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const expectedPlaintext = quote.toUpperCase().replace(/[^A-Z]/g, "");
  for (let i = 0; i < Math.min(ciphertext.length, expectedPlaintext.length); i++) {
    const cipherLetter = ciphertext[i];
    const plainLetter = expectedPlaintext[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build Atbash mapping
const buildAtbashMapping = (): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  const atbashMap = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = atbashMap[i];
    if (cipherLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
};

// Helper function to build Affine mapping
const buildAffineMapping = (a: number, b: number): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = String.fromCharCode(((a * i + b) % 26) + 65);
    mapping[cipherLetter] = plainLetter;
  }
  return mapping;
};

// Helper function to build keyword-based mapping
const buildKeywordBasedMapping = (
  cipherType: string,
  quote: QuoteData,
  quoteIndex: number,
  quotes: QuoteData[]
): { [key: string]: string } | null => {
  const keywordCipherTypes = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ];

  if (!(keywordCipherTypes.includes(cipherType) && quote.key)) {
    return null;
  }

  const keyword = quote.key;
  const isXeno = cipherType.includes("Xenocrypt");

  if (quote.plainAlphabet && quote.cipherAlphabet) {
    return buildMappingFromAlphabets(quote.plainAlphabet.split(""), quote.cipherAlphabet.split(""));
  }

  if (cipherType.includes("K1")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 0;
    return buildK1Mapping(keyword || "", isXeno, kShift);
  }

  if (cipherType.includes("K2")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 0;
    return buildK2Mapping(keyword || "", isXeno, kShift);
  }

  if (cipherType.includes("K3")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 1;
    return buildK3Mapping(keyword || "", isXeno, kShift);
  }

  return null;
};

// Helper function to build mapping for random ciphers
const buildRandomCipherMapping = (
  cipherType: string,
  quote: QuoteData
): { [key: string]: string } | null => {
  if (
    ["Random Aristocrat", "Random Patristocrat", "Random Xenocrypt"].includes(cipherType) &&
    quote.key
  ) {
    return buildMappingFromKeyArray(quote.key.split(""));
  }
  return null;
};

// Helper function to build mapping for other ciphers
const buildOtherCipherMapping = (
  cipherType: string,
  quote: QuoteData
): { [key: string]: string } | null => {
  if (cipherType === "Caesar") {
    return quote.caesarShift !== undefined
      ? buildCaesarMappingWithShift(quote.caesarShift)
      : buildCaesarMappingWithoutShift(quote.encrypted, quote.quote);
  }

  if (cipherType === "Atbash") {
    return buildAtbashMapping();
  }

  if (cipherType === "Affine" && quote.affineA !== undefined && quote.affineB !== undefined) {
    return buildAffineMapping(quote.affineA, quote.affineB);
  }

  if (
    (cipherType === "Xenocrypt" ||
      ["Nihilist", "Fractionated Morse", "Complete Columnar"].includes(cipherType)) &&
    quote.key
  ) {
    return buildMappingFromKeyArray(quote.key.split(""));
  }

  return null;
};

// Helper function to build correct mapping for substitution ciphers
const buildCorrectMappingForSubstitution = (
  cipherType: string,
  quote: QuoteData,
  quoteIndex: number,
  quotes: QuoteData[]
): { [key: string]: string } => {
  const keywordMapping = buildKeywordBasedMapping(cipherType, quote, quoteIndex, quotes);
  if (keywordMapping) {
    return keywordMapping;
  }

  const randomMapping = buildRandomCipherMapping(cipherType, quote);
  if (randomMapping) {
    return randomMapping;
  }

  const otherMapping = buildOtherCipherMapping(cipherType, quote);
  if (otherMapping) {
    return otherMapping;
  }

  return {};
};
