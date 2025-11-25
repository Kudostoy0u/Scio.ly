"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/themeContext";
import { useState } from "react";

// Top-level regex pattern
const UPPERCASE_LETTER_REGEX = /[A-Z]/;

interface PortaDisplayProps {
  text: string;
  keyword: string;
  quoteIndex: number;
  solution?: { [key: string]: string };
  isTestSubmitted: boolean;
  quotes: QuoteData[];
  onSolutionChange: (quoteIndex: number, cipherLetter: string, plainLetter: string) => void;
}

export const PortaDisplay = ({
  text,
  keyword,
  quoteIndex,
  solution,
  isTestSubmitted,
  quotes,
  onSolutionChange,
}: PortaDisplayProps) => {
  const { darkMode } = useTheme();
  const [hoveredChar, setHoveredChar] = useState<{ rowIndex: number; charIndex: number } | null>(
    null
  );
  const [showTable, setShowTable] = useState<boolean>(false);

  const quote = quotes[quoteIndex];
  if (!quote) {
    return <div>Quote not found</div>;
  }

  // Helper constants (extracted to reduce complexity)
  const PORTA_TABLE = {
    AB: "NOPQRSTUVWXYZABCDEFGHIJKLM",
    CD: "OPQRSTUVWXYZNABCDEFGHIJKLM",
    EF: "PQRSTUVWXYZNOABCDEFGHIJKLM",
    GH: "QRSTUVWXYZNOPABCDEFGHIJKLM",
    IJ: "RSTUVWXYZNOPQABCDEFGHIJKLM",
    KL: "STUVWXYZNOPQRABCDEFGHIJKLM",
    MN: "TUVWXYZNOPQRSABCDEFGHIJKLM",
    OP: "UVWXYZNOPQRSTABCDEFGHIJKLM",
    QR: "VWXYZNOPQRSTUABCDEFGHIJKLM",
    ST: "WXYZNOPQRSTUVABCDEFGHIJKLM",
    UV: "XYZNOPQRSTUVWABCDEFGHIJKLM",
    WX: "YZNOPQRSTUVWXABCDEFGHIJKLM",
    YZ: "ZNOPQRSTUVWXYABCDEFGHIJKLM",
  } as const;

  const CHAR_TO_PAIR: { [key: string]: string } = {
    A: "AB",
    B: "AB",
    C: "CD",
    D: "CD",
    E: "EF",
    F: "EF",
    G: "GH",
    H: "GH",
    I: "IJ",
    J: "IJ",
    K: "KL",
    L: "KL",
    M: "MN",
    N: "MN",
    O: "OP",
    P: "OP",
    Q: "QR",
    R: "QR",
    S: "ST",
    T: "ST",
    U: "UV",
    V: "UV",
    W: "WX",
    X: "WX",
    Y: "YZ",
    Z: "YZ",
  };

  const HEADER_ROW = "ABCDEFGHIJKLM";

  // Helper function to decrypt a single character
  const decryptChar = (cipherChar: string, keywordChar: string): string | undefined => {
    const pair = CHAR_TO_PAIR[keywordChar];
    if (!pair) {
      return undefined;
    }
    const portaRow = PORTA_TABLE[pair as keyof typeof PORTA_TABLE];
    if (!portaRow) {
      return undefined;
    }

    const headerIndex = HEADER_ROW.indexOf(cipherChar);
    if (headerIndex !== -1) {
      return portaRow[headerIndex];
    }
    const keyRowIndex = portaRow.indexOf(cipherChar);
    if (keyRowIndex !== -1) {
      return HEADER_ROW[keyRowIndex];
    }
    return undefined;
  };

  // Helper function to process a single character in the mapping
  const processCharacterForMapping = (
    textChar: string,
    i: number,
    cipherLetterIndex: number,
    cleanCipherText: string,
    cleanOriginalQuote: string,
    keyword: string,
    correctMapping: { [key: number]: string }
  ): number => {
    if (!(textChar && UPPERCASE_LETTER_REGEX.test(textChar))) {
      return cipherLetterIndex;
    }

    if (
      !(cipherLetterIndex < cleanCipherText.length && cipherLetterIndex < cleanOriginalQuote.length)
    ) {
      return cipherLetterIndex + 1;
    }

    const cipherChar = cleanCipherText[cipherLetterIndex];
    const keywordChar = keyword[cipherLetterIndex % keyword.length];
    if (keywordChar && cipherChar) {
      const plainChar = decryptChar(cipherChar, keywordChar);
      if (plainChar) {
        correctMapping[i] = plainChar;
      }
    }

    return cipherLetterIndex + 1;
  };

  // Helper function to build correct mapping (extracted to reduce complexity)
  const buildCorrectMapping = (
    text: string,
    originalQuote: string,
    keyword: string
  ): { [key: number]: string } => {
    const originalQuoteUpper = originalQuote.toUpperCase();
    const cleanOriginalQuote = originalQuoteUpper.replace(/[^A-Z]/g, "");
    const cleanCipherText = text.replace(/[^A-Z]/g, "");
    const correctMapping: { [key: number]: string } = {};
    let cipherLetterIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const textChar = text[i];
      if (textChar) {
        cipherLetterIndex = processCharacterForMapping(
          textChar,
          i,
          cipherLetterIndex,
          cleanCipherText,
          cleanOriginalQuote,
          keyword,
          correctMapping
        );
      }
    }
    return correctMapping;
  };

  const originalQuote = quote.quote.toUpperCase();
  const correctMapping = buildCorrectMapping(text, originalQuote, keyword);

  // Helper function to get input className
  const getInputClassName = (
    isTestSubmitted: boolean,
    isCorrect: boolean,
    darkMode: boolean
  ): string => {
    const baseClasses = "w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
    const darkClasses = darkMode
      ? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
    const stateClasses = isTestSubmitted
      ? isCorrect
        ? "border-green-500 bg-green-100/10"
        : "border-red-500 bg-red-100/10"
      : "";
    return `${baseClasses} ${darkClasses} ${stateClasses}`;
  };

  // Character display component (extracted to reduce complexity)
  const CharacterDisplay = ({
    char,
    i,
    isLetter,
    value,
    correctLetter,
    isCorrect,
    keywordChar,
    quoteIndex,
    isTestSubmitted,
    darkMode,
  }: {
    char: string;
    i: number;
    isLetter: boolean;
    value: string;
    correctLetter: string | undefined;
    isCorrect: boolean;
    keywordChar: string;
    quoteIndex: number;
    isTestSubmitted: boolean;
    darkMode: boolean;
  }) => {
    return (
      <div key={i} className="flex flex-col items-center mx-0.5">
        {isLetter && (
          <span
            className={`text-xs sm:text-sm font-medium mb-1 ${
              darkMode ? "text-blue-400" : "text-blue-600"
            }`}
          >
            {keywordChar}
          </span>
        )}
        {!isLetter && <div className="h-4 sm:h-5 mb-1" />}

        <span className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
          {char}
        </span>
        {isLetter && (
          <div className="relative h-12 sm:h-14">
            <input
              type="text"
              id={`porta-${quoteIndex}-${i}`}
              name={`porta-${quoteIndex}-${i}`}
              maxLength={1}
              disabled={isTestSubmitted}
              value={value}
              onChange={(e) =>
                onSolutionChange(quoteIndex, `${char}-${i}`, e.target.value.toUpperCase())
              }
              autoComplete="off"
              className={getInputClassName(isTestSubmitted, isCorrect, darkMode)}
            />
            {isTestSubmitted && !isCorrect && correctLetter && (
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
      </div>
    );
  };

  const portaTableDisplay = [
    { pair: "AB", row: "NOPQRSTUVWXYZABCDEFGHIJKLM" },
    { pair: "CD", row: "OPQRSTUVWXYZNABCDEFGHIJKLM" },
    { pair: "EF", row: "PQRSTUVWXYZNOABCDEFGHIJKLM" },
    { pair: "GH", row: "QRSTUVWXYZNOPABCDEFGHIJKLM" },
    { pair: "IJ", row: "RSTUVWXYZNOPQABCDEFGHIJKLM" },
    { pair: "KL", row: "STUVWXYZNOPQRABCDEFGHIJKLM" },
    { pair: "MN", row: "TUVWXYZNOPQRSABCDEFGHIJKLM" },
    { pair: "OP", row: "UVWXYZNOPQRSTABCDEFGHIJKLM" },
    { pair: "QR", row: "VWXYZNOPQRSTUABCDEFGHIJKLM" },
    { pair: "ST", row: "WXYZNOPQRSTUVABCDEFGHIJKLM" },
    { pair: "UV", row: "XYZNOPQRSTUVWABCDEFGHIJKLM" },
    { pair: "WX", row: "YZNOPQRSTUVWXABCDEFGHIJKLM" },
    { pair: "YZ", row: "ZNOPQRSTUVWXYABCDEFGHIJKLM" },
  ];

  return (
    <div className="font-mono">
      {/* Keyword display */}
      <div className={`mb-4 p-3 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
        <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Keyword: <span className="font-bold">{keyword}</span>
        </p>
      </div>

      {/* Cipher text with keyword above each letter */}
      <div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap mb-6">
        {(() => {
          const charsWithPositions = text.split("").map((char, i) => ({ char, position: i }));
          return charsWithPositions.map(({ char, position }) => {
            const isLetter = UPPERCASE_LETTER_REGEX.test(char);
            const value = solution?.[`${char}-${position}`] || "";
            const correctLetter = correctMapping[position] ?? undefined;
            const isCorrect = isLetter && value.toUpperCase() === correctLetter;
            const letterCount = text.substring(0, position).replace(/[^A-Z]/g, "").length;
            const keywordChar = isLetter ? (keyword[letterCount % keyword.length] ?? "") : "";

            return (
              <CharacterDisplay
                key={`porta-char-${char}-${position}`}
                char={char}
                i={position}
                isLetter={isLetter}
                value={value}
                correctLetter={correctLetter}
                isCorrect={isCorrect}
                keywordChar={keywordChar}
                quoteIndex={quoteIndex}
                isTestSubmitted={isTestSubmitted}
                darkMode={darkMode}
              />
            );
          });
        })()}
      </div>

      {/* Porta Table - collapsible */}
      <div
        className={`porta-table p-4 rounded ${darkMode ? "bg-gray-800/50" : "bg-gray-100"} hidden md:block`}
      >
        <button
          type="button"
          onClick={() => {
            setHoveredChar(null);
            setShowTable((s: boolean) => !s);
          }}
          className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          aria-expanded={showTable}
          aria-controls="porta-table-content"
        >
          <span>Porta Table</span>
          <span className={`transform transition-transform ${showTable ? "rotate-90" : ""}`}>
            ▸
          </span>
        </button>
        {showTable && (
          <div
            id="porta-table-content"
            className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {portaTableDisplay.map((row, index) => (
              <div
                key={`porta-row-${row.pair}-${index}`}
                className={`p-3 rounded border min-h-[80px] ${
                  darkMode ? "bg-gray-700/30 border-gray-600" : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`text-center font-bold mb-2 text-sm ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {row.pair}
                </div>
                <div
                  className={`text-center text-[10px] leading-tight ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {row.row.split("").map((char, charIndex) => (
                    <span
                      key={`porta-char-${row.pair}-${index}-${charIndex}-${char}`}
                      className="relative inline-block cursor-help hover:bg-blue-100/20 hover:text-blue-600 dark:hover:text-blue-400 px-0.5 rounded transition-colors"
                      onMouseEnter={() => setHoveredChar({ rowIndex: index, charIndex })}
                      onMouseLeave={() => setHoveredChar(null)}
                    >
                      {char}
                      {hoveredChar?.rowIndex === index && hoveredChar?.charIndex === charIndex && (
                        <div
                          className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded shadow-lg z-10 whitespace-nowrap ${
                            darkMode
                              ? "bg-gray-800 text-gray-200 border border-gray-600"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          Index: {charIndex + 1}
                          <div
                            className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${
                              darkMode ? "border-t-gray-800" : "border-t-gray-900"
                            }`}
                          />
                        </div>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show original quote after submission */}
      {isTestSubmitted && (
        <div className={`mt-8 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
          <p className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Original Quote:
          </p>
          <p className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
            {quote.quote}
          </p>
        </div>
      )}
    </div>
  );
};
