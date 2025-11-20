/**
 * Hill cipher encryption functions
 */

import type { HillCipherResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import { mod26 } from "@/app/codebusters/ciphers/utils/cipherUtils";

/**
 * Encrypts text using a 2x2 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill2x2 = (text: string): HillCipherResult => {
  // Generate random 2x2 matrix with determinant coprime to 26
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

  // Calculate decryption matrix
  const detInv = modInverse(det, 26);
  const m00 = matrix[0]?.[0] ?? 0;
  const m01 = matrix[0]?.[1] ?? 0;
  const m10 = matrix[1]?.[0] ?? 0;
  const m11 = matrix[1]?.[1] ?? 0;
  const decryptionMatrix = [
    [mod26(m11 * detInv), mod26(-m01 * detInv)],
    [mod26(-m10 * detInv), mod26(m00 * detInv)],
  ];

  // Clean and pad text
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const paddedText = cleanText.length % 2 === 1 ? `${cleanText}X` : cleanText;

  // Encrypt pairs
  let encrypted = "";
  for (let i = 0; i < paddedText.length; i += 2) {
    const char0 = paddedText.charCodeAt(i);
    const char1 = paddedText.charCodeAt(i + 1);
    if (char0 === undefined || char1 === undefined) break;
    const pair = [char0 - 65, char1 - 65];
    const p0 = pair[0];
    const p1 = pair[1];
    if (p0 === undefined || p1 === undefined) break;
    const m00 = matrix[0]?.[0] ?? 0;
    const m01 = matrix[0]?.[1] ?? 0;
    const m10 = matrix[1]?.[0] ?? 0;
    const m11 = matrix[1]?.[1] ?? 0;
    const encryptedPair = [
      mod26(m00 * p0 + m01 * p1),
      mod26(m10 * p0 + m11 * p1),
    ];

    const ep0 = encryptedPair[0];
    const ep1 = encryptedPair[1];
    if (ep0 !== undefined && ep1 !== undefined) {
      encrypted += String.fromCharCode(ep0 + 65) + String.fromCharCode(ep1 + 65);
    }
  }

  return { encrypted, matrix, decryptionMatrix };
};

/**
 * Encrypts text using a 3x3 Hill cipher
 * @param {string} text - Text to encrypt
 * @returns {HillCipherResult} Encrypted text and matrices
 */
export const encryptHill3x3 = (text: string): HillCipherResult => {
  // Generate random 3x3 matrix with determinant coprime to 26
  let matrix: number[][];
  let det: number;
  do {
    matrix = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => Math.floor(Math.random() * 26))
    );
    const m00 = matrix[0]?.[0] ?? 0;
    const m01 = matrix[0]?.[1] ?? 0;
    const m02 = matrix[0]?.[2] ?? 0;
    const m10 = matrix[1]?.[0] ?? 0;
    const m11 = matrix[1]?.[1] ?? 0;
    const m12 = matrix[1]?.[2] ?? 0;
    const m20 = matrix[2]?.[0] ?? 0;
    const m21 = matrix[2]?.[1] ?? 0;
    const m22 = matrix[2]?.[2] ?? 0;
    det = mod26(
      m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20)
    );
  } while (det === 0 || gcd(det, 26) !== 1);

  // Calculate decryption matrix (adjugate * det inverse)
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
  const adjugate = [
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
  const decryptionMatrix = adjugate;

  // Clean and pad text
  const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
  const paddedText = cleanText + "X".repeat((3 - (cleanText.length % 3)) % 3);

  // Encrypt triplets
  let encrypted = "";
  for (let i = 0; i < paddedText.length; i += 3) {
    const char0 = paddedText.charCodeAt(i);
    const char1 = paddedText.charCodeAt(i + 1);
    const char2 = paddedText.charCodeAt(i + 2);
    if (char0 === undefined || char1 === undefined || char2 === undefined) break;
    const triplet = [char0 - 65, char1 - 65, char2 - 65];
    const t0 = triplet[0];
    const t1 = triplet[1];
    const t2 = triplet[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) break;

    const encryptedTriplet = [
      mod26(m00 * t0 + m01 * t1 + m02 * t2),
      mod26(m10 * t0 + m11 * t1 + m12 * t2),
      mod26(m20 * t0 + m21 * t1 + m22 * t2),
    ];

    const et0 = encryptedTriplet[0];
    const et1 = encryptedTriplet[1];
    const et2 = encryptedTriplet[2];
    if (et0 !== undefined && et1 !== undefined && et2 !== undefined) {
      encrypted +=
        String.fromCharCode(et0 + 65) +
        String.fromCharCode(et1 + 65) +
        String.fromCharCode(et2 + 65);
    }
  }

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
  a = mod26(a);
  for (let x = 1; x < m; x++) {
    if (mod26(a * x) === 1) {
      return x;
    }
  }
  return 1;
}
