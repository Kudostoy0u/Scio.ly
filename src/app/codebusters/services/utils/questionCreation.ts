import type { CipherResult, QuoteData } from "@/app/codebusters/types";
import { cleanQuote } from "@/app/codebusters/utils/quoteCleaner";
import { computeCipherDifficulty } from "./difficulty";

export interface QuoteDataInput {
  quote: string;
  author: string;
  originalIndex: number;
  isSpanish?: boolean;
  id?: string;
}

export function createQuoteData(
  quote: { id?: string; author: string; quote: string },
  index: number,
  isSpanish: boolean
): QuoteDataInput {
  return {
    quote: quote.quote,
    author: quote.author,
    originalIndex: index,
    isSpanish,
    id: quote.id,
  };
}

export function isXenocryptCipher(cipherType: string): boolean {
  return (
    cipherType === "Random Xenocrypt" ||
    cipherType === "K1 Xenocrypt" ||
    cipherType === "K2 Xenocrypt" ||
    cipherType === "K3 Xenocrypt"
  );
}

export function selectSpanishQuote(
  spanishQuotes: Array<{ id: string; author: string; quote: string }>,
  spanishQuoteIndex: number,
  englishQuoteIndex: number
) {
  if (spanishQuoteIndex >= spanishQuotes.length) {
    return null;
  }
  const spanishQuote = spanishQuotes[spanishQuoteIndex];
  if (!spanishQuote) {
    return null;
  }
  return {
    quoteData: createQuoteData(spanishQuote, spanishQuoteIndex, true),
    newEnglishIndex: englishQuoteIndex,
    newSpanishIndex: spanishQuoteIndex + 1,
    language: "es" as const,
  };
}

export function selectEnglishQuote(
  englishQuotes: Array<{ id: string; author: string; quote: string }>,
  englishQuoteIndex: number,
  spanishQuoteIndex: number
) {
  if (englishQuoteIndex >= englishQuotes.length) {
    return null;
  }
  const englishQuote = englishQuotes[englishQuoteIndex];
  if (!englishQuote) {
    return null;
  }
  return {
    quoteData: createQuoteData(englishQuote, englishQuoteIndex, false),
    newEnglishIndex: englishQuoteIndex + 1,
    newSpanishIndex: spanishQuoteIndex,
    language: "en" as const,
  };
}

export function selectQuoteForCipher(
  cipherType: string,
  englishQuotes: Array<{ id: string; author: string; quote: string }>,
  spanishQuotes: Array<{ id: string; author: string; quote: string }>,
  englishQuoteIndex: number,
  spanishQuoteIndex: number
): {
  quoteData: QuoteDataInput;
  newEnglishIndex: number;
  newSpanishIndex: number;
  language: string;
} | null {
  if (isXenocryptCipher(cipherType)) {
    return (
      selectSpanishQuote(spanishQuotes, spanishQuoteIndex, englishQuoteIndex) ||
      selectEnglishQuote(englishQuotes, englishQuoteIndex, spanishQuoteIndex)
    );
  }
  return selectEnglishQuote(englishQuotes, englishQuoteIndex, spanishQuoteIndex);
}

export function createQuestionFromQuote(
  quoteData: QuoteDataInput,
  normalizedCipherType: string,
  cipherResult: CipherResult
): QuoteData {
  const isK1K2K3Cipher = [
    "K1 Aristocrat",
    "K2 Aristocrat",
    "K3 Aristocrat",
    "K1 Patristocrat",
    "K2 Patristocrat",
    "K3 Patristocrat",
    "K1 Xenocrypt",
    "K2 Xenocrypt",
    "K3 Xenocrypt",
  ].includes(normalizedCipherType);
  const askForKeyword = isK1K2K3Cipher && Math.random() < 0.15;

  const questionEntry = {
    id: quoteData.id,
    author: quoteData.author,
    quote: cleanQuote(quoteData.quote),
    encrypted: cipherResult.encrypted,
    cipherType: normalizedCipherType,
    key: cipherResult.key || undefined,
    kShift: cipherResult.kShift || (normalizedCipherType.includes("K3") ? 1 : undefined),
    plainAlphabet: cipherResult.plainAlphabet,
    cipherAlphabet: cipherResult.cipherAlphabet,
    matrix: cipherResult.matrix || undefined,
    decryptionMatrix: cipherResult.decryptionMatrix,
    portaKeyword: cipherResult.portaKeyword || cipherResult.keyword || undefined,
    nihilistPolybiusKey: cipherResult.polybiusKey,
    nihilistCipherKey: cipherResult.cipherKey,
    checkerboardRowKey: cipherResult.checkerboardRowKey,
    checkerboardColKey: cipherResult.checkerboardColKey,
    checkerboardPolybiusKey: cipherResult.checkerboardPolybiusKey,
    checkerboardUsesIJ: cipherResult.checkerboardUsesIJ,
    blockSize: cipherResult.blockSize,
    columnarKey: normalizedCipherType === "Complete Columnar" ? cipherResult.key : undefined,
    fractionationTable: cipherResult.fractionationTable || undefined,
    caesarShift: cipherResult.shift || cipherResult.caesarShift || undefined,
    affineA: cipherResult.a || cipherResult.affineA || undefined,
    affineB: cipherResult.b || cipherResult.affineB || undefined,
    baconianBinaryType: cipherResult.binaryType,
    cryptarithmData: cipherResult.cryptarithmData,
    difficulty: 0,
    askForKeyword: askForKeyword,
    points: undefined,
  } as QuoteData;

  questionEntry.difficulty = computeCipherDifficulty({
    cipherType: questionEntry.cipherType,
    quote: questionEntry.quote,
    baconianBinaryType: questionEntry.baconianBinaryType,
  });
  questionEntry.points = Math.max(5, Math.round(5 + 25 * questionEntry.difficulty));
  return questionEntry;
}
