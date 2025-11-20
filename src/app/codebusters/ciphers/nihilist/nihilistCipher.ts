/**
 * Nihilist cipher encryption function
 */

import type { NihilistCipherResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import { createPolybiusSquare, letterToCoordinates } from "@/app/codebusters/ciphers/utils/cipherUtils";

/**
 * Encrypts text using Nihilist cipher
 * @param {string} text - Text to encrypt
 * @returns {NihilistCipherResult} Encrypted text and keys
 */
export const encryptNihilist = (text: string): NihilistCipherResult => {
  // Generate random keys
  const polybiusKey = Array.from({ length: 8 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const cipherKey = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  const polybiusSquare = createPolybiusSquare(polybiusKey);

  // Clean text and convert to numbers
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const plaintextNumbers: number[] = [];

  for (const char of cleanText) {
    const coords = letterToCoordinates(char, polybiusSquare);
    plaintextNumbers.push(Number.parseInt(coords));
  }

  // Convert cipher key to numbers
  const keyNumbers: number[] = [];
  for (const char of cipherKey.toUpperCase()) {
    const coords = letterToCoordinates(char, polybiusSquare);
    keyNumbers.push(Number.parseInt(coords));
  }

  // Create running key
  const runningKey: number[] = [];
  for (let i = 0; i < plaintextNumbers.length; i++) {
    const keyIndex = i % keyNumbers.length;
    const keyNum = keyNumbers[keyIndex];
    if (keyNum !== undefined) {
      runningKey.push(keyNum);
    }
  }

  // Encrypt by adding plaintext and key numbers
  const ciphertextNumbers: number[] = [];
  for (let i = 0; i < plaintextNumbers.length; i++) {
    const plainNum = plaintextNumbers[i];
    const runKey = runningKey[i];
    if (plainNum !== undefined && runKey !== undefined) {
      ciphertextNumbers.push(plainNum + runKey);
    }
  }

  // Format output with visual grouping
  const numberString = ciphertextNumbers.map((n) => n.toString().padStart(2, "0")).join(" ");
  const pairs = numberString.split(" ");
  let encrypted = "";

  // New distribution for visual grouping: 0 (20%), 4 (20%), 5 (40%), 6 (20%)
  const roll = Math.random();
  const chosen = roll < 0.2 ? 0 : roll < 0.4 ? 4 : roll < 0.8 ? 5 : 6;

  if (chosen === 0) {
    // Map spaces in original quote to gaps between tokens
    const original = text;
    let pi = 0;
    for (let i = 0; i < original.length && pi < pairs.length; i++) {
      const ch = original[i];
      if (ch && /^[A-Za-z]$/.test(ch)) {
        const pair = pairs[pi];
        if (pair !== undefined) {
          if (encrypted.length > 0 && !encrypted.endsWith(" ")) {
            encrypted += " ";
          }
          encrypted += pair;
          pi++;
        }
      } else if (ch === " ") {
        encrypted += "   ";
      }
    }
    while (pi < pairs.length) {
      if (encrypted.length > 0 && !encrypted.endsWith(" ")) {
        encrypted += " ";
      }
      encrypted += pairs[pi++];
    }
  } else {
    const blocks: string[] = [];
    for (let i = 0; i < pairs.length; i += chosen) {
      blocks.push(pairs.slice(i, i + chosen).join(" "));
    }
    encrypted = blocks.join("   "); // triple-space between blocks
  }

  return { encrypted, polybiusKey, cipherKey };
};
