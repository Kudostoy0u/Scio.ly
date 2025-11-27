import type { QuoteData } from "@/app/codebusters/types";
import { gradeCheckerboard } from "./grading/checkerboardGrading";
import { gradeCryptarithm } from "./grading/cryptarithmGrading";
import { gradeFractionatedMorse } from "./grading/fractionatedMorseGrading";
import { gradeHill2x2, gradeHill3x3 } from "./grading/hillGrading";
import { gradeKeywordOnly } from "./grading/keywordGrading";
import { gradeBaconian, gradeColumnar, gradeNihilist } from "./grading/otherCipherGrading";
import { resolveQuestionPoints } from "./grading/pointsUtils";
import { gradePorta } from "./grading/portaGrading";
import { gradeSubstitutionCipher } from "./grading/substitutionGrading";

export interface GradingResult {
  totalInputs: number;
  correctInputs: number;
  filledInputs: number;
  score: number;
  maxScore: number;
  attemptedScore: number;
  unitLabel?: string;
}

// Re-export for backwards compatibility
export { resolveQuestionPoints };

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
