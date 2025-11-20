import type { CipherResult } from "@/app/codebusters/types";
import { generateRandomKeyword } from "@/app/codebusters/utils/common";
import {
  ALPHABET_26,
  applySubstitutionPatristocrat,
  buildSubstitutionMap,
  generateKeywordAlphabet,
  getRandomDerangementShift,
  rotateAlphabet,
} from "@/app/codebusters/utils/substitution";

export const encryptK1Patristocrat = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const basePlain = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const plainAlphabet = rotateAlphabet(basePlain, randomStart);
  const baseCipher = ALPHABET_26;
  const shift = getRandomDerangementShift(plainAlphabet, baseCipher);
  const shiftedCipher = rotateAlphabet(baseCipher, shift);
  const substitutionMap = buildSubstitutionMap(plainAlphabet, shiftedCipher);
  const encrypted = applySubstitutionPatristocrat(text, substitutionMap);
  return { encrypted, key: keyword, kShift: shift, plainAlphabet, cipherAlphabet: shiftedCipher };
};

export const encryptK2Patristocrat = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const plainAlphabet = ALPHABET_26;
  const baseCipher0 = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const baseCipher = rotateAlphabet(baseCipher0, randomStart);
  const shift = getRandomDerangementShift(plainAlphabet, baseCipher);
  const shiftedCipher = rotateAlphabet(baseCipher, shift);
  const substitutionMap = buildSubstitutionMap(plainAlphabet, shiftedCipher);
  const encrypted = applySubstitutionPatristocrat(text, substitutionMap);
  return { encrypted, key: keyword, kShift: shift, plainAlphabet, cipherAlphabet: shiftedCipher };
};

export const encryptK3Patristocrat = (text: string): CipherResult => {
  const keyword = generateRandomKeyword();
  const base = generateKeywordAlphabet(keyword);
  const randomStart = Math.floor(Math.random() * 26);
  const plainAlphabet = rotateAlphabet(base, randomStart);
  const cipherAlphabet = rotateAlphabet(base, randomStart);
  const shifted = rotateAlphabet(cipherAlphabet, 1);
  const substitutionMap = buildSubstitutionMap(plainAlphabet, shifted);
  const encrypted = applySubstitutionPatristocrat(text, substitutionMap);
  return { encrypted, key: keyword, kShift: 1, plainAlphabet, cipherAlphabet: shifted };
};
