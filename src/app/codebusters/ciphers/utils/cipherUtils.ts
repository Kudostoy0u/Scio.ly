/**
 * Utility functions for cipher operations
 */

/**
 * Performs modulo 26 operation for letter arithmetic
 * @param {number} n - Number to perform modulo on
 * @returns {number} Result of (n mod 26) always positive
 */
export const mod26 = (n: number): number => ((n % 26) + 26) % 26;

/**
 * Converts a letter to its numeric position (A=0, B=1, ..., Z=25, Ñ=26)
 * @param {string} letter - Letter to convert
 * @returns {number} Numeric position of the letter
 */
export const letterToNumber = (letter: string): number => {
  const upperLetter = letter.toUpperCase();
  if (upperLetter === "Ñ") {
    return 26; // ñ is position 26 (after z)
  }
  return upperLetter.charCodeAt(0) - 65;
};

/**
 * Converts a numeric position to its letter (0=A, 1=B, ..., 25=Z, 26=Ñ)
 * @param {number} num - Numeric position to convert
 * @returns {string} Letter corresponding to the position
 */
export const numberToLetter = (num: number): string => {
  if (num === 26) {
    return "Ñ"; // ñ is position 26
  }
  return String.fromCharCode(mod26(num) + 65);
};

/**
 * Formats seconds as MM:SS time string
 * @param {number} seconds - Total seconds to format
 * @returns {string} Formatted time string (e.g., "5:03")
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
};

// Helper function to map J to I
const mapIj = (ch: string) => (ch === "J" ? "I" : ch);

// Helper function to build sequence from key
function buildSequenceFromKey(key: string, used: Set<string>, seq: string[]): void {
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  for (const c0 of k) {
    const c = mapIj(c0);
    if (c !== "J" && !used.has(c)) {
      used.add(c);
      seq.push(c);
    }
    if (seq.length >= 25) {
      break;
    }
  }
}

// Helper function to build sequence from alphabet
function buildSequenceFromAlphabet(used: Set<string>, seq: string[]): void {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const c0 of alphabet) {
    const c = mapIj(c0);
    if (c === "J") {
      continue;
    }
    if (!used.has(c)) {
      used.add(c);
      seq.push(c);
    }
    if (seq.length >= 25) {
      break;
    }
  }
}

// Helper function to populate square from sequence
function populateSquare(seq: string[]): string[][] {
  const square: string[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
  let kIdx = 0;
  for (let i = 0; i < 5; i++) {
    const row = square[i];
    if (!row) {
      continue;
    }
    for (let j = 0; j < 5; j++) {
      const seqVal = seq[kIdx];
      row[j] = seqVal !== undefined ? seqVal : "";
      kIdx++;
    }
  }
  return square;
}

/**
 * Creates a Polybius square from a key
 * @param {string} key - Key to use for creating the square
 * @returns {string[][]} 5x5 Polybius square
 */
export const createPolybiusSquare = (key: string): string[][] => {
  const used = new Set<string>();
  const seq: string[] = [];

  buildSequenceFromKey(key, used, seq);
  buildSequenceFromAlphabet(used, seq);

  return populateSquare(seq);
};

/**
 * Converts a letter to its coordinates in a Polybius square
 * @param {string} letter - Letter to find coordinates for
 * @param {string[][]} square - Polybius square
 * @returns {string} Coordinates as string (e.g., "12")
 */
export const letterToCoordinates = (letter: string, square: string[][]): string => {
  const L = letter === "J" ? "I" : letter;
  for (let i = 0; i < 5; i++) {
    const row = square[i];
    if (!row) {
      continue;
    }
    for (let j = 0; j < 5; j++) {
      if (row[j] === L) {
        return `${i + 1}${j + 1}`;
      }
    }
  }
  return "00";
};

/**
 * Shuffles an array in place
 * @param {T[]} arr - Array to shuffle
 * @returns {T[]} Shuffled array
 */
export const shuffleArray = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    const swapVal = a[j];
    if (temp !== undefined && swapVal !== undefined) {
      a[i] = swapVal;
      a[j] = temp;
    }
  }
  return a;
};
