import { letterToNumber } from "@/app/codebusters/utils/common";
import {
  ALPHABET_26,
  ALPHABET_27_INDEX_ORDER,
  generateDerangementFromAlphabet,
} from "@/app/codebusters/utils/substitution";

export const encryptRandomAristocrat = (text: string): { encrypted: string; key: string } => {
  const key = generateDerangementFromAlphabet(ALPHABET_26);
  const encrypted = text.toUpperCase().replace(/[A-Z]/g, (ch) => key[letterToNumber(ch)] || ch);
  return { encrypted, key };
};

export const encryptRandomPatristocrat = (text: string): { encrypted: string; key: string } => {
  const key = generateDerangementFromAlphabet(ALPHABET_26);
  const clean = text.toUpperCase().replace(/[^A-Z]/g, "");
  const letters = clean.split("").map((ch) => key[letterToNumber(ch)] || ch);
  const groups: string[] = [];
  for (let i = 0; i < letters.length; i += 5) {
    groups.push(letters.slice(i, i + 5).join(""));
  }
  return { encrypted: groups.join(" "), key };
};

export const encryptRandomXenocrypt = (text: string): { encrypted: string; key: string } => {
  const key = generateDerangementFromAlphabet(ALPHABET_27_INDEX_ORDER);
  const encrypted = text.toUpperCase().replace(/[A-ZÑ]/g, (ch) => key[letterToNumber(ch)] || ch);
  return { encrypted, key };
};
