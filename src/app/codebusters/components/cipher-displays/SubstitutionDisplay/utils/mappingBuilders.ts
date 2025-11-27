import type { QuoteData } from "@/app/codebusters/types";
import { generateKeywordAlphabet } from "./alphabetUtils";

// Helper function to build correct mapping from stored alphabets
export function buildMappingFromAlphabets(
  plainAlphabet: string[],
  cipherAlphabet: string[]
): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build K1 mapping
export function buildK1Mapping(
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const plainAlphabet = isXeno
    ? `${generateKeywordAlphabet(keyword)}Ñ`
    : generateKeywordAlphabet(keyword);
  const baseCipher = isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build K2 mapping
export function buildK2Mapping(
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const plainAlphabet = isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const baseCipher = isXeno
    ? `${generateKeywordAlphabet(keyword)}Ñ`
    : generateKeywordAlphabet(keyword);
  const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const cipherLetter = cipherAlphabet[i];
    const plainLetter = plainAlphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build K3 mapping
export function buildK3Mapping(
  keyword: string,
  isXeno: boolean,
  kShift: number
): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const baseAlphabet = generateKeywordAlphabet(keyword);
  const alphabet = isXeno ? `${baseAlphabet}Ñ` : baseAlphabet;
  const len = isXeno ? 27 : 26;
  for (let i = 0; i < len; i++) {
    const shiftedIndex = (i + kShift) % len;
    const cipherLetter = alphabet[shiftedIndex];
    const plainLetter = alphabet[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build mapping from key array
export function buildMappingFromKeyArray(key: string[]): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = key[i];
    if (cipherLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build Caesar mapping with shift
export function buildCaesarMappingWithShift(shift: number): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
    mapping[cipherLetter] = plainLetter;
  }
  return mapping;
}

// Helper function to build Caesar mapping without shift
export function buildCaesarMappingWithoutShift(
  encrypted: string,
  quote: string
): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const ciphertext = encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const expectedPlaintext = quote.toUpperCase().replace(/[^A-Z]/g, "");
  for (let i = 0; i < Math.min(ciphertext.length, expectedPlaintext.length); i++) {
    const cipherLetter = ciphertext[i];
    const plainLetter = expectedPlaintext[i];
    if (cipherLetter !== undefined && plainLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build Atbash mapping
export function buildAtbashMapping(): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const atbashMap = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = atbashMap[i];
    if (cipherLetter !== undefined) {
      mapping[cipherLetter] = plainLetter;
    }
  }
  return mapping;
}

// Helper function to build Affine mapping
export function buildAffineMapping(a: number, b: number): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  for (let i = 0; i < 26; i++) {
    const plainLetter = String.fromCharCode(65 + i);
    const cipherLetter = String.fromCharCode(((a * i + b) % 26) + 65);
    mapping[cipherLetter] = plainLetter;
  }
  return mapping;
}

// Helper function to build keyword-based mapping
export function buildKeywordBasedMapping(
  cipherType: string,
  quote: QuoteData,
  quoteIndex: number,
  quotes: QuoteData[]
): { [key: string]: string } | null {
  const keywordCipherTypes = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ];

  if (!(keywordCipherTypes.includes(cipherType) && quote.key)) {
    return null;
  }

  const keyword = quote.key;
  const isXeno = cipherType.includes("Xenocrypt");

  if (quote.plainAlphabet && quote.cipherAlphabet) {
    return buildMappingFromAlphabets(quote.plainAlphabet.split(""), quote.cipherAlphabet.split(""));
  }

  if (cipherType.includes("K1")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 0;
    return buildK1Mapping(keyword || "", isXeno, kShift);
  }

  if (cipherType.includes("K2")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 0;
    return buildK2Mapping(keyword || "", isXeno, kShift);
  }

  if (cipherType.includes("K3")) {
    const kShift = quotes[quoteIndex]?.kShift ?? 1;
    return buildK3Mapping(keyword || "", isXeno, kShift);
  }

  return null;
}

// Helper function to build mapping for random ciphers
export function buildRandomCipherMapping(
  cipherType: string,
  quote: QuoteData
): { [key: string]: string } | null {
  if (
    ["Random Aristocrat", "Random Patristocrat", "Random Xenocrypt"].includes(cipherType) &&
    quote.key
  ) {
    return buildMappingFromKeyArray(quote.key.split(""));
  }
  return null;
}

// Helper function to build mapping for other ciphers
export function buildOtherCipherMapping(
  cipherType: string,
  quote: QuoteData
): { [key: string]: string } | null {
  if (cipherType === "Caesar") {
    return quote.caesarShift !== undefined
      ? buildCaesarMappingWithShift(quote.caesarShift)
      : buildCaesarMappingWithoutShift(quote.encrypted, quote.quote);
  }

  if (cipherType === "Atbash") {
    return buildAtbashMapping();
  }

  if (cipherType === "Affine" && quote.affineA !== undefined && quote.affineB !== undefined) {
    return buildAffineMapping(quote.affineA, quote.affineB);
  }

  if (
    (cipherType === "Xenocrypt" ||
      ["Nihilist", "Fractionated Morse", "Complete Columnar"].includes(cipherType)) &&
    quote.key
  ) {
    return buildMappingFromKeyArray(quote.key.split(""));
  }

  return null;
}

// Helper function to build correct mapping for substitution ciphers
export function buildCorrectMappingForSubstitution(
  cipherType: string,
  quote: QuoteData,
  quoteIndex: number,
  quotes: QuoteData[]
): { [key: string]: string } {
  const keywordMapping = buildKeywordBasedMapping(cipherType, quote, quoteIndex, quotes);
  if (keywordMapping) {
    return keywordMapping;
  }

  const randomMapping = buildRandomCipherMapping(cipherType, quote);
  if (randomMapping) {
    return randomMapping;
  }

  const otherMapping = buildOtherCipherMapping(cipherType, quote);
  if (otherMapping) {
    return otherMapping;
  }

  return {};
}
