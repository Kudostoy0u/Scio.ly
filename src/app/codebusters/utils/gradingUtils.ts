import type { QuoteData } from "@/app/codebusters/types";

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

export interface GradingResult {
  totalInputs: number;
  correctInputs: number;
  filledInputs: number;
  score: number;
  maxScore: number;
  attemptedScore: number;
  unitLabel?: string;
}

/**
 * Calculate the grade for a single cipher question
 * Returns the number of correct inputs out of total inputs
 */

// Compute a suggested default point value purely from cipher type/length.
// This serves as a fallback when no explicit points are provided or overridden.
function getSuggestedPoints(quote: QuoteData): number {
  const cipherMultipliers: { [key: string]: number } = {
    Atbash: 1.0,
    Caesar: 1.0,
    Baconian: 1.2,

    Affine: 1.8,
    Porta: 1.6,
    Checkerboard: 1.7,

    "K1 Aristocrat": 2.2,
    "K1 Patristocrat": 2.8,
    "K1 Xenocrypt": 2.5,
    "Hill 2x2": 2.8,
    Nihilist: 2.3,

    "K2 Aristocrat": 3.2,
    "K2 Patristocrat": 3.8,
    "K2 Xenocrypt": 3.5,
    "Hill 3x3": 3.8,
    "Fractionated Morse": 3.6,
    "Complete Columnar": 3.4,

    "K3 Aristocrat": 4.2,
    "K3 Patristocrat": 4.8,
    "K3 Xenocrypt": 4.5,
    "Random Aristocrat": 4.0,
    "Random Patristocrat": 4.2,
    "Random Xenocrypt": 4.8,
    Cryptarithm: 4.5,
  };

  const baseMultiplier = cipherMultipliers[quote.cipherType] || 2.0;

  let baconianMultiplier = baseMultiplier;
  if (quote.cipherType === "Baconian" && quote.baconianBinaryType) {
    const binaryType = quote.baconianBinaryType;

    if (binaryType === "A/B") {
      baconianMultiplier = 1.0;
    } else if (binaryType === "Vowels/Consonants" || binaryType === "Odd/Even") {
      baconianMultiplier = 1.3;
    } else if (binaryType.includes(" vs ")) {
      baconianMultiplier = 1.4;
    } else {
      baconianMultiplier = 1.8;
    }
  }

  const quoteLength = quote.quote.replace(/[^A-Za-z]/g, "").length;
  let lengthMultiplier = 1.0;

  if (quoteLength < 50) {
    lengthMultiplier = 0.8;
  } else if (quoteLength < 100) {
    lengthMultiplier = 1.0;
  } else if (quoteLength < 200) {
    lengthMultiplier = 1.2;
  } else {
    lengthMultiplier = 1.4;
  }

  const finalPoints = Math.round(50 * baconianMultiplier * lengthMultiplier);

  return Math.max(2.5, Math.min(20, Number((finalPoints / 7).toFixed(1))));
}

/**
 * Resolve the authoritative point value for a question.
 * Priority order:
 * 1) Per-test override in questionPoints map
 * 2) Embedded `quote.points` computed when questions are generated/loaded
 * 3) Heuristic fallback based on cipher type/length (getSuggestedPoints)
 */
export function resolveQuestionPoints(
  quote: QuoteData,
  quoteIndex: number,
  questionPoints: { [key: number]: number } = {}
): number {
  const questionPoint = questionPoints[quoteIndex];
  if (typeof questionPoint === "number" && questionPoint > 0) {
    return questionPoint;
  }
  if (typeof quote.points === "number" && quote.points > 0) {
    return quote.points;
  }
  return getSuggestedPoints(quote);
}

// Extract helper functions to reduce complexity
const isSubstitutionCipher = (cipherType: string): boolean => {
  return [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "Random Aristocrat",
    "Random Patristocrat",
    "Caesar",
    "Atbash",
    "Affine",
    "Random Xenocrypt",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ].includes(cipherType);
};

const gradeKeywordOnly = (quote: QuoteData, questionPointValue: number): GradingResult => {
  const keyStr = (quote.key || "").toUpperCase();
  const userStr = (quote.keywordSolution || "").toUpperCase();
  const totalInputs = keyStr.length;
  let correctInputs = 0;
  let filledInputs = 0;

  for (let i = 0; i < totalInputs; i++) {
    const expected = keyStr[i] || "";
    const provided = userStr[i] || "";
    if (provided && provided.trim().length > 0) {
      filledInputs++;
      if (provided === expected) {
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
  };
};

// Extract cipher-specific correctness checkers to reduce complexity
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

// Extract alphabet generation logic to reduce complexity
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

// Extract stored map check to reduce complexity
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

// Extract cipher type routing to reduce complexity
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

const checkSubstitutionCorrectness = (
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

// Extract stored map creation to reduce complexity
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

// Extract letter grading logic to reduce complexity
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

const gradeSubstitutionCipher = (
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

// Extract Hill matrix cell grading to reduce complexity
const gradeHillMatrixCell = (
  userAnswer: string,
  expected: string
): { isFilled: boolean; isCorrect: boolean } => {
  const isFilled = Boolean(userAnswer && userAnswer.trim().length > 0);
  const isCorrect = isFilled && userAnswer.trim() === expected;
  return { isFilled, isCorrect };
};

// Extract Hill matrix grading to reduce complexity
const gradeHillMatrix = (quote: QuoteData): { inputs: number; filled: number; correct: number } => {
  let inputs = 0;
  let filled = 0;
  let correct = 0;
  const expectedMatrix = quote.matrix;
  if (!expectedMatrix) {
    return { inputs, filled, correct };
  }
  for (let i = 0; i < expectedMatrix.length; i++) {
    const expectedRow = expectedMatrix[i];
    if (!expectedRow) {
      continue;
    }
    for (let j = 0; j < expectedRow.length; j++) {
      inputs++;
      const userAnswer = quote.hillSolution?.matrix[i]?.[j] || "";
      const expected = expectedRow[j]?.toString() || "";
      const { isFilled, isCorrect } = gradeHillMatrixCell(userAnswer, expected);
      if (isFilled) {
        filled++;
      }
      if (isCorrect) {
        correct++;
      }
    }
  }
  return { inputs, filled, correct };
};

// Extract Hill plaintext grading to reduce complexity
const gradeHillPlaintext = (
  quote: QuoteData,
  matrixSize: number
): { inputs: number; filled: number; correct: number } => {
  let inputs = 0;
  let filled = 0;
  let correct = 0;
  const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  const cleanPlainLength = expectedPlaintext.length;
  const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
  const paddingCount = requiredLength - cleanPlainLength;
  const actualPlaintextSlots = requiredLength - paddingCount;

  for (let i = 0; i < actualPlaintextSlots; i++) {
    inputs++;
    const userAnswer = quote.hillSolution?.plaintext[i] || "";
    const expected = expectedPlaintext[i] || "";
    if (userAnswer && userAnswer.trim().length > 0) {
      filled++;
      if (userAnswer.trim() === expected) {
        correct++;
      }
    }
  }
  return { inputs, filled, correct };
};

// Extract Hill score calculation to reduce complexity
const calculateHillScore = (
  matrixStats: { inputs: number; filled: number; correct: number },
  plaintextStats: { inputs: number; filled: number; correct: number },
  questionPointValue: number,
  matrixWeight: number,
  plaintextWeight: number
): { score: number; attemptedScore: number } => {
  const matrixAttemptedScore =
    matrixStats.inputs > 0
      ? (matrixStats.filled / matrixStats.inputs) * questionPointValue * matrixWeight
      : 0;
  const plaintextAttemptedScore =
    plaintextStats.inputs > 0
      ? (plaintextStats.filled / plaintextStats.inputs) * questionPointValue * plaintextWeight
      : 0;
  const hillAttemptedScore = matrixAttemptedScore + plaintextAttemptedScore;

  const matrixFinalScore =
    matrixStats.filled > 0 ? (matrixStats.correct / matrixStats.filled) * matrixAttemptedScore : 0;
  const plaintextFinalScore =
    plaintextStats.filled > 0
      ? (plaintextStats.correct / plaintextStats.filled) * plaintextAttemptedScore
      : 0;
  const hillScore = matrixFinalScore + plaintextFinalScore;

  return { score: hillScore, attemptedScore: hillAttemptedScore };
};

const gradeHill2x2 = (quote: QuoteData, questionPointValue: number): GradingResult => {
  const matrixWeight = 0.5;
  const plaintextWeight = 0.5;
  const matrixStats = gradeHillMatrix(quote);
  const plaintextStats = gradeHillPlaintext(quote, 2);
  const totalInputs = matrixStats.inputs + plaintextStats.inputs;
  const filledInputs = matrixStats.filled + plaintextStats.filled;
  const correctInputs = matrixStats.correct + plaintextStats.correct;
  const { score, attemptedScore } = calculateHillScore(
    matrixStats,
    plaintextStats,
    questionPointValue,
    matrixWeight,
    plaintextWeight
  );

  return {
    totalInputs,
    correctInputs,
    filledInputs,
    score,
    maxScore: questionPointValue,
    attemptedScore,
    unitLabel: "matrix cells + plaintext letters",
  };
};

const gradeHill3x3 = (quote: QuoteData, questionPointValue: number): GradingResult => {
  const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
  let plaintextInputs = 0;
  let plaintextFilled = 0;
  let plaintextCorrect = 0;
  const cleanPlainLength = expectedPlaintext.length;
  const requiredLength = Math.ceil(cleanPlainLength / 3) * 3;
  const paddingCount = requiredLength - cleanPlainLength;
  const actualPlaintextSlots = requiredLength - paddingCount;

  for (let i = 0; i < actualPlaintextSlots; i++) {
    plaintextInputs++;
    const userAnswer = quote.hillSolution?.plaintext[i] || "";
    const expected = expectedPlaintext[i] || "";
    if (userAnswer && userAnswer.trim().length > 0) {
      plaintextFilled++;
      if (userAnswer.trim() === expected) {
        plaintextCorrect++;
      }
    }
  }

  const attemptedScore =
    plaintextInputs > 0 ? (plaintextFilled / plaintextInputs) * questionPointValue : 0;
  const score = plaintextFilled > 0 ? (plaintextCorrect / plaintextFilled) * attemptedScore : 0;

  return {
    totalInputs: plaintextInputs,
    correctInputs: plaintextCorrect,
    filledInputs: plaintextFilled,
    score,
    maxScore: questionPointValue,
    attemptedScore,
    unitLabel: "plaintext letters",
  };
};

const gradeColumnar = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.solution?.decryptedText) {
    const decryptedText = quote.solution.decryptedText.trim();
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const expectedLength = expectedPlaintext.length;
    totalInputs = expectedLength;

    for (let i = 0; i < expectedLength; i++) {
      const userChar = i < decryptedText.length ? decryptedText[i] : "";
      const expectedChar = expectedPlaintext[i];
      if (userChar && userChar.trim().length > 0) {
        filledInputs++;
        if (userChar.trim() === expectedChar) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

// Extract Nihilist normalization to reduce complexity
const normalizeNihilist = (s: string): string => {
  return s ? s.toUpperCase().replace(/J/g, "I") : s;
};

// Extract Nihilist letter grading to reduce complexity
const gradeNihilistLetter = (
  userAnswer: string | undefined,
  expectedPlainChar: string | undefined
): { isFilled: boolean; isCorrect: boolean } => {
  const normalizedAnswer = normalizeNihilist(userAnswer || "");
  const normalizedExpected = normalizeNihilist(expectedPlainChar || "");
  const isFilled = Boolean(normalizedAnswer && normalizedAnswer.trim().length > 0);
  const isCorrect = isFilled && normalizedAnswer.trim() === normalizedExpected;
  return { isFilled, isCorrect };
};

// Extract hinted count calculation to reduce complexity
const getNihilistHintedCount = (quote: QuoteData): number => {
  const hintedPositions = Object.entries(quote.nihilistHinted || {})
    .filter(([, v]) => v === true)
    .map(([k]) => Number(k));
  return hintedPositions.length;
};

// Extract Nihilist letter processing to reduce complexity
const processNihilistLetters = (
  quote: QuoteData,
  expectedPlaintext: string
): { filled: number; correct: number } => {
  let filled = 0;
  let correct = 0;
  for (let i = 0; i < expectedPlaintext.length; i++) {
    const isHinted = Boolean(quote.nihilistHinted?.[i]);
    if (isHinted) {
      continue;
    }
    const userAnswer = quote.nihilistSolution?.[i];
    const expectedPlainChar = expectedPlaintext[i];
    if (expectedPlainChar === undefined) {
      continue;
    }
    const { isFilled, isCorrect } = gradeNihilistLetter(userAnswer, expectedPlainChar);
    if (isFilled) {
      filled++;
    }
    if (isCorrect) {
      correct++;
    }
  }
  return { filled, correct };
};

const gradeNihilist = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.nihilistSolution && Object.keys(quote.nihilistSolution).length > 0) {
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const hintedCount = getNihilistHintedCount(quote);
    totalInputs = Math.max(0, expectedPlaintext.length - hintedCount);
    const { filled, correct } = processNihilistLetters(quote, expectedPlaintext);
    filledInputs = filled;
    correctInputs = correct;
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

const gradeBaconian = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.solution && Object.keys(quote.solution).length > 0) {
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    totalInputs = expectedPlaintext.length;

    for (let i = 0; i < totalInputs; i++) {
      const userAnswer = quote.solution[i];
      if (userAnswer && userAnswer.trim().length > 0) {
        filledInputs++;
        if (userAnswer.trim() === expectedPlaintext[i]) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

// Extract Porta table and mapping constants to reduce complexity
const PORTA_TABLE: { [key: string]: string } = {
  AB: "NOPQRSTUVWXYZABCDEFGHIJKLM",
  CD: "OPQRSTUVWXYZNABCDEFGHIJKLM",
  EF: "PQRSTUVWXYZNOABCDEFGHIJKLM",
  GH: "QRSTUVWXYZNOPABCDEFGHIJKLM",
  IJ: "RSTUVWXYZNOPQABCDEFGHIJKLM",
  KL: "STUVWXYZNOPQRABCDEFGHIJKLM",
  MN: "TUVWXYZNOPQRSABCDEFGHIJKLM",
  OP: "UVWXYZNOPQRSTABCDEFGHIJKLM",
  QR: "VWXYZNOPQRSTUABCDEFGHIJKLM",
  ST: "WXYZNOPQRSTUVABCDEFGHIJKLM",
  UV: "XYZNOPQRSTUVWABCDEFGHIJKLM",
  WX: "YZNOPQRSTUVWXABCDEFGHIJKLM",
  YZ: "ZNOPQRSTUVWXYABCDEFGHIJKLM",
};

const CHAR_TO_PAIR: { [key: string]: string } = {
  A: "AB",
  B: "AB",
  C: "CD",
  D: "CD",
  E: "EF",
  F: "EF",
  G: "GH",
  H: "GH",
  I: "IJ",
  J: "IJ",
  K: "KL",
  L: "KL",
  M: "MN",
  N: "MN",
  O: "OP",
  P: "OP",
  Q: "QR",
  R: "QR",
  S: "ST",
  T: "ST",
  U: "UV",
  V: "UV",
  W: "WX",
  X: "WX",
  Y: "YZ",
  Z: "YZ",
};

const PORTA_HEADER_ROW = "ABCDEFGHIJKLM";

// Extract Porta correctness check to reduce complexity
const checkPortaCorrectness = (
  quote: QuoteData,
  cipherLetter: string,
  plainLetter: string,
  encryptedLetters: string
): boolean => {
  const cipherLetterIndex = encryptedLetters.indexOf(cipherLetter);
  if (cipherLetterIndex === -1 || !quote.portaKeyword) {
    return false;
  }
  const keywordChar = quote.portaKeyword[cipherLetterIndex % quote.portaKeyword.length];
  if (!keywordChar) {
    return false;
  }
  const pair = CHAR_TO_PAIR[keywordChar];
  if (!pair) {
    return false;
  }
  const portaRow = PORTA_TABLE[pair];
  if (!portaRow) {
    return false;
  }
  let expectedPlainChar: string | undefined;
  const headerIndex = PORTA_HEADER_ROW.indexOf(cipherLetter);
  if (headerIndex !== -1) {
    expectedPlainChar = portaRow[headerIndex];
  } else {
    const keyRowIndex = portaRow.indexOf(cipherLetter);
    if (keyRowIndex !== -1) {
      expectedPlainChar = PORTA_HEADER_ROW[keyRowIndex];
    }
  }
  return Boolean(expectedPlainChar && plainLetter.trim().toUpperCase() === expectedPlainChar);
};

const gradePorta = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.solution && Object.keys(quote.solution).length > 0) {
    const inputKeys = Object.keys(quote.solution).filter((key) => key.includes("-"));
    totalInputs = inputKeys.length;
    const encryptedLetters = quote.encrypted.replace(/[^A-Z]/g, "");

    for (const solutionKey of inputKeys) {
      const plainLetter = quote.solution[solutionKey];
      if (plainLetter && plainLetter.trim().length > 0) {
        filledInputs++;
        const [cipherLetter] = solutionKey.split("-");
        if (
          cipherLetter &&
          checkPortaCorrectness(quote, cipherLetter, plainLetter, encryptedLetters)
        ) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

const gradeFractionatedMorse = (
  quote: QuoteData,
  quoteIndex: number,
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } }
): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.solution && Object.keys(quote.solution).length > 0) {
    const allUnique = [...new Set(quote.encrypted.replace(/[^A-Z]/g, ""))];
    const nonHinted = allUnique.filter((c) => !hintedLetters[quoteIndex]?.[c]);
    totalInputs = nonHinted.length;

    for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
      if (nonHinted.includes(cipherLetter) && triplet && triplet.trim().length === 3) {
        filledInputs++;
        if (quote.fractionationTable && quote.fractionationTable[triplet] === cipherLetter) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

// Extract Checkerboard hinted count calculation to reduce complexity
const getCheckerboardHintedCount = (quote: QuoteData): number => {
  const hintedPositions = Object.entries(quote.checkerboardHinted || {})
    .filter(([, v]) => v === true)
    .map(([k]) => Number(k));
  return hintedPositions.length;
};

// Extract Checkerboard letter processing to reduce complexity
const processCheckerboardLetters = (
  quote: QuoteData,
  expectedPlaintext: string
): { filled: number; correct: number } => {
  let filled = 0;
  let correct = 0;
  for (let i = 0; i < expectedPlaintext.length; i++) {
    const isHinted = Boolean(quote.checkerboardHinted?.[i]);
    if (isHinted) {
      continue;
    }
    const userAnswer = quote.checkerboardSolution?.[i];
    if (userAnswer && userAnswer.trim().length > 0) {
      filled++;
      if (userAnswer.trim() === expectedPlaintext[i]) {
        correct++;
      }
    }
  }
  return { filled, correct };
};

const gradeCheckerboard = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.checkerboardSolution && Object.keys(quote.checkerboardSolution).length > 0) {
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
    const hintedCount = getCheckerboardHintedCount(quote);
    totalInputs = Math.max(0, expectedPlaintext.length - hintedCount);
    const { filled, correct } = processCheckerboardLetters(quote, expectedPlaintext);
    filledInputs = filled;
    correctInputs = correct;
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

const gradeCryptarithm = (quote: QuoteData): GradingResult => {
  let totalInputs = 0;
  let correctInputs = 0;
  let filledInputs = 0;

  if (quote.cryptarithmSolution && Object.keys(quote.cryptarithmSolution).length > 0) {
    const expectedWords =
      quote.cryptarithmData?.digitGroups.map((group) => group.word.replace(/\s/g, "")) || [];
    const allExpectedLetters = expectedWords.join("");
    const hintedPositions = Object.entries(quote.cryptarithmHinted || {})
      .filter(([, v]) => v === true)
      .map(([k]) => Number(k));
    const hintedCount = hintedPositions.length;
    totalInputs = Math.max(0, allExpectedLetters.length - hintedCount);

    for (let i = 0; i < totalInputs; i++) {
      const userAnswer = quote.cryptarithmSolution[i];
      const isHinted = Boolean(quote.cryptarithmHinted?.[i]);
      if (!isHinted && userAnswer && userAnswer.trim().length > 0) {
        filledInputs++;
        if (userAnswer.trim() === allExpectedLetters[i]) {
          correctInputs++;
        }
      }
    }
  }

  return { totalInputs, correctInputs, filledInputs, score: 0, maxScore: 0, attemptedScore: 0 };
};

// Extract cipher type routing to reduce complexity
const routeCipherTypeGrading = (
  quote: QuoteData,
  quoteIndex: number,
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } },
  questionPointValue: number
): GradingResult | null => {
  const cipherTypeMap: { [key: string]: () => GradingResult } = {
    "Hill 2x2": () => gradeHill2x2(quote, questionPointValue),
    "Hill 3x3": () => gradeHill3x3(quote, questionPointValue),
    "Complete Columnar": () => gradeColumnar(quote),
    Nihilist: () => gradeNihilist(quote),
    Baconian: () => gradeBaconian(quote),
    Porta: () => gradePorta(quote),
    "Fractionated Morse": () => gradeFractionatedMorse(quote, quoteIndex, hintedLetters),
    Checkerboard: () => gradeCheckerboard(quote),
    Cryptarithm: () => gradeCryptarithm(quote),
  };
  const gradeFunction = cipherTypeMap[quote.cipherType];
  return gradeFunction ? gradeFunction() : null;
};

// Extract unit label determination to reduce complexity
const getUnitLabel = (cipherType: string, result: GradingResult): string => {
  if (result.unitLabel) {
    return result.unitLabel;
  }
  const plaintextCiphers = [
    "Complete Columnar",
    "Nihilist",
    "Baconian",
    "Checkerboard",
    "Porta",
    "Fractionated Morse",
    "Cryptarithm",
  ];
  return plaintextCiphers.includes(cipherType) ? "plaintext/cipher units" : "units";
};

export function calculateCipherGrade(
  quote: QuoteData,
  quoteIndex: number,
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } } = {},
  questionPoints: { [key: number]: number } = {}
): GradingResult {
  const questionPointValue = resolveQuestionPoints(quote, quoteIndex, questionPoints);

  if (quote.askForKeyword && quote.key) {
    return gradeKeywordOnly(quote, questionPointValue);
  }

  if (isSubstitutionCipher(quote.cipherType)) {
    return gradeSubstitutionCipher(quote, quoteIndex, hintedLetters, questionPointValue);
  }

  const result = routeCipherTypeGrading(quote, quoteIndex, hintedLetters, questionPointValue) || {
    totalInputs: 0,
    correctInputs: 0,
    filledInputs: 0,
    score: 0,
    maxScore: questionPointValue,
    attemptedScore: 0,
  };

  if (result.totalInputs === 0) {
    return {
      totalInputs: 0,
      correctInputs: 0,
      filledInputs: 0,
      score: 0,
      maxScore: questionPointValue,
      attemptedScore: 0,
      unitLabel: "units",
    };
  }

  const attemptedScore =
    result.totalInputs > 0 ? (result.filledInputs / result.totalInputs) * questionPointValue : 0;
  const score =
    result.filledInputs > 0 ? (result.correctInputs / result.filledInputs) * attemptedScore : 0;

  return {
    ...result,
    score: result.score || score,
    maxScore: questionPointValue,
    attemptedScore: result.attemptedScore || attemptedScore,
    unitLabel: getUnitLabel(quote.cipherType, result),
  };
}
