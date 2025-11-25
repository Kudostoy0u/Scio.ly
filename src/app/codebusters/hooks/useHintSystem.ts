"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useCallback } from "react";

// Top-level regex patterns for performance
const WHITESPACE_SPLIT_REGEX = /\s+/;
const UPPERCASE_LETTER_REGEX = /[A-Z]/;

// Deterministic crib word selection: prefer smallest word >=5, else >=4, else longest
const chooseCribWordFromQuote = (raw: string): string => {
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

export const useHintSystem = (
  quotes: QuoteData[],
  activeHints: { [questionIndex: number]: boolean },
  setActiveHints: (hints: { [questionIndex: number]: boolean }) => void,
  revealedLetters: { [questionIndex: number]: { [letter: string]: string } },
  setRevealedLetters: (letters: { [questionIndex: number]: { [letter: string]: string } }) => void,
  setQuotes: (quotes: QuoteData[]) => void,
  hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } },
  setHintedLetters: (letters: { [questionIndex: number]: { [letter: string]: boolean } }) => void,
  hintCounts: { [questionIndex: number]: number },
  setHintCounts: (counts: { [questionIndex: number]: number }) => void
) => {
  // Return a stable crib word without mutating state during render
  const ensureCribWordForIndex = useCallback(
    (index: number, sourceText: string): string => {
      const q = quotes[index];
      if (q && typeof q.cribWord === "string" && q.cribWord.length > 0) {
        return q.cribWord;
      }
      return chooseCribWordFromQuote(sourceText);
    },
    [quotes]
  );

  // Helper functions to reduce complexity
  const getCheckerboardHint = useCallback((quote: QuoteData): string | null => {
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
  }, []);

  const getBaconianHint = useCallback(
    (quote: QuoteData): string | null => {
      if (quote.cipherType !== "Baconian") {
        return null;
      }
      const currentHintCount = hintCounts[quotes.indexOf(quote)] || 0;
      if (currentHintCount === 0 && quote.baconianBinaryType) {
        return `Binary Type: ${quote.baconianBinaryType}`;
      }
      if (currentHintCount >= 1) {
        const idx = quotes.indexOf(quote);
        const cribWord = ensureCribWordForIndex(idx, quote.quote);
        if (cribWord) {
          return `Crib: ${cribWord}`;
        }
      }
      return null;
    },
    [quotes, hintCounts, ensureCribWordForIndex]
  );

  const getSecondCribForColumnar = useCallback((words: string[]): string | null => {
    const shortWords = words.filter((w: string) => w.length >= 5);
    const firstShort = shortWords.length > 0 ? shortWords[0] : undefined;
    const lastWord = words[words.length - 1];
    const cribWord = firstShort || lastWord;
    if (cribWord) {
      return `Second Crib: ${cribWord}`;
    }
    return null;
  }, []);

  const getCompleteColumnarHint = useCallback(
    (quote: QuoteData): string | null => {
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
      const quoteIndex = quotes.indexOf(quote);
      const hintKey = `${quoteIndex}_second_crib`;
      if (activeHints[hintKey as unknown as number]) {
        const secondCrib = getSecondCribForColumnar(words);
        if (secondCrib) {
          return secondCrib;
        }
      }
      const idx = quotes.indexOf(quote);
      const cribWord = ensureCribWordForIndex(idx, quote.quote);
      return `Crib: ${cribWord}`;
    },
    [quotes, activeHints, ensureCribWordForIndex, getSecondCribForColumnar]
  );

  const getAffineHint = useCallback(
    (quote: QuoteData): string | null => {
      if (quote.cipherType !== "Affine") {
        return null;
      }
      const idx = quotes.indexOf(quote);
      const cribWord = ensureCribWordForIndex(idx, quote.quote);
      if (cribWord) {
        return `Crib: ${cribWord}`;
      }
      return null;
    },
    [quotes, ensureCribWordForIndex]
  );

  const getXenocryptHint = useCallback(
    (quote: QuoteData): string | null => {
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
      const idx = quotes.indexOf(quote);
      const cribWord = ensureCribWordForIndex(idx, normalized);
      if (cribWord) {
        return `Crib: ${cribWord}`;
      }
      return null;
    },
    [quotes, ensureCribWordForIndex]
  );

  const getGeneralCribHint = useCallback(
    (quote: QuoteData): string | null => {
      const idx = quotes.indexOf(quote);
      const cribWord = ensureCribWordForIndex(idx, quote.quote);
      if (cribWord) {
        return `Crib: ${cribWord}`;
      }
      return null;
    },
    [quotes, ensureCribWordForIndex]
  );

  const getHintContent = useCallback(
    (quote: QuoteData): string => {
      if (!quote) {
        return "No hint available";
      }

      const checkerboardHint = getCheckerboardHint(quote);
      if (checkerboardHint) {
        return checkerboardHint;
      }

      const baconianHint = getBaconianHint(quote);
      if (baconianHint) {
        return baconianHint;
      }

      const columnarHint = getCompleteColumnarHint(quote);
      if (columnarHint) {
        return columnarHint;
      }

      const affineHint = getAffineHint(quote);
      if (affineHint) {
        return affineHint;
      }

      const xenocryptHint = getXenocryptHint(quote);
      if (xenocryptHint) {
        return xenocryptHint;
      }

      const generalHint = getGeneralCribHint(quote);
      if (generalHint) {
        return generalHint;
      }

      return "No hint found";
    },
    [
      getCheckerboardHint,
      getBaconianHint,
      getCompleteColumnarHint,
      getAffineHint,
      getXenocryptHint,
      getGeneralCribHint,
    ]
  );

  // Helper functions to reduce complexity of revealRandomLetter
  const buildCheckerboardTokens = useCallback((encrypted: string): string[] => {
    const letters = encrypted.replace(/\s+/g, "");
    const tokens: string[] = [];
    for (let i = 0; i < letters.length; i += 2) {
      const a = letters[i];
      const b = letters[i + 1] || "";
      if (a) {
        tokens.push(b ? a + b : a);
      }
    }
    return tokens;
  }, []);

  const findCheckerboardCandidates = useCallback(
    (tokens: string[], plain: string, current: { [key: number]: string }): number[] => {
      const candidates: number[] = [];
      for (let i = 0; i < Math.min(tokens.length, plain.length); i++) {
        const currentValue = current[i];
        if (!currentValue || currentValue.length === 0) {
          candidates.push(i);
        }
      }
      return candidates;
    },
    []
  );

  const updateCheckerboardQuote = useCallback(
    (q: QuoteData, tokens: string[], targetToken: string, plain: string): QuoteData => {
      const prev = q.checkerboardSolution || {};
      const prevHinted = q.checkerboardHinted || {};
      const updated: { [key: number]: string } = { ...prev };
      const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
      tokens.forEach((tok, i) => {
        if (tok === targetToken && i < plain.length) {
          const plainChar = plain[i];
          if (plainChar !== undefined) {
            updated[i] = plainChar;
            updatedHinted[i] = true;
          }
        }
      });
      return {
        ...q,
        checkerboardSolution: updated,
        checkerboardHinted: updatedHinted,
      } as QuoteData;
    },
    []
  );

  const revealCheckerboardLetter = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if (quote.cipherType !== "Checkerboard") {
        return false;
      }
      const tokens = buildCheckerboardTokens(quote.encrypted);
      const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
      const current = quote.checkerboardSolution || {};
      const candidates = findCheckerboardCandidates(tokens, plain, current);
      if (candidates.length === 0) {
        return true;
      }
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      if (target === undefined) {
        return true;
      }
      const targetToken = tokens[target];
      if (targetToken === undefined) {
        return true;
      }
      const newQuotes = quotes.map((q, idx) => {
        if (idx !== questionIndex) {
          return q;
        }
        return updateCheckerboardQuote(q, tokens, targetToken, plain);
      });
      setQuotes(newQuotes);
      return true;
    },
    [
      quotes,
      setQuotes,
      buildCheckerboardTokens,
      findCheckerboardCandidates,
      updateCheckerboardQuote,
    ]
  );

  const revealNihilistLetter = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if (quote.cipherType !== "Nihilist") {
        return false;
      }
      const groups = quote.encrypted
        .trim()
        .split(WHITESPACE_SPLIT_REGEX)
        .filter((g) => g.length > 0);
      const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
      const current = quote.nihilistSolution || {};
      const candidates: number[] = [];
      for (let i = 0; i < Math.min(groups.length, plain.length); i++) {
        const currentVal = current[i];
        if (!currentVal || currentVal.length === 0) {
          candidates.push(i);
        }
      }
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const newQuotes = quotes.map((q, idx) => {
          if (idx !== questionIndex) {
            return q;
          }
          const prev = q.nihilistSolution || {};
          const prevHinted = q.nihilistHinted || {};
          if (target !== undefined && plain[target] !== undefined) {
            return {
              ...q,
              nihilistSolution: { ...prev, [target]: plain[target] },
              nihilistHinted: { ...prevHinted, [target]: true },
            } as QuoteData;
          }
          return q;
        });
        setQuotes(newQuotes);
      }
      return true;
    },
    [quotes, setQuotes]
  );

  const processBaconianChar = useCallback(
    (
      ch: string,
      currentGroup: string,
      parsedTokens: { token: string; isGroup: boolean }[]
    ): string => {
      if (ch && (ch === "A" || ch === "B")) {
        const newGroup = currentGroup + ch;
        if (newGroup.length === 5) {
          parsedTokens.push({ token: newGroup, isGroup: true });
          return "";
        }
        return newGroup;
      }
      if (ch === " ") {
        return currentGroup;
      }
      if (currentGroup.length === 5) {
        parsedTokens.push({ token: currentGroup, isGroup: true });
      }
      if (ch) {
        parsedTokens.push({ token: ch, isGroup: false });
      }
      return "";
    },
    []
  );

  const extractBaconianGroups = useCallback(
    (
      parsedTokens: { token: string; isGroup: boolean }[]
    ): {
      groupParsedIdxs: number[];
      groupTokens: string[];
    } => {
      const groupParsedIdxs: number[] = [];
      const groupTokens: string[] = [];
      parsedTokens.forEach((t, idx) => {
        if (t.isGroup) {
          groupParsedIdxs.push(idx);
          groupTokens.push(t.token);
        }
      });
      return { groupParsedIdxs, groupTokens };
    },
    []
  );

  const parseBaconianTokens = useCallback(
    (
      encrypted: string
    ): {
      groupParsedIdxs: number[];
      groupTokens: string[];
    } => {
      const parsedTokens: { token: string; isGroup: boolean }[] = [];
      let currentGroup = "";
      for (const ch of encrypted) {
        currentGroup = processBaconianChar(ch, currentGroup, parsedTokens);
      }
      if (currentGroup.length === 5) {
        parsedTokens.push({ token: currentGroup, isGroup: true });
      }
      return extractBaconianGroups(parsedTokens);
    },
    [processBaconianChar, extractBaconianGroups]
  );

  const getBaconianStartIndex = useCallback((letterOnlyPlain: string, quote: QuoteData): number => {
    const words = (quote.quote.match(/[A-Za-z]+/g) || [])
      .map((w) => w.toUpperCase())
      .filter((w) => w.length >= 3)
      .sort((a, b) => a.length - b.length);
    const cribWord = words[0];
    const cribStart = cribWord ? letterOnlyPlain.indexOf(cribWord) : 0;
    return cribStart >= 0 ? cribStart + (cribWord ? cribWord.length : 0) : 0;
  }, []);

  const findBaconianTargetIndex = useCallback(
    (
      letterOnlyPlain: string,
      quote: QuoteData,
      groupTokens: string[],
      groupParsedIdxs: number[]
    ): number => {
      const startLetterIdx = getBaconianStartIndex(letterOnlyPlain, quote);
      const currentSolution = (quote.solution || {}) as { [key: number]: string };
      for (let k = startLetterIdx; k < groupTokens.length; k++) {
        const parsedIdx = groupParsedIdxs[k];
        if (
          parsedIdx !== undefined &&
          (!currentSolution[parsedIdx] || currentSolution[parsedIdx].length === 0)
        ) {
          return k;
        }
      }
      return -1;
    },
    [getBaconianStartIndex]
  );

  const updateBaconianQuote = useCallback(
    (
      q: QuoteData,
      groupTokens: string[],
      groupParsedIdxs: number[],
      targetToken: string,
      correctPlainLetter: string
    ): QuoteData => {
      const prevSol = (q.solution || {}) as { [key: number]: string };
      const prevHinted = q.baconianHinted || {};
      const updated: { [key: number]: string } = { ...prevSol };
      const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
      groupTokens.forEach((tok, orderIdx) => {
        if (tok === targetToken) {
          const pIdx = groupParsedIdxs[orderIdx];
          if (pIdx !== undefined) {
            updated[pIdx] = correctPlainLetter;
            updatedHinted[pIdx] = true;
          }
        }
      });
      return { ...q, solution: updated, baconianHinted: updatedHinted } as QuoteData;
    },
    []
  );

  const revealBaconianLetter = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if (quote.cipherType !== "Baconian") {
        return false;
      }
      const { groupParsedIdxs, groupTokens } = parseBaconianTokens(quote.encrypted);
      const letterOnlyPlain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
      const targetGroupOrderIdx = findBaconianTargetIndex(
        letterOnlyPlain,
        quote,
        groupTokens,
        groupParsedIdxs
      );
      if (targetGroupOrderIdx === -1) {
        return true;
      }
      const correctPlainLetter = letterOnlyPlain[targetGroupOrderIdx];
      const targetToken = groupTokens[targetGroupOrderIdx];
      if (correctPlainLetter === undefined || targetToken === undefined) {
        return true;
      }
      const newQuotes = quotes.map((q, idx) => {
        if (idx !== questionIndex) {
          return q;
        }
        return updateBaconianQuote(
          q,
          groupTokens,
          groupParsedIdxs,
          targetToken,
          correctPlainLetter
        );
      });
      if (newQuotes) {
        setQuotes(newQuotes);
      }
      return true;
    },
    [quotes, setQuotes, parseBaconianTokens, findBaconianTargetIndex, updateBaconianQuote]
  );

  const revealHillLetter = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if ((quote.cipherType !== "Hill 2x2" && quote.cipherType !== "Hill 3x3") || !quote.matrix) {
        return false;
      }
      const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
      const size = quote.cipherType === "Hill 2x2" ? 2 : 3;
      const required = Math.ceil(plain.length / size) * size;
      const actualSlots = required - (required - plain.length);
      const current = (quote.hillSolution?.plaintext || {}) as { [key: number]: string };
      const candidates: number[] = [];
      for (let i = 0; i < actualSlots; i++) {
        const currentVal = current[i];
        if (!currentVal || currentVal.length === 0) {
          candidates.push(i);
        }
      }
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const newQuotes = quotes.map((q, idx) => {
          if (idx !== questionIndex) {
            return q;
          }
          const prev = q.hillSolution || { matrix: [], plaintext: {} };
          if (target !== undefined && plain[target] !== undefined) {
            return {
              ...q,
              hillSolution: {
                matrix: prev.matrix || [],
                plaintext: { ...(prev.plaintext || {}), [target]: plain[target] },
              },
            } as QuoteData;
          }
          return q;
        });
        setQuotes(newQuotes);
      }
      return true;
    },
    [quotes, setQuotes]
  );

  // Helper functions for getPlainLetterForCipher
  const getPlainLetterFromAlphabets = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    []
  );

  const getPlainLetterCaesar = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
      if (quote.cipherType !== "Caesar" || quote.caesarShift === undefined) {
        return "";
      }
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
      return String.fromCharCode(plainIndex + 65);
    },
    []
  );

  const getPlainLetterAtbash = useCallback((randomCipherLetter: string): string => {
    const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
    const plainIndex = 25 - cipherIndex;
    return String.fromCharCode(plainIndex + 65);
  }, []);

  const getPlainLetterAffine = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
      if (
        quote.cipherType !== "Affine" ||
        quote.affineA === undefined ||
        quote.affineB === undefined
      ) {
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
    },
    []
  );

  const getPlainLetterFromKey = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    []
  );

  const getPlainLetterByPosition = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    []
  );

  const getPlainLetterFractionatedMorse = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
      if (quote.cipherType !== "Fractionated Morse" || !quote.fractionationTable) {
        return "";
      }
      for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
        if (letter === randomCipherLetter && triplet) {
          return triplet;
        }
      }
      return "";
    },
    []
  );

  const getPlainLetterXenocrypt = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    []
  );

  const getPlainLetterHill = useCallback((quote: QuoteData, randomCipherLetter: string): string => {
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
  }, []);

  const getPlainLetterPositionBased = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    [getPlainLetterByPosition]
  );

  const getPlainLetterForCipher = useCallback(
    (quote: QuoteData, randomCipherLetter: string): string => {
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
    },
    [
      getPlainLetterFromAlphabets,
      getPlainLetterCaesar,
      getPlainLetterAtbash,
      getPlainLetterAffine,
      getPlainLetterFromKey,
      getPlainLetterHill,
      getPlainLetterPositionBased,
      getPlainLetterFractionatedMorse,
      getPlainLetterXenocrypt,
    ]
  );

  const updateSolutionForFractionatedMorse = useCallback(
    (
      solution: { [key: string]: string },
      q: QuoteData,
      randomCipherLetter: string
    ): { [key: string]: string } => {
      if (q.cipherType !== "Fractionated Morse" || !q.fractionationTable) {
        return solution;
      }
      for (const [triplet, letter] of Object.entries(q.fractionationTable)) {
        if (letter === randomCipherLetter) {
          return {
            ...solution,
            [`replacement_${triplet}`]: randomCipherLetter,
          };
        }
      }
      return solution;
    },
    []
  );

  const updateRevealedLetterState = useCallback(
    (questionIndex: number, randomCipherLetter: string, correctPlainLetter: string): void => {
      const newRevealedLetters = {
        ...revealedLetters,
        [questionIndex]: {
          ...revealedLetters[questionIndex],
          [randomCipherLetter]: correctPlainLetter,
        },
      };
      setRevealedLetters(newRevealedLetters);

      const newHintedLetters = {
        ...hintedLetters,
        [questionIndex]: {
          ...hintedLetters[questionIndex],
          [randomCipherLetter]: true,
        },
      };
      setHintedLetters(newHintedLetters);

      const newQuotes = quotes.map((q, idx) => {
        if (idx === questionIndex) {
          let updatedSolution = {
            ...q.solution,
            [randomCipherLetter]: correctPlainLetter,
          };
          updatedSolution = updateSolutionForFractionatedMorse(
            updatedSolution,
            q,
            randomCipherLetter
          );
          return {
            ...q,
            solution: updatedSolution,
          };
        }
        return q;
      });
      setQuotes(newQuotes);
    },
    [
      quotes,
      revealedLetters,
      hintedLetters,
      setRevealedLetters,
      setHintedLetters,
      setQuotes,
      updateSolutionForFractionatedMorse,
    ]
  );

  const getAvailableLetters = useCallback(
    (quote: QuoteData, questionIndex: number): string[] => {
      return quote.encrypted
        .toUpperCase()
        .split("")
        .filter((char: string) => char && UPPERCASE_LETTER_REGEX.test(char))
        .filter((char: string) => !revealedLetters[questionIndex]?.[char]);
    },
    [revealedLetters]
  );

  const updateHintCount = useCallback(
    (questionIndex: number): void => {
      const currentHintCount = hintCounts[questionIndex] || 0;
      const newHintCount = currentHintCount + 1;
      const newHintCounts = { ...hintCounts, [questionIndex]: newHintCount };
      setHintCounts(newHintCounts);
    },
    [hintCounts, setHintCounts]
  );

  const tryRevealSpecialCipher = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      return (
        revealCheckerboardLetter(questionIndex, quote) ||
        revealNihilistLetter(questionIndex, quote) ||
        revealBaconianLetter(questionIndex, quote) ||
        revealHillLetter(questionIndex, quote)
      );
    },
    [revealCheckerboardLetter, revealNihilistLetter, revealBaconianLetter, revealHillLetter]
  );

  const revealRandomLetter = useCallback(
    (questionIndex: number) => {
      const quote = quotes[questionIndex];
      if (!quote) {
        return;
      }
      updateHintCount(questionIndex);
      if (tryRevealSpecialCipher(questionIndex, quote)) {
        return;
      }
      const availableLetters = getAvailableLetters(quote, questionIndex);
      if (availableLetters.length === 0) {
        return;
      }
      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      const randomCipherLetter = availableLetters[randomIndex];
      if (!randomCipherLetter) {
        return;
      }
      const correctPlainLetter = getPlainLetterForCipher(quote, randomCipherLetter);
      if (correctPlainLetter) {
        updateRevealedLetterState(questionIndex, randomCipherLetter, correctPlainLetter);
      }
    },
    [
      quotes,
      getPlainLetterForCipher,
      updateRevealedLetterState,
      getAvailableLetters,
      updateHintCount,
      tryRevealSpecialCipher,
    ]
  );

  const extractCryptarithmData = useCallback(
    (quote: QuoteData): { allLetters: string; allDigitsArr: string[] } => {
      const allLetters =
        quote.cryptarithmData?.digitGroups.map((g) => g.word.replace(/\s/g, "")).join("") || "";
      const allDigitsArr: string[] = [];
      for (const g of quote.cryptarithmData?.digitGroups || []) {
        const digits = g.digits.split(" ").filter(Boolean);
        for (const d of digits) {
          allDigitsArr.push(d);
        }
      }
      return { allLetters, allDigitsArr };
    },
    []
  );

  const findUnfilledCryptarithmPositions = useCallback(
    (allLetters: string, current: { [key: number]: string }): number[] => {
      const unfilled: number[] = [];
      for (let i = 0; i < allLetters.length; i++) {
        if (!current[i]) {
          unfilled.push(i);
        }
      }
      return unfilled;
    },
    []
  );

  const findPositionsToFill = useCallback(
    (allDigitsArr: string[], targetDigit: string): number[] => {
      const positionsToFill: number[] = [];
      allDigitsArr.forEach((d, pos) => {
        if (d === targetDigit) {
          positionsToFill.push(pos);
        }
      });
      return positionsToFill;
    },
    []
  );

  const updateCryptarithmQuote = useCallback(
    (q: QuoteData, positionsToFill: number[], correct: string): QuoteData => {
      const prevSol = q.cryptarithmSolution || {};
      const prevHinted = q.cryptarithmHinted || {};
      const updatedSol: { [key: number]: string } = { ...prevSol };
      const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
      for (const p of positionsToFill) {
        updatedSol[p] = correct;
        updatedHinted[p] = true;
      }
      return {
        ...q,
        cryptarithmSolution: updatedSol,
        cryptarithmHinted: updatedHinted,
      } as QuoteData;
    },
    []
  );

  const handleCryptarithmHint = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if (quote.cipherType !== "Cryptarithm" || !quote.cryptarithmData) {
        return false;
      }
      const { allLetters, allDigitsArr } = extractCryptarithmData(quote);
      const current = quote.cryptarithmSolution || {};
      const unfilled = findUnfilledCryptarithmPositions(allLetters, current);
      if (unfilled.length === 0) {
        return true;
      }
      const target = unfilled[Math.floor(Math.random() * unfilled.length)];
      if (target === undefined) {
        return true;
      }
      const targetDigit = allDigitsArr[target];
      const correctLetter = allLetters[target];
      if (targetDigit === undefined || correctLetter === undefined) {
        return true;
      }
      const correct = correctLetter.toUpperCase();
      const positionsToFill = findPositionsToFill(allDigitsArr, targetDigit);
      const newQuotes = quotes.map((q, idx) => {
        if (idx !== questionIndex) {
          return q;
        }
        return updateCryptarithmQuote(q, positionsToFill, correct);
      });
      setQuotes(newQuotes);
      return true;
    },
    [
      quotes,
      setQuotes,
      extractCryptarithmData,
      findUnfilledCryptarithmPositions,
      findPositionsToFill,
      updateCryptarithmQuote,
    ]
  );

  const handleBaconianHint = useCallback(
    (questionIndex: number, quote: QuoteData): boolean => {
      if (quote.cipherType !== "Baconian") {
        return false;
      }
      const currentHintCount = hintCounts[questionIndex] || 0;
      if (currentHintCount === 0) {
        setActiveHints({
          ...activeHints,
          [questionIndex]: true,
        });
        const newHintCounts = { ...hintCounts, [questionIndex]: 1 };
        setHintCounts(newHintCounts);
        return true;
      }
      if (currentHintCount === 1) {
        const words = (quote.quote.match(/[A-Za-z]+/g) || [])
          .map((w) => w.toUpperCase())
          .filter((w) => w.length >= 3)
          .sort((a, b) => a.length - b.length);
        if (words.length > 0) {
          setActiveHints({
            ...activeHints,
            [questionIndex]: true,
          });
        } else {
          revealRandomLetter(questionIndex);
        }
        return true;
      }
      revealRandomLetter(questionIndex);
      return true;
    },
    [activeHints, setActiveHints, hintCounts, setHintCounts, revealRandomLetter]
  );

  const handleCribHint = useCallback(
    (questionIndex: number, quote: QuoteData): void => {
      const hintContent = getHintContent(quote);
      const hasCrib = hintContent.includes("Crib:") && !hintContent.includes("No crib found");
      if (!hasCrib) {
        revealRandomLetter(questionIndex);
        return;
      }
      if (!activeHints[questionIndex]) {
        setActiveHints({
          ...activeHints,
          [questionIndex]: true,
        });
        return;
      }
      if (
        quote.cipherType === "Complete Columnar" &&
        !activeHints[`${questionIndex}_second_crib` as unknown as number]
      ) {
        setActiveHints({
          ...activeHints,
          [`${questionIndex}_second_crib`]: true,
        });
        return;
      }
      revealRandomLetter(questionIndex);
    },
    [activeHints, setActiveHints, getHintContent, revealRandomLetter]
  );

  const handleHintClick = useCallback(
    (questionIndex: number) => {
      const quote = quotes[questionIndex];
      if (!quote) {
        return;
      }
      if (handleCryptarithmHint(questionIndex, quote)) {
        return;
      }
      if (handleBaconianHint(questionIndex, quote)) {
        return;
      }
      handleCribHint(questionIndex, quote);
    },
    [quotes, handleCryptarithmHint, handleBaconianHint, handleCribHint]
  );

  return {
    getHintContent,
    handleHintClick,
  };
};
