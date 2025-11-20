"use client";
import { useCallback } from "react";
import type { QuoteData } from "@/app/codebusters/types";

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
      const longest = words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0]);
      return longest;
    }
    return "";
  };

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

  const getHintContent = useCallback(
    (quote: QuoteData): string => {
      if (!quote) {
        return "No hint available";
      }

      if (quote.cipherType === "Checkerboard") {
        const rowKey = quote.checkerboardRowKey;
        const colKey = quote.checkerboardColKey;
        const polyKey = quote.checkerboardPolybiusKey;
        const usesIj = quote.checkerboardUsesIJ;
        if (rowKey && colKey) {
          return `Row key: ${rowKey}. Column key: ${colKey}. Polybius key: ${polyKey}. ${usesIj ? "I/J combined." : ""}`;
        }
      }

      // Removed unused cipherText/plainText to satisfy lint

      if (quote.cipherType === "Baconian") {
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
      }

      if (quote.cipherType === "Complete Columnar") {
        const words = (quote.quote.match(/[A-Za-z]+/g) || [])
          .map((w: string) => w.toUpperCase())
          .filter((w: string) => w.length >= 3)
          .sort((a: string, b: string) => a.length - b.length);
        if (words.length > 0) {
          const quoteIndex = quotes.indexOf(quote);
          const hintKey = `${quoteIndex}_second_crib`;
          if (activeHints[hintKey as unknown as number]) {
            const shortWords = words.filter((w: string) => w.length >= 5);
            const firstShort = shortWords.length > 0 ? shortWords[0] : undefined;
            const lastWord = words[words.length - 1];
            const cribWord = firstShort || lastWord;
            if (cribWord) {
              return `Second Crib: ${cribWord}`;
            }
          }
          const idx = quotes.indexOf(quote);
          const cribWord = ensureCribWordForIndex(idx, quote.quote);
          return `Crib: ${cribWord}`;
        }
      }

      if (quote.cipherType === "Affine") {
        const idx = quotes.indexOf(quote);
        const cribWord = ensureCribWordForIndex(idx, quote.quote);
        if (cribWord) {
          return `Crib: ${cribWord}`;
        }
      }

      // General crib rule for all other ciphers (avoid single-character cribs)
      {
        const idx = quotes.indexOf(quote);
        const cribWord = ensureCribWordForIndex(idx, quote.quote);
        if (cribWord) {
          return `Crib: ${cribWord}`;
        }
      }

      // Xenocrypts: normalized Spanish letters; still apply min 4/5 rule
      if (
        quote.cipherType === "Random Xenocrypt" ||
        quote.cipherType === "K1 Xenocrypt" ||
        quote.cipherType === "K2 Xenocrypt"
      ) {
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
      }

      return "No hint found";
    },
    [activeHints, quotes, hintCounts, ensureCribWordForIndex]
  );

  const revealRandomLetter = useCallback(
    (questionIndex: number) => {
      const quote = quotes[questionIndex];
      if (!quote) {
        return;
      }

      const currentHintCount = hintCounts[questionIndex] || 0;
      const newHintCount = currentHintCount + 1;
      const newHintCounts = { ...hintCounts, [questionIndex]: newHintCount };
      setHintCounts(newHintCounts);

      if (quote.cipherType === "Checkerboard") {
        const letters = quote.encrypted.replace(/\s+/g, "");
        const tokens: string[] = [];
        for (let i = 0; i < letters.length; i += 2) {
          const a = letters[i];
          const b = letters[i + 1] || "";
          if (a) {
            tokens.push(b ? a + b : a);
          }
        }
        const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
        const current = quote.checkerboardSolution || {};
        const candidates: number[] = [];
        for (let i = 0; i < Math.min(tokens.length, plain.length); i++) {
          const currentValue = current[i];
          if (!currentValue || currentValue.length === 0) {
            candidates.push(i);
          }
        }
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          if (target === undefined) {
            return;
          }
          const targetToken = tokens[target];
          if (targetToken === undefined) {
            return;
          }
          const newQuotes = quotes.map((q, idx) => {
            if (idx !== questionIndex) {
              return q;
            }
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
          });
          setQuotes(newQuotes);
        }
        return;
      }

      if (quote.cipherType === "Nihilist") {
        const groups = quote.encrypted
          .trim()
          .split(/\s+/)
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
        return;
      }

      if (quote.cipherType === "Baconian") {
        const encrypted = quote.encrypted;

        const parsedTokens: { token: string; isGroup: boolean }[] = [];
        let currentGroup = "";
        for (let i = 0; i < encrypted.length; i++) {
          const ch = encrypted[i];
          if (ch && (ch === "A" || ch === "B")) {
            currentGroup += ch;
            if (currentGroup.length === 5) {
              parsedTokens.push({ token: currentGroup, isGroup: true });
              currentGroup = "";
            }
          } else if (ch === " ") {
          } else {
            if (currentGroup.length > 0) {
              if (currentGroup.length === 5) {
                parsedTokens.push({ token: currentGroup, isGroup: true });
              }
              currentGroup = "";
            }
            if (ch) {
              parsedTokens.push({ token: ch, isGroup: false });
            }
          }
        }
        if (currentGroup.length === 5) {
          parsedTokens.push({ token: currentGroup, isGroup: true });
        }

        const groupParsedIdxs: number[] = [];
        const groupTokens: string[] = [];
        parsedTokens.forEach((t, idx) => {
          if (t.isGroup) {
            groupParsedIdxs.push(idx);
            groupTokens.push(t.token);
          }
        });

        const letterOnlyPlain = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");

        const words = (quote.quote.match(/[A-Za-z]+/g) || [])
          .map((w) => w.toUpperCase())
          .filter((w) => w.length >= 3)
          .sort((a, b) => a.length - b.length);
        const cribWord = words[0];
        const cribStart = cribWord ? letterOnlyPlain.indexOf(cribWord) : 0;
        const startLetterIdx = cribStart >= 0 ? cribStart + (cribWord ? cribWord.length : 0) : 0;

        const currentSolution = (quote.solution || {}) as { [key: number]: string };
        let targetGroupOrderIdx = -1;
        for (let k = startLetterIdx; k < groupTokens.length; k++) {
          const parsedIdx = groupParsedIdxs[k];
          if (parsedIdx !== undefined && (!currentSolution[parsedIdx] || currentSolution[parsedIdx].length === 0)) {
            targetGroupOrderIdx = k;
            break;
          }
        }

        if (targetGroupOrderIdx !== -1) {
          const correctPlainLetter = letterOnlyPlain[targetGroupOrderIdx];
          const targetToken = groupTokens[targetGroupOrderIdx];
          if (correctPlainLetter === undefined || targetToken === undefined) {
            return;
          }

          const newQuotes = quotes.map((q, idx) => {
            if (idx !== questionIndex) {
              return q;
            }
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
          });
          if (newQuotes) {
            setQuotes(newQuotes);
          }
        }
        return;
      }

      // For Hill ciphers, we hint plaintext positions (not cipher letters)
      if ((quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") && quote.matrix) {
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
        return;
      }

      const availableLetters = quote.encrypted
        .toUpperCase()
        .split("")
        .filter((char: string) => char && /[A-Z]/.test(char))
        .filter((char: string) => !revealedLetters[questionIndex]?.[char]);

      if (availableLetters.length === 0) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      const randomCipherLetter = availableLetters[randomIndex];
      if (!randomCipherLetter) {
        return;
      }

      let correctPlainLetter = "";

      if (quote.plainAlphabet && quote.cipherAlphabet) {
        const pa = quote.plainAlphabet;
        const ca = quote.cipherAlphabet;
        const idx = ca.indexOf(randomCipherLetter);
        if (idx !== -1 && idx < pa.length) {
          const plainChar = pa[idx];
          if (plainChar) {
            correctPlainLetter = plainChar;
          }
        }
      } else if (quote.cipherType === "Caesar" && quote.caesarShift !== undefined) {
        const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
        const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
        correctPlainLetter = String.fromCharCode(plainIndex + 65);
      } else if (quote.cipherType === "Atbash") {
        const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
        const plainIndex = 25 - cipherIndex;
        correctPlainLetter = String.fromCharCode(plainIndex + 65);
      } else if (
        quote.cipherType === "Affine" &&
        quote.affineA !== undefined &&
        quote.affineB !== undefined
      ) {
        const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;

        let aInverse = 1;
        for (let i = 1; i < 26; i++) {
          if ((quote.affineA * i) % 26 === 1) {
            aInverse = i;
            break;
          }
        }
        const plainIndex = (aInverse * (cipherIndex - quote.affineB + 26)) % 26;
        correctPlainLetter = String.fromCharCode(plainIndex + 65);
      } else if (
        quote.key &&
        [
          "K1 Aristocrat",
          "K2 Aristocrat",
          "K3 Aristocrat",
          "Random Aristocrat",
          "K1 Patristocrat",
          "K2 Patristocrat",
          "K3 Patristocrat",
          "Random Patristocrat",
          "Random Xenocrypt",
        ].includes(quote.cipherType)
      ) {
        const keyIndex = quote.key.indexOf(randomCipherLetter);
        if (keyIndex !== -1) {
          correctPlainLetter = String.fromCharCode(keyIndex + 65);
        }
      } else if (quote.cipherType === "Porta" && quote.portaKeyword) {
        const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
        const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
        const cipherIndex = cipherText.indexOf(randomCipherLetter);

        if (cipherIndex !== -1 && cipherIndex < plainText.length) {
          const plainChar = plainText[cipherIndex];
          if (plainChar) {
            correctPlainLetter = plainChar;
          }
        }
      } else if (
        (quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") &&
        quote.matrix
      ) {
        const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
        const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");

        const cipherIndex = cipherText.indexOf(randomCipherLetter);
        if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
          const plainChar = originalQuote[cipherIndex];
          if (plainChar) {
            correctPlainLetter = plainChar;
          }
        }
      } else if (quote.cipherType === "Fractionated Morse" && quote.fractionationTable) {
        for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
          if (letter === randomCipherLetter && triplet) {
            correctPlainLetter = triplet;
            break;
          }
        }
      } else if (
        quote.cipherType === "Random Xenocrypt" ||
        quote.cipherType === "K1 Xenocrypt" ||
        quote.cipherType === "K2 Xenocrypt"
      ) {
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
            correctPlainLetter = plainChar;
          }
        }
      } else if (quote.nihilistPolybiusKey || quote.nihilistCipherKey) {
        const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
        const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
        const cipherIndex = cipherText.indexOf(randomCipherLetter);

        if (cipherIndex !== -1 && cipherIndex < plainText.length) {
          const plainChar = plainText[cipherIndex];
          if (plainChar) {
            correctPlainLetter = plainChar;
          }
        }
      } else if (quote.cipherType === "Complete Columnar" && quote.columnarKey) {
        const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
        const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
        const cipherIndex = cipherText.indexOf(randomCipherLetter);

        if (cipherIndex !== -1 && cipherIndex < plainText.length) {
          const plainChar = plainText[cipherIndex];
          if (plainChar) {
            correctPlainLetter = plainChar;
          }
        }
      }

      if (correctPlainLetter) {
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

            if (q.cipherType === "Fractionated Morse" && q.fractionationTable) {
              for (const [triplet, letter] of Object.entries(q.fractionationTable)) {
                if (letter === randomCipherLetter) {
                  updatedSolution = {
                    ...updatedSolution,
                    [`replacement_${triplet}`]: randomCipherLetter,
                  };
                  break;
                }
              }
            }

            return {
              ...q,
              solution: updatedSolution,
            };
          }
          return q;
        });
        setQuotes(newQuotes);
      }
    },
    [
      quotes,
      revealedLetters,
      setRevealedLetters,
      setQuotes,
      hintCounts,
      setHintCounts,
      setHintedLetters,
      hintedLetters,
    ]
  );

  const handleHintClick = useCallback(
    (questionIndex: number) => {
      const quote = quotes[questionIndex];
      if (!quote) {
        return;
      }

      if (quote.cipherType === "Cryptarithm" && quote.cryptarithmData) {
        const allLetters = quote.cryptarithmData.digitGroups
          .map((g) => g.word.replace(/\s/g, ""))
          .join("");
        const allDigitsArr: string[] = [];
        quote.cryptarithmData.digitGroups.forEach((g) => {
          g.digits
            .split(" ")
            .filter(Boolean)
            .forEach((d) => allDigitsArr.push(d));
        });
        const current = quote.cryptarithmSolution || {};
        const unfilled: number[] = [];
        for (let i = 0; i < allLetters.length; i++) {
          if (!current[i]) {
            unfilled.push(i);
          }
        }
        if (unfilled.length > 0) {
          const target = unfilled[Math.floor(Math.random() * unfilled.length)];
          if (target === undefined) {
            return;
          }
          const targetDigit = allDigitsArr[target];
          const correctLetter = allLetters[target];
          if (targetDigit === undefined || correctLetter === undefined) {
            return;
          }
          const correct = correctLetter.toUpperCase();
          const positionsToFill: number[] = [];
          allDigitsArr.forEach((d, pos) => {
            if (d === targetDigit) {
              positionsToFill.push(pos);
            }
          });
          const newQuotes = quotes.map((q, idx) => {
            if (idx !== questionIndex) {
              return q;
            }
            const prevSol = q.cryptarithmSolution || {};
            const prevHinted = q.cryptarithmHinted || {};
            const updatedSol: { [key: number]: string } = { ...prevSol };
            const updatedHinted: { [key: number]: boolean } = { ...prevHinted };
            positionsToFill.forEach((p) => {
              updatedSol[p] = correct;
              updatedHinted[p] = true;
            });
            return {
              ...q,
              cryptarithmSolution: updatedSol,
              cryptarithmHinted: updatedHinted,
            } as QuoteData;
          });
          setQuotes(newQuotes);
        }
        return;
      }

      if (quote.cipherType === "Baconian") {
        const currentHintCount = hintCounts[questionIndex] || 0;
        if (currentHintCount === 0) {
          setActiveHints({
            ...activeHints,
            [questionIndex]: true,
          });

          const newHintCounts = { ...hintCounts, [questionIndex]: 1 };
          setHintCounts(newHintCounts);
        } else if (currentHintCount === 1) {
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
        } else {
          revealRandomLetter(questionIndex);
        }
        return;
      }

      const hintContent = getHintContent(quote);
      const hasCrib = hintContent.includes("Crib:") && !hintContent.includes("No crib found");

      if (hasCrib) {
        if (!activeHints[questionIndex]) {
          setActiveHints({
            ...activeHints,
            [questionIndex]: true,
          });
        } else if (
          quote.cipherType === "Complete Columnar" &&
          !activeHints[`${questionIndex}_second_crib` as unknown as number]
        ) {
          setActiveHints({
            ...activeHints,
            [`${questionIndex}_second_crib`]: true,
          });
        } else {
          revealRandomLetter(questionIndex);
        }
      } else {
        revealRandomLetter(questionIndex);
      }
    },
    [
      quotes,
      activeHints,
      setActiveHints,
      getHintContent,
      revealRandomLetter,
      hintCounts,
      setHintCounts,
      setQuotes,
    ]
  );

  return {
    getHintContent,
    handleHintClick,
  };
};
