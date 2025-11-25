/**
 * Transposition cipher encryption functions
 */

import type {
  ColumnarTranspositionResult,
  CryptarithmResult,
} from "@/app/codebusters/ciphers/types/cipherTypes";
import { FALLBACK_WORDS, getCustomWordBank } from "@/app/codebusters/utils/common";

// Top-level regex for uppercase letter matching
const UPPERCASE_LETTER_REGEX = /^[A-Z]$/;

// Helper function to create transposition matrix
const createTranspositionMatrix = (cleanText: string, keyLength: number): string[][] => {
  const matrix: string[][] = [];
  const numRows = Math.ceil(cleanText.length / keyLength);
  for (let i = 0; i < numRows; i++) {
    const row: string[] = [];
    for (let j = 0; j < keyLength; j++) {
      const index = i * keyLength + j;
      const char = index < cleanText.length ? cleanText[index] : undefined;
      row[j] = char !== undefined ? char : "X";
    }
    matrix[i] = row;
  }
  return matrix;
};

// Helper function to get key order (sorted indices)
const getKeyOrder = (key: string): number[] => {
  const keyArray = key.split("");
  return keyArray
    .map((char, index) => ({ char, index }))
    .sort((a, b) => a.char.localeCompare(b.char))
    .map((item) => item.index);
};

// Helper function to encrypt using matrix and key order
const encryptWithMatrix = (matrix: string[][], keyOrder: number[]): string => {
  let encrypted = "";
  for (const colIndex of keyOrder) {
    if (colIndex === undefined) {
      continue;
    }
    for (const row of matrix) {
      const char = row[colIndex];
      if (char !== undefined) {
        encrypted += char;
      }
    }
  }
  return encrypted;
};

/**
 * Encrypts text using Columnar Transposition cipher
 * @param {string} text - Text to encrypt
 * @returns {ColumnarTranspositionResult} Encrypted text and key
 */
export const encryptColumnarTransposition = (text: string): ColumnarTranspositionResult => {
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters

  const key = Array.from({ length: keyLength }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const matrix = createTranspositionMatrix(cleanText, keyLength);
  const keyOrder = getKeyOrder(key);
  const encrypted = encryptWithMatrix(matrix, keyOrder);

  return { encrypted, key };
};

/**
 * Encrypts text using Cryptarithm cipher
 * @param {string} text - Text to encrypt
 * @returns {CryptarithmResult} Encrypted text and cryptarithm data
 */
export const encryptCryptarithm = (_text: string): CryptarithmResult => {
  const custom = getCustomWordBank();
  const wordBank = (custom && custom.length > 0 ? custom : FALLBACK_WORDS).map((w) =>
    w.toUpperCase()
  );

  // Expanded word bank for better variety
  const expandedWords = [
    "SEND",
    "MORE",
    "MONEY",
    "EAT",
    "THAT",
    "APPLE",
    "HEAT",
    "PLATE",
    "THE",
    "WORD",
    "CODE",
    "CIPHER",
    "SECRET",
    "PUZZLE",
    "SOLVE",
    "BRAIN",
    "LOGIC",
    "MATH",
    "NUMBER",
    "DIGIT",
    "LETTER",
    "ALPHA",
    "BETA",
    "GAMMA",
    "DELTA",
    "ALPHA",
    "OMEGA",
    "PI",
    "SIGMA",
    "THETA",
    "LAMBDA",
    "PHI",
    "PSI",
    "RHO",
    "STAR",
    "MOON",
    "SUN",
    "EARTH",
    "MARS",
    "VENUS",
    "JUPITER",
    "SATURN",
    "BOOK",
    "PAGE",
    "STORY",
    "TALE",
    "NOVEL",
    "POEM",
    "VERSE",
    "SONG",
    "MUSIC",
    "SOUND",
    "VOICE",
    "TONE",
    "NOTE",
    "CHORD",
    "SCALE",
    "MELODY",
    "DANCE",
    "MOVE",
    "STEP",
    "JUMP",
    "RUN",
    "WALK",
    "RACE",
    "SPEED",
    "FAST",
    "SLOW",
    "QUICK",
    "RAPID",
    "SWIFT",
    "FLEET",
    "AGILE",
    "NIMBLE",
    "STRONG",
    "POWER",
    "FORCE",
    "MIGHT",
    "ENERGY",
    "VIGOR",
    "STRENGTH",
    "MUSCLE",
    "WATER",
    "OCEAN",
    "RIVER",
    "LAKE",
    "STREAM",
    "WAVE",
    "TIDE",
    "CURRENT",
    "FIRE",
    "FLAME",
    "HEAT",
    "BURN",
    "SPARK",
    "GLOW",
    "LIGHT",
    "BRIGHT",
    "DARK",
    "NIGHT",
    "SHADE",
    "SHADOW",
    "BLACK",
    "DEEP",
    "DUSK",
    "DAWN",
    "TIME",
    "HOUR",
    "MINUTE",
    "SECOND",
    "CLOCK",
    "WATCH",
    "TIMER",
    "ALARM",
    "SPACE",
    "STAR",
    "PLANET",
    "GALAXY",
    "UNIVERSE",
    "COSMOS",
    "VOID",
    "EMPTY",
    "SOLID",
    "LIQUID",
    "GAS",
    "MATTER",
    "ATOM",
    "PARTICLE",
    "MOLECULE",
    "ELEMENT",
  ];

  // Combine word banks and filter to valid words (2-6 letters, all uppercase)
  const allWords = [...wordBank, ...expandedWords]
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2 && w.length <= 6);

  // Remove duplicates
  const uniqueWords = Array.from(new Set(allWords));

  const pickWord = (exclude: Set<string> = new Set()): string => {
    const available = uniqueWords.filter((w) => !exclude.has(w));
    if (available.length === 0) {
      return uniqueWords[Math.floor(Math.random() * uniqueWords.length)] || "WORD";
    }
    const index = Math.floor(Math.random() * available.length);
    return available[index] || "WORD";
  };

  const toUniqueLetters = (w: string): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ch of w) {
      if (UPPERCASE_LETTER_REGEX.test(ch) && !seen.has(ch)) {
        seen.add(ch);
        out.push(ch);
      }
    }
    return out;
  };

  // Helper function to assign non-zero digits to leading letters
  const assignLeadingLetters = (
    leadingLetters: Set<string>,
    shuffled: number[],
    mapping: Record<string, number>
  ): { usedIndex: number; success: boolean } => {
    let usedIndex = 0;
    for (const lead of Array.from(leadingLetters)) {
      let idx = usedIndex;
      while (idx < shuffled.length && shuffled[idx] === 0) {
        idx++;
      }
      if (idx >= shuffled.length) {
        return { usedIndex, success: false };
      }
      const shuffledIdx = shuffled[idx];
      const shuffledUsed = shuffled[usedIndex];
      if (shuffledIdx === undefined || shuffledUsed === undefined) {
        return { usedIndex, success: false };
      }
      mapping[lead] = shuffledIdx;
      shuffled[usedIndex] = shuffledIdx;
      shuffled[idx] = shuffledUsed;
      usedIndex++;
    }
    return { usedIndex, success: true };
  };

  // Helper function to assign remaining digits to other letters
  const assignRemainingLetters = (
    letters: string[],
    shuffled: number[],
    mapping: Record<string, number>,
    startIndex: number
  ): boolean => {
    let usedIndex = startIndex;
    for (const letter of letters) {
      if (mapping[letter] !== undefined) {
        continue;
      }
      if (usedIndex >= shuffled.length) {
        return false;
      }
      const shuffledVal = shuffled[usedIndex];
      if (shuffledVal === undefined) {
        return false;
      }
      mapping[letter] = shuffledVal;
      usedIndex++;
    }
    return true;
  };

  const assignLetterDigits = (
    letters: string[],
    leadingLetters: Set<string>
  ): Record<string, number> | null => {
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = [...digits].sort(() => Math.random() - 0.5);
    const mapping: Record<string, number> = {};

    const leadingResult = assignLeadingLetters(leadingLetters, shuffled, mapping);
    if (!leadingResult.success) {
      return null;
    }

    const remainingSuccess = assignRemainingLetters(
      letters,
      shuffled,
      mapping,
      leadingResult.usedIndex
    );
    if (!remainingSuccess) {
      return null;
    }

    return mapping;
  };

  // Helper function to find valid words from word bank
  const findValidWordsFromBank = (
    availableSet: Set<string>,
    uniqueWords: string[],
    numWords: number,
    usedWords: Set<string>
  ): string[] => {
    const solutionWords: string[] = [];
    const validWords = uniqueWords.filter((word) => {
      const wordLetters = word.split("");
      return wordLetters.every((letter) => availableSet.has(letter));
    });
    const shuffledValidWords = [...validWords].sort(() => Math.random() - 0.5);

    for (const candidate of shuffledValidWords) {
      if (solutionWords.length >= numWords) {
        break;
      }
      if (candidate && !usedWords.has(candidate) && candidate.length >= 2) {
        const candidateLetters = candidate.split("");
        if (candidateLetters.every((letter) => availableSet.has(letter))) {
          solutionWords.push(candidate);
          usedWords.add(candidate);
        }
      }
    }
    return solutionWords;
  };

  // Helper function to generate words from available letters
  const generateWordsFromLetters = (
    availableLetters: string[],
    numWords: number,
    usedWords: Set<string>
  ): string[] => {
    const solutionWords: string[] = [];
    const remaining = numWords;
    for (let i = 0; i < remaining && solutionWords.length < numWords; i++) {
      const wordLength = Math.floor(Math.random() * 3) + 2; // 2-4 letters
      const shuffledLetters = [...availableLetters].sort(() => Math.random() - 0.5);
      const generatedWord = shuffledLetters.slice(0, wordLength).join("");
      if (generatedWord && !usedWords.has(generatedWord) && generatedWord.length >= 2) {
        solutionWords.push(generatedWord);
        usedWords.add(generatedWord);
      }
    }
    return solutionWords;
  };

  // Generate solution words using only letters from the equation
  const generateSolutionWords = (
    availableLetters: string[],
    _mapping: Record<string, number>,
    numWords: number
  ): string[] => {
    const usedWords = new Set<string>();
    const availableSet = new Set(availableLetters);

    const wordsFromBank = findValidWordsFromBank(availableSet, uniqueWords, numWords, usedWords);
    const solutionWords = [...wordsFromBank];

    if (solutionWords.length < numWords) {
      const generatedWords = generateWordsFromLetters(availableLetters, numWords, usedWords);
      solutionWords.push(...generatedWords);
    }

    return solutionWords.length >= 3 ? solutionWords.slice(0, numWords) : solutionWords;
  };

  // Helper function to validate words
  const validateWords = (w1: string, w2: string, w3: string): boolean => {
    if (w1 === w2 || w1 === w3 || w2 === w3) {
      return false;
    }
    if (w1.length < 2 || w2.length < 2 || w3.length < 2) {
      return false;
    }
    if (w1.length > 6 || w2.length > 6 || w3.length > 6) {
      return false;
    }
    const allLetters = toUniqueLetters(w1 + w2 + w3);
    return allLetters.length <= 10;
  };

  // Helper function to create leading letters set
  const createLeadingLetters = (w1: string, w2: string, w3: string): Set<string> => {
    const leadingLetters = new Set<string>();
    const w1First = w1[0];
    const w2First = w2[0];
    const w3First = w3[0];
    if (w1First !== undefined) {
      leadingLetters.add(w1First);
    }
    if (w2First !== undefined) {
      leadingLetters.add(w2First);
    }
    if (w3First !== undefined) {
      leadingLetters.add(w3First);
    }
    return leadingLetters;
  };

  // Helper function to convert word to number using mapping
  const wordToNumber = (word: string, mapping: Record<string, number>): number => {
    let num = 0;
    for (const ch of word) {
      const mapped = mapping[ch];
      if (mapped === undefined) {
        throw new Error(`No mapping found for character: ${ch}`);
      }
      num = num * 10 + mapped;
    }
    return num;
  };

  // Helper function to create digit groups from solution words
  const createDigitGroups = (
    solutionWords: string[],
    toNumber: (word: string) => number
  ): Array<{ digits: string; word: string }> => {
    return solutionWords.map((word) => {
      const num = toNumber(word);
      return {
        digits: num.toString().split("").join(" "),
        word: word,
      };
    });
  };

  // Helper function to try generating an equation for given words
  const tryGenerateEquation = (
    w1: string,
    w2: string,
    w3: string,
    operation: "+" | "-"
  ): {
    equation: string;
    numericExample: string;
    digitGroups: Array<{ digits: string; word: string }>;
    operation: "+" | "-";
  } | null => {
    if (!validateWords(w1, w2, w3)) {
      return null;
    }

    const allLetters = toUniqueLetters(w1 + w2 + w3);
    const leadingLetters = createLeadingLetters(w1, w2, w3);
    const mapping = assignLetterDigits(allLetters, leadingLetters);
    if (!mapping) {
      return null;
    }

    const toNumber = (word: string): number => wordToNumber(word, mapping);
    const n1 = toNumber(w1);
    const n2 = toNumber(w2);
    const n3 = toNumber(w3);

    let equation: string | null = null;
    let numericExample: string | null = null;
    let op: "+" | "-" = "+";

    if (operation === "-" && n1 > n2 && n1 - n2 === n3) {
      equation = `${w1} - ${w2} = ${w3}`;
      numericExample = `${n1} - ${n2} = ${n3}`;
      op = "-";
    } else if (operation === "+" && n1 + n2 === n3) {
      equation = `${w1} + ${w2} = ${w3}`;
      numericExample = `${n1} + ${n2} = ${n3}`;
      op = "+";
    }

    if (!(equation && numericExample)) {
      return null;
    }

    const numSolutionWords = Math.floor(Math.random() * 3) + 3;
    const solutionWords = generateSolutionWords(allLetters, mapping, numSolutionWords);
    if (solutionWords.length < 3) {
      return null;
    }

    const digitGroups = createDigitGroups(solutionWords, toNumber);
    return { equation, numericExample, digitGroups, operation: op };
  };

  // Helper function to attempt generating cryptarithm with multiple tries
  const attemptGenerateCryptarithm = (
    operation: "+" | "-",
    maxAttempts: number
  ): {
    equation: string;
    numericExample: string;
    digitGroups: Array<{ digits: string; word: string }>;
    operation: "+" | "-";
  } | null => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const w1 = pickWord();
      const w2 = pickWord(new Set([w1]));
      const w3 = pickWord(new Set([w1, w2]));

      const result = tryGenerateEquation(w1, w2, w3, operation);
      if (result) {
        return result;
      }
    }
    return null;
  };

  // Helper function to generate fallback cryptarithm
  const generateFallbackCryptarithm = (): {
    equation: string;
    numericExample: string;
    digitGroups: Array<{ digits: string; word: string }>;
    operation: "+";
  } => {
    const fallbackWords = [
      { w1: "SEND", w2: "MORE", w3: "MONEY", n1: 9567, n2: 1085, n3: 10652 },
      { w1: "EAT", w2: "THAT", w3: "APPLE", n1: 819, n2: 9219, n3: 10038 },
      { w1: "HEAT", w2: "THE", w3: "PLATE", n1: 2819, n2: 928, n3: 3747 },
      { w1: "WORD", w2: "CODE", w3: "CIPHER", n1: 7423, n2: 4631, n3: 12054 },
      { w1: "SOLVE", w2: "PUZZLE", w3: "BRAIN", n1: 58421, n2: 799421, n3: 857842 },
    ];

    const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    if (!fallback) {
      throw new Error("Failed to generate cryptarithm");
    }

    const fallbackLetters = toUniqueLetters(fallback.w1 + fallback.w2 + fallback.w3);
    const fallbackMapping: Record<string, number> = {};

    const extractMapping = (word: string, num: number): void => {
      const numStr = num.toString();
      for (let i = 0; i < word.length && i < numStr.length; i++) {
        const letter = word[i];
        const digit = Number.parseInt(numStr[i] || "0", 10);
        if (letter !== undefined) {
          fallbackMapping[letter] = digit;
        }
      }
    };

    extractMapping(fallback.w1, fallback.n1);
    extractMapping(fallback.w2, fallback.n2);
    extractMapping(fallback.w3, fallback.n3);

    const fallbackToNumber = (word: string): number => {
      let num = 0;
      for (const ch of word) {
        const mapped = fallbackMapping[ch];
        if (mapped !== undefined) {
          num = num * 10 + mapped;
        } else {
          num = num * 10 + (ch.charCodeAt(0) % 10);
        }
      }
      return num;
    };

    const numSolutionWords = Math.floor(Math.random() * 3) + 3;
    const fallbackSolutionWords = generateSolutionWords(
      fallbackLetters,
      fallbackMapping,
      numSolutionWords
    );

    const solutionWords =
      fallbackSolutionWords.length >= 3
        ? fallbackSolutionWords
        : [fallback.w1, fallback.w2, fallback.w3];

    const digitGroups = createDigitGroups(solutionWords, fallbackToNumber);

    return {
      equation: `${fallback.w1} + ${fallback.w2} = ${fallback.w3}`,
      numericExample: `${fallback.n1} + ${fallback.n2} = ${fallback.n3}`,
      digitGroups,
      operation: "+",
    };
  };

  const generateCryptarithm = (): {
    equation: string;
    numericExample: string | null;
    digitGroups: Array<{ digits: string; word: string }>;
    operation: "+" | "-";
  } => {
    const isSubtraction = Math.random() < 0.5;
    const attempts = 200;

    const result = attemptGenerateCryptarithm(isSubtraction ? "-" : "+", attempts);
    if (result) {
      return result;
    }

    if (isSubtraction) {
      const additionResult = attemptGenerateCryptarithm("+", attempts);
      if (additionResult) {
        return additionResult;
      }
    }

    return generateFallbackCryptarithm();
  };

  const cryptarithmData = generateCryptarithm();
  const encrypted = cryptarithmData.equation;

  return { encrypted, cryptarithmData };
};
