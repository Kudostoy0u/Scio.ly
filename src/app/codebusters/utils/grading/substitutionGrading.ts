import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

const generateKeywordAlphabet = (keyword: string): string => {
  const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, "");
  const used = new Set<string>();
  const result: string[] = [];

  for (const char of cleanKeyword) {
    if (!used.has(char)) {
      used.add(char);
      result.push(char);
    }
  }

  for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!used.has(char)) {
      result.push(char);
    }
  }

  return result.join("");
};

const checkCaesarCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  if (quote.caesarShift !== undefined) {
    const shift = quote.caesarShift;
    const expectedPlainLetter = String.fromCharCode(
      ((cipherLetter.charCodeAt(0) - 65 - shift + 26) % 26) + 65
    );
    return userAnswer === expectedPlainLetter;
  }
  const ciphertext = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
  const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const cipherIndex = ciphertext.indexOf(cipherLetter);
  if (cipherIndex !== -1 && cipherIndex < expectedPlaintext.length) {
    return userAnswer === expectedPlaintext[cipherIndex];
  }
  return false;
};

const checkAtbashCorrectness = (cipherLetter: string, userAnswer: string): boolean => {
  const atbashMap = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
  const expectedPlainLetter = atbashMap[cipherLetter.charCodeAt(0) - 65];
  return userAnswer === expectedPlainLetter;
};

const checkAffineCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  if (quote.affineA === undefined || quote.affineB === undefined) {
    return false;
  }
  const a = quote.affineA;
  const b = quote.affineB;
  let aInverse = 0;
  for (let i = 1; i < 26; i++) {
    if ((a * i) % 26 === 1) {
      aInverse = i;
      break;
    }
  }
  const expectedPlainLetter = String.fromCharCode(
    ((aInverse * (cipherLetter.charCodeAt(0) - 65 - b + 26)) % 26) + 65
  );
  return userAnswer === expectedPlainLetter;
};

const getK1K2K3BasePlain = (quote: QuoteData): string => {
  const keyword = quote.key || "";
  const isXeno = quote.cipherType.includes("Xenocrypt");
  const isK1OrK3 = quote.cipherType.includes("K1") || quote.cipherType.includes("K3");
  if (isK1OrK3) {
    return isXeno ? `${generateKeywordAlphabet(keyword)}Ñ` : generateKeywordAlphabet(keyword);
  }
  return isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
};

const getK1K2K3BaseCipher = (quote: QuoteData): string => {
  const keyword = quote.key || "";
  const isXeno = quote.cipherType.includes("Xenocrypt");
  const isK2OrK3 = quote.cipherType.includes("K2") || quote.cipherType.includes("K3");
  if (isK2OrK3) {
    return isXeno ? `${generateKeywordAlphabet(keyword)}Ñ` : generateKeywordAlphabet(keyword);
  }
  return isXeno ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
};

const getK1K2K3Shift = (quote: QuoteData): number => {
  if (typeof quote.kShift === "number") {
    return quote.kShift;
  }
  return quote.cipherType.includes("K3") ? 1 : 0;
};

const checkK1K2K3Correctness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  const basePlain = getK1K2K3BasePlain(quote);
  const baseCipher = getK1K2K3BaseCipher(quote);
  const shift = getK1K2K3Shift(quote);
  const rotatedCipher = baseCipher.slice(shift) + baseCipher.slice(0, shift);
  const idx = rotatedCipher.indexOf(cipherLetter);
  if (idx !== -1) {
    return userAnswer === basePlain[idx];
  }
  return false;
};

const checkRandomSubstitutionCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  if (!quote.key) {
    return false;
  }
  const keyIndex = quote.key.indexOf(cipherLetter);
  if (keyIndex !== -1) {
    return userAnswer === String.fromCharCode(keyIndex + 65);
  }
  return false;
};

const checkStoredMapCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean | null => {
  if (!(quote.plainAlphabet && quote.cipherAlphabet)) {
    return null;
  }
  const pa = quote.plainAlphabet;
  const ca = quote.cipherAlphabet;
  const len = Math.min(pa.length, ca.length);
  for (let i = 0; i < len; i++) {
    if (ca[i] === cipherLetter) {
      return userAnswer === pa[i];
    }
  }
  return null;
};

const routeCipherTypeCheck = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  if (quote.cipherType === "Caesar") {
    return checkCaesarCorrectness(quote, cipherLetter, userAnswer);
  }
  if (quote.cipherType === "Atbash") {
    return checkAtbashCorrectness(cipherLetter, userAnswer);
  }
  if (quote.cipherType === "Affine") {
    return checkAffineCorrectness(quote, cipherLetter, userAnswer);
  }
  const kTypes = [
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
  if (kTypes.includes(quote.cipherType)) {
    return checkK1K2K3Correctness(quote, cipherLetter, userAnswer);
  }
  const randomTypes = ["Random Aristocrat", "Random Patristocrat", "Random Xenocrypt"];
  if (randomTypes.includes(quote.cipherType)) {
    return checkRandomSubstitutionCorrectness(quote, cipherLetter, userAnswer);
  }
  return false;
};

export const checkSubstitutionCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string
): boolean => {
  const storedResult = checkStoredMapCorrectness(quote, cipherLetter, userAnswer);
  if (storedResult !== null) {
    return storedResult;
  }
  return routeCipherTypeCheck(quote, cipherLetter, userAnswer);
};

const createStoredMap = (quote: QuoteData): { [cipher: string]: string } | null => {
  if (!(quote.plainAlphabet && quote.cipherAlphabet)) {
    return null;
  }
  const storedMap: { [cipher: string]: string } = {};
  const pa = quote.plainAlphabet;
  const ca = quote.cipherAlphabet;
  const len = Math.min(pa.length, ca.length);
  for (let i = 0; i < len; i++) {
    const cipherChar = ca[i];
    const plainChar = pa[i];
    if (cipherChar !== undefined && plainChar !== undefined) {
      storedMap[cipherChar] = plainChar;
    }
  }
  return storedMap;
};

const gradeSubstitutionLetter = (
  quote: QuoteData,
  cipherLetter: string,
  userAnswer: string,
  storedMap: { [cipher: string]: string } | null
): { isFilled: boolean; isCorrect: boolean } => {
  const isFilled = Boolean(userAnswer && userAnswer.trim().length > 0);
  if (!isFilled) {
    return { isFilled: false, isCorrect: false };
  }
  let isCorrect = false;
  if (storedMap) {
    const expectedPlainLetter = storedMap[cipherLetter];
    if (expectedPlainLetter) {
      isCorrect = userAnswer === expectedPlainLetter;
    }
  } else {
    isCorrect = checkSubstitutionCorrectness(quote, cipherLetter, userAnswer);
  }
  return { isFilled, isCorrect };
};

export const gradeSubstitutionCipher = (
  quote: QuoteData,
  quoteIndex: number,
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } },
  questionPointValue: number
): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.solution && Object.keys(quote.solution).length > 0) {
    const allUniqueLetters = [...new Set(quote.encrypted.replace(/[^A-Z]/g, ""))];
    const nonHintedLetters = allUniqueLetters.filter((c) => !hintedLetters[quoteIndex]?.[c]);
    totalInputs = nonHintedLetters.length;
    const storedMap = createStoredMap(quote);

    for (const cipherLetter of nonHintedLetters) {
      const userAnswer = quote.solution[cipherLetter];
      const { isFilled, isCorrect } = gradeSubstitutionLetter(
        quote,
        cipherLetter,
        userAnswer || "",
        storedMap
      );
      if (isFilled) {
        filledInputs++;
      }
      if (isCorrect) {
        correctInputs++;
      }
    }
  }

  const attemptedScore = totalInputs > 0 ? (filledInputs / totalInputs) * questionPointValue : 0;
  const score = filledInputs > 0 ? (correctInputs / filledInputs) * attemptedScore : 0;

  return {
    totalInputs,
    correctInputs,
    filledInputs,
    score,
    maxScore: questionPointValue,
    attemptedScore,
    unitLabel: "unique cipher letters",
  };
};
