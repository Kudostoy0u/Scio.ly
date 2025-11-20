import { letterToNumber, numberToLetter } from "@/app/codebusters/utils/common";

export const encryptAffine = (text: string): { encrypted: string; a: number; b: number } => {
  const possibleA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
  const aIndex = Math.floor(Math.random() * possibleA.length);
  const a = possibleA[aIndex];
  if (a === undefined) {
    throw new Error("Failed to select a value for affine cipher");
  }
  const b = Math.floor(Math.random() * 26);
  const encrypted = text.toUpperCase().replace(/[A-Z]/g, (char) => {
    const num = letterToNumber(char);
    return numberToLetter((a * num + b) % 26);
  });
  return { encrypted, a, b };
};
