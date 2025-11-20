import type { CipherResult } from "@/app/codebusters/types";
import { generateRandomKeyword } from "@/app/codebusters/utils/common";
import {
  ALPHABET_27_SPANISH,
  generateKeywordAlphabet,
  getRandomDerangementShift,
  normalizeSpanishText,
  rotateAlphabet,
} from "@/app/codebusters/utils/substitution";

export const encryptK1Xenocrypt = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const basePlain = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const plainAlphabet = `${rotateAlphabet(basePlain, randomStart)}Ñ`;
  const baseCipher = ALPHABET_27_SPANISH;
  const shift = getRandomDerangementShift(plainAlphabet, baseCipher);
  const shiftedCipher = rotateAlphabet(baseCipher, shift);
  const map: Record<string, string> = {};
  for (let i = 0; i < 27; i++) {
    const plainChar = plainAlphabet[i];
    const cipherChar = shiftedCipher[i];
    if (plainChar !== undefined && cipherChar !== undefined) {
      map[plainChar] = cipherChar;
    }
  }
  const normalized = normalizeSpanishText(text);
  const encrypted = normalized.replace(/[A-ZÑ]/g, (ch) => map[ch] || ch);
  return { encrypted, key: keyword, kShift: shift, plainAlphabet, cipherAlphabet: shiftedCipher };
};

export const encryptK2Xenocrypt = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const plainAlphabet = ALPHABET_27_SPANISH;
  const baseCipher0 = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const baseCipher = `${rotateAlphabet(baseCipher0, randomStart)}Ñ`;
  const shift = getRandomDerangementShift(plainAlphabet, baseCipher);
  const shiftedCipher = rotateAlphabet(baseCipher, shift);
  const map: Record<string, string> = {};
  for (let i = 0; i < 27; i++) {
    const plainChar = plainAlphabet[i];
    const cipherChar = shiftedCipher[i];
    if (plainChar !== undefined && cipherChar !== undefined) {
      map[plainChar] = cipherChar;
    }
  }
  const normalized = normalizeSpanishText(text);
  const encrypted = normalized.replace(/[A-ZÑ]/g, (ch) => map[ch] || ch);
  return { encrypted, key: keyword, kShift: shift, plainAlphabet, cipherAlphabet: shiftedCipher };
};

export const encryptK3Xenocrypt = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const base = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const rotated = rotateAlphabet(base, randomStart);
  const plainAlphabet = `${rotated}Ñ`;
  const cipherAlphabet = `${rotated}Ñ`;
  const shifted = rotateAlphabet(cipherAlphabet, 1);
  const map: Record<string, string> = {};
  for (let i = 0; i < 27; i++) {
    const plainChar = plainAlphabet[i];
    const shiftChar = shifted[i];
    if (plainChar !== undefined && shiftChar !== undefined) {
      map[plainChar] = shiftChar;
    }
  }
  const normalized = normalizeSpanishText(text);
  const encrypted = normalized.replace(/[A-ZÑ]/g, (ch) => map[ch] || ch);
  return { encrypted, key: keyword, kShift: 1, plainAlphabet, cipherAlphabet: shifted };
};
