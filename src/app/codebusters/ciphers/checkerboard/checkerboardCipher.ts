/**
 * Checkerboard cipher encryption function
 */

import type { CheckerboardResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import {
  createPolybiusSquare,
  letterToCoordinates,
} from "@/app/codebusters/ciphers/utils/cipherUtils";
import { getUniqueWords, pickWord } from "@/app/codebusters/ciphers/transposition/utils/wordBank";

// Regex for matching single letters (A-Z, a-z)
const SINGLE_LETTER_REGEX = /^[A-Za-z]$/;

// Helper function to generate random key
function generateRandomKey(length: number): string {
  return Array.from({ length }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
}

// Helper function to get 5-letter words from word bank
function getFiveLetterWords(): string[] {
  const uniqueWords = getUniqueWords();
  return uniqueWords.filter((word) => word.length === 5);
}

// Helper function to pick two different 5-letter words for row and column keys
function pickRowAndColumnKeys(): { rowKey: string; colKey: string } {
  const fiveLetterWords = getFiveLetterWords();
  
  // Fallback to random keys if no 5-letter words available
  if (fiveLetterWords.length === 0) {
    return {
      rowKey: generateRandomKey(5),
      colKey: generateRandomKey(5),
    };
  }
  
  // Pick first word
  const rowKey = pickWord(fiveLetterWords);
  
  // Pick second word, excluding the first one
  const excludeSet = new Set([rowKey]);
  const colKey = pickWord(fiveLetterWords, excludeSet);
  
  return { rowKey, colKey };
}

// Helper function to convert text to positions
function textToPositions(
  cleanText: string,
  polybiusSquare: ReturnType<typeof createPolybiusSquare>
): Array<{ r: number; c: number }> {
  const positions: Array<{ r: number; c: number }> = [];
  for (const char of cleanText) {
    if (!char) {
      continue;
    }
    const coords = letterToCoordinates(char, polybiusSquare);
    const coord0 = coords[0];
    const coord1 = coords[1];
    if (coord0 === undefined || coord1 === undefined) {
      continue;
    }
    const r = Number.parseInt(coord0) - 1;
    const c = Number.parseInt(coord1) - 1;
    positions.push({ r, c });
  }
  return positions;
}

// Helper function to convert positions to tokens
function positionsToTokens(
  positions: Array<{ r: number; c: number }>,
  rowKey: string,
  colKey: string
): string[] {
  const tokens: string[] = [];
  for (const pos of positions) {
    const r = pos.r !== undefined ? rowKey[pos.r] : undefined;
    const c = pos.c !== undefined ? colKey[pos.c] : undefined;
    if (r !== undefined && c !== undefined) {
      tokens.push(r + c);
    }
  }
  return tokens;
}

// Helper function to determine block size
function determineBlockSize(): number {
  const roll = Math.random();
  return roll < 0.2 ? 0 : roll < 0.4 ? 4 : roll < 0.8 ? 5 : 6;
}

// Helper function to process a letter character
function processLetter(
  encrypted: string,
  tokens: string[],
  tokenIndex: number
): { encrypted: string; tokenIndex: number } {
  let result = encrypted;
  if (result.length > 0 && !result.endsWith(" ")) {
    result += " ";
  }
  const token = tokens[tokenIndex];
  if (token !== undefined) {
    result += token;
    return { encrypted: result, tokenIndex: tokenIndex + 1 };
  }
  return { encrypted: result, tokenIndex };
}

// Helper function to process a space character
function processSpace(encrypted: string): string {
  if (!encrypted.endsWith("   ")) {
    return `${encrypted}   `;
  }
  return encrypted;
}

// Helper function to add remaining tokens
function addRemainingTokens(encrypted: string, tokens: string[], startIndex: number): string {
  let result = encrypted;
  for (let i = startIndex; i < tokens.length; i++) {
    if (result.length > 0 && !result.endsWith(" ")) {
      result += " ";
    }
    result += tokens[i];
  }
  return result;
}

// Helper function to encrypt with block size 0 (preserve spaces)
function encryptWithNoBlocking(tokens: string[], originalText: string): string {
  let encrypted = "";
  let ti = 0;
  for (let i = 0; i < originalText.length && ti < tokens.length; i++) {
    const ch = originalText[i];
    if (ch && SINGLE_LETTER_REGEX.test(ch)) {
      const processed = processLetter(encrypted, tokens, ti);
      encrypted = processed.encrypted;
      ti = processed.tokenIndex;
    } else if (ch === " ") {
      encrypted = processSpace(encrypted);
    }
  }
  return addRemainingTokens(encrypted, tokens, ti);
}

// Helper function to encrypt with blocking
function encryptWithBlocking(tokens: string[], blockSize: number): string {
  const grouped: string[] = [];
  for (let i = 0; i < tokens.length; i += blockSize) {
    grouped.push(tokens.slice(i, i + blockSize).join(" "));
  }
  return grouped.join("   "); // triple-space between blocks for clarity
}

/**
 * Encrypts text using Checkerboard cipher
 * @param {string} text - Text to encrypt
 * @returns {CheckerboardResult} Encrypted text and checkerboard configuration
 */
export const encryptCheckerboard = (text: string): CheckerboardResult => {
  // Pick 5-letter words from word bank for row and column keys
  const { rowKey, colKey } = pickRowAndColumnKeys();
  // Generate random key for polybius (8 characters)
  const polybiusKeyRaw = generateRandomKey(8);

  // Create Polybius square
  const polybiusSquare = createPolybiusSquare(polybiusKeyRaw);

  // Clean text
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

  // Convert letters to coordinates
  const positions = textToPositions(cleanText, polybiusSquare);

  // Convert coordinates to tokens
  const tokens = positionsToTokens(positions, rowKey, colKey);

  // Determine block size distribution: 20% -> 0, 20% -> 4, 40% -> 5, 20% -> 6
  const blockSize = determineBlockSize();

  // Encrypt based on block size
  const encrypted =
    blockSize === 0 ? encryptWithNoBlocking(tokens, text) : encryptWithBlocking(tokens, blockSize);

  return {
    encrypted,
    checkerboardRowKey: rowKey,
    checkerboardColKey: colKey,
    checkerboardPolybiusKey: polybiusKeyRaw,
    checkerboardUsesIJ: true,
    blockSize,
  };
};
