import type { QuoteData } from "../types";

// Deterministic crib word selection: prefer smallest word >=5, else >=4, else longest
export const chooseCribWordFromQuote = (raw: string): string => {
  const words = (raw.match(/[A-Za-z]+/g) || []).map((w) => w.toUpperCase());
  if (words.length === 0) {
    return "";
  }
  const pickWithMin = (min: number) => {
    const cand = words.filter((w) => w.length >= min);
    if (cand.length === 0) {
      return "";
    }
    const minLen = cand.reduce((m, w) => Math.min(m, w.length), Number.MAX_SAFE_INTEGER);
    const first = cand.find((w) => w.length === minLen);
    return first || cand[0];
  };
  const firstPick = pickWithMin(5);
  if (firstPick) {
    return firstPick;
  }
  const secondPick = pickWithMin(4);
  if (secondPick) {
    return secondPick;
  }
  if (words.length > 0 && words[0]) {
    const longest = words.reduce(
      (longest, w) => (w.length > longest.length ? w : longest),
      words[0]
    );
    return longest;
  }
  return "";
};

export const getCheckerboardHint = (quote: QuoteData): string | null => {
  if (quote.cipherType !== "Checkerboard") {
    return null;
  }
  const rowKey = quote.checkerboardRowKey;
  const colKey = quote.checkerboardColKey;
  const polyKey = quote.checkerboardPolybiusKey;
  const usesIj = quote.checkerboardUsesIJ;
  if (rowKey && colKey) {
    return `Row key: ${rowKey}. Column key: ${colKey}. Polybius key: ${polyKey}. ${usesIj ? "I/J combined." : ""}`;
  }
  return null;
};

export const getBaconianHint = (
  quote: QuoteData,
  hintCount: number,
  ensureCribWord: (index: number, sourceText: string) => string,
  quoteIndex: number
): string | null => {
  if (quote.cipherType !== "Baconian") {
    return null;
  }
  if (hintCount === 0 && quote.baconianBinaryType) {
    return `Binary Type: ${quote.baconianBinaryType}`;
  }
  if (hintCount >= 1) {
    const cribWord = ensureCribWord(quoteIndex, quote.quote);
    if (cribWord) {
      return `Crib: ${cribWord}`;
    }
  }
  return null;
};

export const getSecondCribForColumnar = (words: string[]): string | null => {
  const shortWords = words.filter((w: string) => w.length >= 5);
  const firstShort = shortWords.length > 0 ? shortWords[0] : undefined;
  const lastWord = words[words.length - 1];
  const cribWord = firstShort || lastWord;
  if (cribWord) {
    return `Second Crib: ${cribWord}`;
  }
  return null;
};

export const getCompleteColumnarHint = (
  quote: QuoteData,
  activeHints: { [questionIndex: number]: boolean },
  quoteIndex: number,
  ensureCribWord: (index: number, sourceText: string) => string
): string | null => {
  if (quote.cipherType !== "Complete Columnar") {
    return null;
  }
  const words = (quote.quote.match(/[A-Za-z]+/g) || [])
    .map((w: string) => w.toUpperCase())
    .filter((w: string) => w.length >= 3)
    .sort((a: string, b: string) => a.length - b.length);
  if (words.length === 0) {
    return null;
  }
  const hintKey = `${quoteIndex}_second_crib`;
  if (activeHints[hintKey as unknown as number]) {
    const secondCrib = getSecondCribForColumnar(words);
    if (secondCrib) {
      return secondCrib;
    }
  }
  const cribWord = ensureCribWord(quoteIndex, quote.quote);
  return `Crib: ${cribWord}`;
};

export const getAffineHint = (
  quote: QuoteData,
  quoteIndex: number,
  ensureCribWord: (index: number, sourceText: string) => string
): string | null => {
  if (quote.cipherType !== "Affine") {
    return null;
  }
  const cribWord = ensureCribWord(quoteIndex, quote.quote);
  if (cribWord) {
    return `Crib: ${cribWord}`;
  }
  return null;
};

export const getXenocryptHint = (
  quote: QuoteData,
  quoteIndex: number,
  ensureCribWord: (index: number, sourceText: string) => string
): string | null => {
  if (
    quote.cipherType !== "Random Xenocrypt" &&
    quote.cipherType !== "K1 Xenocrypt" &&
    quote.cipherType !== "K2 Xenocrypt"
  ) {
    return null;
  }
  const normalized = quote.quote
    .toUpperCase()
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ü/g, "U")
    .replace(/Ñ/g, "N");
  const cribWord = ensureCribWord(quoteIndex, normalized);
  if (cribWord) {
    return `Crib: ${cribWord}`;
  }
  return null;
};

export const getGeneralCribHint = (
  quote: QuoteData,
  quoteIndex: number,
  ensureCribWord: (index: number, sourceText: string) => string
): string | null => {
  const cribWord = ensureCribWord(quoteIndex, quote.quote);
  if (cribWord) {
    return `Crib: ${cribWord}`;
  }
  return null;
};
