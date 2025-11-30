/**
 * Fractionated Morse cipher encryption function
 */

import type { FractionatedMorseResult } from "@/app/codebusters/ciphers/types/cipherTypes";

/**
 * Encrypts text using Fractionated Morse cipher
 * @param {string} text - Text to encrypt
 * @returns {FractionatedMorseResult} Encrypted text, key, and fractionation table
 */
export const encryptFractionatedMorse = (text: string): FractionatedMorseResult => {
  // Morse code mapping
  const morseCode: Record<string, string> = {
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
  } as Record<string, string>;

  // Generate random key
  const key = Array.from({ length: 26 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");

  // Create fractionation table: triplet -> letter
  const fractionationTable: { [key: string]: string } = {};
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const letter of alphabet) {
    if (letter) {
      const morse = morseCode[letter];
      if (morse !== undefined) {
        // Pad morse to 3 characters with X
        const paddedMorse = morse.padEnd(3, "X");
        // Store as triplet -> letter (matching display/grading expectations)
        fractionationTable[paddedMorse] = letter;
      }
    }
  }

  // Clean text
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

  // Convert to morse
  let morseString = "";
  for (const char of cleanText) {
    morseString += morseCode[char] || "";
  }

  // Pad to multiple of 3
  while (morseString.length % 3 !== 0) {
    morseString += "X";
  }

  // Group into triplets and convert back to letters
  let encrypted = "";
  for (let i = 0; i < morseString.length; i += 3) {
    const triplet = morseString.slice(i, i + 3);
    // Look up letter directly from triplet
    const letter = fractionationTable[triplet];
    if (letter) {
        encrypted += letter;
    }
  }

  return { encrypted, key, fractionationTable };
};
