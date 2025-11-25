/**
 * Hill cipher encryption functions
 */

import type { HillCipherResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import { mod26 } from "@/app/codebusters/ciphers/utils/cipherUtils";

// Helper function to generate a valid 2x2 matrix
function generate2x2Matrix(): number[][] {
  let matrix: number[][];
  let det: number;
  do {
    matrix = [
      [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)],
      [Math.floor(Math.random() * 26), Math.floor(Math.random() * 26)],
    ];
    const m00 = matrix[0]?.[0];
    const m01 = matrix[0]?.[1];
    const m10 = matrix[1]?.[0];
    const m11 = matrix[1]?.[1];
    if (m00 === undefined || m01 === undefined || m10 === undefined || m11 === undefined) {
      throw new Error("Invalid matrix for Hill cipher");
    }
    det = mod26(m00 * m11 - m01 * m10);
  } while (det === 0 || gcd(det, 26) !== 1);
  return matrix;
}

// Helper function to calculate 2x2 decryption matrix
function calculate2x2DecryptionMatrix(matrix: number[][], det: number): number[][] {
  const detInv = modInverse(det, 26);
  const m00 = matrix[0]?.[0] ?? 0;
  const m01 = matrix[0]?.[1] ?? 0;
  const m10 = matrix[1]?.[0] ?? 0;
  const m11 = matrix[1]?.[1] ?? 0;
  return [
    [mod26(m11 * detInv), mod26(-m01 * detInv)],
    [mod26(-m10 * detInv), mod26(m00 * detInv)],
  ];
}

// Helper function to encrypt text pairs with 2x2 matrix
function encryptPairs2x2(text: string, matrix: number[][]): string {
  let encrypted = "";
  for (let i = 0; i < text.length; i += 2) {
    const char0 = text.charCodeAt(i);
    const char1 = text.charCodeAt(i + 1);
    if (char0 === undefined || char1 === undefined) {
      break;
    }
    const pair = [char0 - 65, char1 - 65];
    const p0 = pair[0];
    const p1 = pair[1];
    if (p0 === undefined || p1 === undefined) {
      break;
    }
    const m00 = matrix[0]?.[0] ?? 0;
    const m01 = matrix[0]?.[1] ?? 0;
    const m10 = matrix[1]?.[0] ?? 0;
    const m11 = matrix[1]?.[1] ?? 0;
    const encryptedPair = [mod26(m00 * p0 + m01 * p1), mod26(m10 * p0 + m11 * p1)];

    const ep0 = encryptedPair[0];
    const ep1 = encryptedPair[1];
    if (ep0 !== undefined && ep1 !== undefined) {
      encrypted += String.fromCharCode(ep0 + 65) + String.fromCharCode(ep1 + 65);
    }
  }
  return encrypted;
}

/**
 * Encrypts text using a 2x2 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill2x2 = (text: string): HillCipherResult => {
  const matrix = generate2x2Matrix();
  const m00 = matrix[0]?.[0] ?? 0;
  const m01 = matrix[0]?.[1] ?? 0;
  const m10 = matrix[1]?.[0] ?? 0;
  const m11 = matrix[1]?.[1] ?? 0;
  const det = mod26(m00 * m11 - m01 * m10);
  const decryptionMatrix = calculate2x2DecryptionMatrix(matrix, det);

  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const paddedText = cleanText.length % 2 === 1 ? `${cleanText}X` : cleanText;
  const encrypted = encryptPairs2x2(paddedText, matrix);

  return { encrypted, matrix, decryptionMatrix };
};

// Helper function to calculate 3x3 determinant
function calculate3x3Determinant(matrix: number[][]): number {
  const m00 = matrix[0]?.[0] ?? 0;
  const m01 = matrix[0]?.[1] ?? 0;
  const m02 = matrix[0]?.[2] ?? 0;
  const m10 = matrix[1]?.[0] ?? 0;
  const m11 = matrix[1]?.[1] ?? 0;
  const m12 = matrix[1]?.[2] ?? 0;
  const m20 = matrix[2]?.[0] ?? 0;
  const m21 = matrix[2]?.[1] ?? 0;
  const m22 = matrix[2]?.[2] ?? 0;
  return mod26(
    m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20)
  );
}

// Helper function to generate a valid 3x3 matrix
function generate3x3Matrix(): number[][] {
  let matrix: number[][];
  let det: number;
  do {
    matrix = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => Math.floor(Math.random() * 26))
    );
    det = calculate3x3Determinant(matrix);
  } while (det === 0 || gcd(det, 26) !== 1);
  return matrix;
}

// Helper function to calculate 3x3 decryption matrix (adjugate)
function calculate3x3DecryptionMatrix(matrix: number[][], det: number): number[][] {
  const detInv = modInverse(det, 26);
  const m00 = matrix[0]?.[0] ?? 0;
  const m01 = matrix[0]?.[1] ?? 0;
  const m02 = matrix[0]?.[2] ?? 0;
  const m10 = matrix[1]?.[0] ?? 0;
  const m11 = matrix[1]?.[1] ?? 0;
  const m12 = matrix[1]?.[2] ?? 0;
  const m20 = matrix[2]?.[0] ?? 0;
  const m21 = matrix[2]?.[1] ?? 0;
  const m22 = matrix[2]?.[2] ?? 0;
  return [
    [
      mod26((m11 * m22 - m12 * m21) * detInv),
      mod26((m02 * m21 - m01 * m22) * detInv),
      mod26((m01 * m12 - m02 * m11) * detInv),
    ],
    [
      mod26((m12 * m20 - m10 * m22) * detInv),
      mod26((m00 * m22 - m02 * m20) * detInv),
      mod26((m02 * m10 - m00 * m12) * detInv),
    ],
    [
      mod26((m10 * m21 - m11 * m20) * detInv),
      mod26((m01 * m20 - m00 * m21) * detInv),
      mod26((m00 * m11 - m01 * m10) * detInv),
    ],
  ];
}

// Helper function to get matrix element safely
function getMatrixElement(matrix: number[][], row: number, col: number): number {
  return matrix[row]?.[col] ?? 0;
}

// Helper function to extract matrix elements
function extractMatrixElements(matrix: number[][]) {
  return {
    m00: getMatrixElement(matrix, 0, 0),
    m01: getMatrixElement(matrix, 0, 1),
    m02: getMatrixElement(matrix, 0, 2),
    m10: getMatrixElement(matrix, 1, 0),
    m11: getMatrixElement(matrix, 1, 1),
    m12: getMatrixElement(matrix, 1, 2),
    m20: getMatrixElement(matrix, 2, 0),
    m21: getMatrixElement(matrix, 2, 1),
    m22: getMatrixElement(matrix, 2, 2),
  };
}

// Helper function to process a triplet
function processTriplet(
  char0: number,
  char1: number,
  char2: number,
  m: ReturnType<typeof extractMatrixElements>
): string {
  const triplet = [char0 - 65, char1 - 65, char2 - 65];
  const t0 = triplet[0];
  const t1 = triplet[1];
  const t2 = triplet[2];
  if (t0 === undefined || t1 === undefined || t2 === undefined) {
    return "";
  }

  const encryptedTriplet = [
    mod26(m.m00 * t0 + m.m01 * t1 + m.m02 * t2),
    mod26(m.m10 * t0 + m.m11 * t1 + m.m12 * t2),
    mod26(m.m20 * t0 + m.m21 * t1 + m.m22 * t2),
  ];

  const et0 = encryptedTriplet[0];
  const et1 = encryptedTriplet[1];
  const et2 = encryptedTriplet[2];
  if (et0 !== undefined && et1 !== undefined && et2 !== undefined) {
    return (
      String.fromCharCode(et0 + 65) + String.fromCharCode(et1 + 65) + String.fromCharCode(et2 + 65)
    );
  }
  return "";
}

// Helper function to encrypt text triplets with 3x3 matrix
function encryptTriplets3x3(text: string, matrix: number[][]): string {
  let encrypted = "";
  const m = extractMatrixElements(matrix);

  for (let i = 0; i < text.length; i += 3) {
    const char0 = text.charCodeAt(i);
    const char1 = text.charCodeAt(i + 1);
    const char2 = text.charCodeAt(i + 2);
    if (char0 === undefined || char1 === undefined || char2 === undefined) {
      break;
    }
    encrypted += processTriplet(char0, char1, char2, m);
  }
  return encrypted;
}

/**
 * Encrypts text using a 3x3 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill3x3 = (text: string): HillCipherResult => {
  const matrix = generate3x3Matrix();
  const det = calculate3x3Determinant(matrix);
  const decryptionMatrix = calculate3x3DecryptionMatrix(matrix, det);

  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const paddedText = cleanText + "X".repeat((3 - (cleanText.length % 3)) % 3);
  const encrypted = encryptTriplets3x3(paddedText, matrix);

  return { encrypted, matrix, decryptionMatrix };
};

/**
 * Calculates the greatest common divisor
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} GCD of a and b
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculates the modular inverse
 * @param {number} a - Number to find inverse for
 * @param {number} m - Modulus
 * @returns {number} Modular inverse of a mod m
 */
function modInverse(a: number, m: number): number {
  const normalizedA = mod26(a);
  for (let x = 1; x < m; x++) {
    if (mod26(normalizedA * x) === 1) {
      return x;
    }
  }
  return 1;
}
