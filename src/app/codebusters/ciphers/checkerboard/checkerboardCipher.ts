/**
 * Checkerboard cipher encryption function
 */

import type { CheckerboardResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import { createPolybiusSquare, letterToCoordinates } from "@/app/codebusters/ciphers/utils/cipherUtils";

/**
 * Encrypts text using Checkerboard cipher
 * @param {string} text - Text to encrypt
 * @returns {CheckerboardResult} Encrypted text and checkerboard configuration
 */
export const encryptCheckerboard = (text: string): CheckerboardResult => {
  // Generate random keys
  const rowKey = Array.from({ length: 5 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const colKey = Array.from({ length: 5 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const polybiusKeyRaw = Array.from({ length: 8 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  // Create Polybius square
  const polybiusSquare = createPolybiusSquare(polybiusKeyRaw);

  // Clean text
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

  // Convert letters to coordinates
  const positions: Array<{ r: number; c: number }> = [];
  for (const char of cleanText) {
    if (!char) continue;
    const coords = letterToCoordinates(char, polybiusSquare);
    const coord0 = coords[0];
    const coord1 = coords[1];
    if (coord0 === undefined || coord1 === undefined) continue;
    const r = Number.parseInt(coord0) - 1;
    const c = Number.parseInt(coord1) - 1;
    positions.push({ r, c });
  }

  // Convert coordinates to tokens
  const tokens: string[] = [];
  for (const pos of positions) {
    // Row-first token using raw key letters (no I/J merging for labels)
    const r = pos.r !== undefined ? rowKey[pos.r] : undefined;
    const c = pos.c !== undefined ? colKey[pos.c] : undefined;
    if (r !== undefined && c !== undefined) {
      tokens.push(r + c);
    }
  }

  // Determine block size distribution: 20% -> 0, 20% -> 4, 40% -> 5, 20% -> 6
  const roll = Math.random();
  const blockSize = roll < 0.2 ? 0 : roll < 0.4 ? 4 : roll < 0.8 ? 5 : 6;
  let encrypted = "";

  if (blockSize === 0) {
    // Map spaces in original quote to gaps between tokens
    const original = text;
    let ti = 0;
    for (let i = 0; i < original.length && ti < tokens.length; i++) {
      const ch = original[i];
      if (ch && /^[A-Za-z]$/.test(ch)) {
        if (encrypted.length > 0 && !encrypted.endsWith(" ")) {
          encrypted += " ";
        }
        const token = tokens[ti];
        if (token !== undefined) {
          encrypted += token;
          ti++;
        }
      } else if (ch === " ") {
        if (!encrypted.endsWith("   ")) {
          encrypted += "   ";
        }
      }
    }
    while (ti < tokens.length) {
      if (encrypted.length > 0 && !encrypted.endsWith(" ")) {
        encrypted += " ";
      }
      encrypted += tokens[ti++];
    }
  } else {
    const grouped: string[] = [];
    for (let i = 0; i < tokens.length; i += blockSize) {
      grouped.push(tokens.slice(i, i + blockSize).join(" "));
    }
    encrypted = grouped.join("   "); // triple-space between blocks for clarity
  }

  return {
    encrypted,
    checkerboardRowKey: rowKey,
    checkerboardColKey: colKey,
    checkerboardPolybiusKey: polybiusKeyRaw,
    checkerboardUsesIJ: true,
    blockSize,
  };
};
