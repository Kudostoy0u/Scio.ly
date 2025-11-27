import type { QuoteData } from "../types";

export const getPlainLetterFromAlphabets = (
  quote: QuoteData,
  randomCipherLetter: string
): string => {
  if (!(quote.plainAlphabet && quote.cipherAlphabet)) {
    return "";
  }
  const pa = quote.plainAlphabet;
  const ca = quote.cipherAlphabet;
  const idx = ca.indexOf(randomCipherLetter);
  if (idx !== -1 && idx < pa.length) {
    const plainChar = pa[idx];
    if (plainChar) {
      return plainChar;
    }
  }
  return "";
};

export const getPlainLetterCaesar = (quote: QuoteData, randomCipherLetter: string): string => {
  if (quote.cipherType !== "Caesar" || quote.caesarShift === undefined) {
    return "";
  }
  const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
  const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
  return String.fromCharCode(plainIndex + 65);
};

export const getPlainLetterAtbash = (randomCipherLetter: string): string => {
  const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
  const plainIndex = 25 - cipherIndex;
  return String.fromCharCode(plainIndex + 65);
};

export const getPlainLetterAffine = (quote: QuoteData, randomCipherLetter: string): string => {
  if (quote.cipherType !== "Affine" || quote.affineA === undefined || quote.affineB === undefined) {
    return "";
  }
  const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
  let aInverse = 1;
  for (let i = 1; i < 26; i++) {
    if ((quote.affineA * i) % 26 === 1) {
      aInverse = i;
      break;
    }
  }
  const plainIndex = (aInverse * (cipherIndex - quote.affineB + 26)) % 26;
  return String.fromCharCode(plainIndex + 65);
};

export const getPlainLetterFromKey = (quote: QuoteData, randomCipherLetter: string): string => {
  if (!quote.key) {
    return "";
  }
  const keyCiphers = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "Random Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "Random Patristocrat",
    "Random Xenocrypt",
  ];
  if (!keyCiphers.includes(quote.cipherType)) {
    return "";
  }
  const keyIndex = quote.key.indexOf(randomCipherLetter);
  if (keyIndex !== -1) {
    return String.fromCharCode(keyIndex + 65);
  }
  return "";
};

export const getPlainLetterByPosition = (quote: QuoteData, randomCipherLetter: string): string => {
  const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const cipherIndex = cipherText.indexOf(randomCipherLetter);
  if (cipherIndex !== -1 && cipherIndex < plainText.length) {
    const plainChar = plainText[cipherIndex];
    if (plainChar) {
      return plainChar;
    }
  }
  return "";
};

export const getPlainLetterFractionatedMorse = (
  quote: QuoteData,
  randomCipherLetter: string
): string => {
  if (quote.cipherType !== "Fractionated Morse" || !quote.fractionationTable) {
    return "";
  }
  for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
    if (letter === randomCipherLetter && triplet) {
      return triplet;
    }
  }
  return "";
};

export const getPlainLetterXenocrypt = (quote: QuoteData, randomCipherLetter: string): string => {
  const xenocryptTypes = ["Random Xenocrypt", "K1 Xenocrypt", "K2 Xenocrypt"];
  if (!xenocryptTypes.includes(quote.cipherType)) {
    return "";
  }
  const normalizedOriginal = quote.quote
    .toUpperCase()
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ü/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z]/g, "");
  const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const cipherIndex = cipherText.indexOf(randomCipherLetter);
  if (cipherIndex !== -1 && cipherIndex < normalizedOriginal.length) {
    const plainChar = normalizedOriginal[cipherIndex];
    if (plainChar) {
      return plainChar;
    }
  }
  return "";
};

export const getPlainLetterHill = (quote: QuoteData, randomCipherLetter: string): string => {
  if ((quote.cipherType !== "Hill 2x2" && quote.cipherType !== "Hill 3x3") || !quote.matrix) {
    return "";
  }
  const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const cipherIndex = cipherText.indexOf(randomCipherLetter);
  if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
    const plainChar = originalQuote[cipherIndex];
    if (plainChar) {
      return plainChar;
    }
  }
  return "";
};

export const getPlainLetterPositionBased = (
  quote: QuoteData,
  randomCipherLetter: string
): string => {
  if (quote.cipherType === "Porta" && quote.portaKeyword) {
    return getPlainLetterByPosition(quote, randomCipherLetter);
  }
  if (quote.nihilistPolybiusKey || quote.nihilistCipherKey) {
    return getPlainLetterByPosition(quote, randomCipherLetter);
  }
  if (quote.cipherType === "Complete Columnar" && quote.columnarKey) {
    return getPlainLetterByPosition(quote, randomCipherLetter);
  }
  return "";
};

export const getPlainLetterForCipher = (quote: QuoteData, randomCipherLetter: string): string => {
  const handlers = [
    () => getPlainLetterFromAlphabets(quote, randomCipherLetter),
    () => getPlainLetterCaesar(quote, randomCipherLetter),
    () => (quote.cipherType === "Atbash" ? getPlainLetterAtbash(randomCipherLetter) : ""),
    () => getPlainLetterAffine(quote, randomCipherLetter),
    () => getPlainLetterFromKey(quote, randomCipherLetter),
    () => getPlainLetterHill(quote, randomCipherLetter),
    () => getPlainLetterPositionBased(quote, randomCipherLetter),
    () => getPlainLetterFractionatedMorse(quote, randomCipherLetter),
    () => getPlainLetterXenocrypt(quote, randomCipherLetter),
  ];
  for (const handler of handlers) {
    const result = handler();
    if (result) {
      return result;
    }
  }
  return "";
};
