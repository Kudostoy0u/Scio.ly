'use client';
import { useCallback } from 'react';
import { QuoteData } from '../types';
import { toast } from 'react-toastify';

export const useHintSystem = (
  quotes: QuoteData[],
  activeHints: {[questionIndex: number]: boolean},
  setActiveHints: (hints: {[questionIndex: number]: boolean}) => void,
  revealedLetters: {[questionIndex: number]: {[letter: string]: string}},
  setRevealedLetters: (letters: {[questionIndex: number]: {[letter: string]: string}}) => void,
  setQuotes: (quotes: QuoteData[]) => void,
  hintedLetters: {[questionIndex: number]: {[letter: string]: boolean}},
  setHintedLetters: (letters: {[questionIndex: number]: {[letter: string]: boolean}}) => void,
  hintCounts: {[questionIndex: number]: number},
  setHintCounts: (counts: {[questionIndex: number]: number}) => void
) => {

  const find2LetterCrib = (cipherText: string, plainText: string) => {
    for (let i = 0; i < cipherText.length - 1; i++) {
      const crib = cipherText.substring(i, i + 2);
      if (plainText.includes(crib)) {
        return crib;
      }
    }
    return null;
  };

  const find3LetterCrib = (cipherText: string, plainText: string) => {
    for (let i = 0; i < cipherText.length - 2; i++) {
      const crib = cipherText.substring(i, i + 3);
      if (plainText.includes(crib)) {
        return crib;
      }
    }
    return null;
  };

  const find5LetterCrib = (cipherText: string, plainText: string) => {
    for (let i = 0; i < cipherText.length - 4; i++) {
      const crib = cipherText.substring(i, i + 5);
      if (plainText.includes(crib)) {
        return crib;
      }
    }
    return null;
  };

  const findSingleLetterCrib = (cipherText: string, plainText: string) => {
    for (let i = 0; i < cipherText.length; i++) {
      const crib = cipherText[i];
      if (plainText.includes(crib)) {
        return crib;
      }
    }
    return null;
  };

  const findWordCrib = (cipherText: string, plainText: string) => {
    const words = plainText.split(' ').filter(word => word.length > 2);
    for (const word of words) {
      if (cipherText.includes(word)) {
        return word;
      }
    }
    return null;
  };

  const findSpanishWordCrib = (cipherText: string, plainText: string) => {
    // Normalize Spanish text for comparison
    const normalizedPlain = plainText
      .toUpperCase()
      .replace(/Á/g, 'A')
      .replace(/É/g, 'E')
      .replace(/Í/g, 'I')
      .replace(/Ó/g, 'O')
      .replace(/Ú/g, 'U')
      .replace(/Ü/g, 'U')
      .replace(/Ñ/g, 'N');
    
    const words = normalizedPlain.split(' ').filter(word => word.length > 2);
    for (const word of words) {
      if (cipherText.includes(word)) {
        return word;
      }
    }
    return null;
  };

  // Get hint content for a specific quote
  const getHintContent = useCallback((quote: QuoteData): string => {
    if (!quote) return 'No hint available';

    // Special handling: Checkerboard numeric stream
    if (quote.cipherType === 'Checkerboard') {
      const r1 = (quote as any).checkerboardR1 as number;
      const r2 = (quote as any).checkerboardR2 as number;
      const keyword = (quote as any).checkerboardKeyword as string;
      if (typeof r1 === 'number' && typeof r2 === 'number') {
        return `Digits ${r1} and ${r2} start two-digit codes. Keyword: ${keyword}. Top row letters are single-digit columns except ${r1}, ${r2}.`;
      }
    }

    const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
    const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');

    // Special handling for Baconian: crib = smallest word (>=3 letters) from the quote
    if (quote.cipherType === 'Baconian') {
      const words = (quote.quote.match(/[A-Za-z]+/g) || [])
        .map(w => w.toUpperCase())
        .filter(w => w.length >= 3)
        .sort((a, b) => a.length - b.length);
      if (words.length > 0) {
        return `Crib: ${words[0]}`;
      }
      // Fallback to existing logic if no words found
    }

    // Special handling for Complete Columnar: crib = a word from the quote (use smallest >=3)
    if (quote.cipherType === 'Complete Columnar') {
      const words = (quote.quote.match(/[A-Za-z]+/g) || [])
        .map(w => w.toUpperCase())
        .filter(w => w.length >= 3)
        .sort((a, b) => a.length - b.length);
      if (words.length > 0) {
        // For second crib, find shortest word >=5 letters, or longest word as fallback
        if (activeHints[`${quotes.indexOf(quote)}_second_crib`]) {
          const shortWords = words.filter(w => w.length >= 5);
          const cribWord = shortWords.length > 0 ? shortWords[0] : words[words.length - 1];
          return `Second Crib: ${cribWord}`;
        } else {
          // For first crib, use smallest word >=3 letters
          return `Crib: ${words[0]}`;
        }
      }
      // Fallback to existing logic if no words found
    }

    // Try different crib finding strategies
    let crib = find5LetterCrib(cipherText, plainText);
    if (crib) return `Crib: ${crib}`;

    crib = find3LetterCrib(cipherText, plainText);
    if (crib) return `Crib: ${crib}`;

    crib = find2LetterCrib(cipherText, plainText);
    if (crib) return `Crib: ${crib}`;

    crib = findWordCrib(cipherText, plainText);
    if (crib) return `Crib: ${crib}`;

    // For Spanish text (Xenocrypt)
    if (quote.cipherType === 'Xenocrypt') {
      crib = findSpanishWordCrib(cipherText, plainText);
      if (crib) return `Crib: ${crib}`;
    }

    crib = findSingleLetterCrib(cipherText, plainText);
    if (crib) return `Crib: ${crib}`;

    return 'No crib found';
  }, [activeHints, quotes]);

  // Reveal next hint step; for Baconian, reveal sequentially after crib
  const revealRandomLetter = useCallback((questionIndex: number) => {
    const quote = quotes[questionIndex];
    if (!quote) return;

    // Update hint count for this question
    const currentHintCount = hintCounts[questionIndex] || 0;
    const newHintCount = currentHintCount + 1;
    const newHintCounts = { ...hintCounts, [questionIndex]: newHintCount };
    setHintCounts(newHintCounts);

    // Warn on the 3rd hinted letter: subsequent letters (4th and beyond) will be marked as skipped
    if (newHintCount === 3) {
      toast.warning("You've been given three letters. Any additional letters will be marked as skipped.");
    }

    // Checkerboard: reveal a random unsolved token's plaintext
    if (quote.cipherType === 'Checkerboard') {
      const r1 = (quote as any).checkerboardR1 as number;
      const r2 = (quote as any).checkerboardR2 as number;
      const digits = quote.encrypted.replace(/\s+/g, '').split('');
      const tokens: string[] = [];
      for (let i = 0; i < digits.length; i++) {
        const d = parseInt(digits[i], 10);
        if (d === r1 || d === r2) {
          tokens.push(digits[i] + (digits[i + 1] || ''));
          i++;
        } else {
          tokens.push(digits[i]);
        }
      }
      const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const current = (quote as any).checkerboardSolution || {};
      const candidates: number[] = [];
      for (let i = 0; i < Math.min(tokens.length, plain.length); i++) {
        if (!current[i] || current[i].length === 0) {
          candidates.push(i);
        }
      }
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const newQuotes = quotes.map((q, idx) => {
          if (idx !== questionIndex) return q;
          const prev = (q as any).checkerboardSolution || {};
          return { ...q, checkerboardSolution: { ...prev, [target]: plain[target] } } as QuoteData;
        });
        setQuotes(newQuotes);
      }
      return;
    }

    // Nihilist: reveal a random unsolved group position's plaintext
    if (quote.cipherType === 'Nihilist') {
      const groups = quote.encrypted.trim().split(/\s+/).filter(g => g.length > 0);
      const plain = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const current = quote.nihilistSolution || {};
      const candidates: number[] = [];
      for (let i = 0; i < Math.min(groups.length, plain.length); i++) {
        if (!current[i] || current[i].length === 0) {
          candidates.push(i);
        }
      }
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const newQuotes = quotes.map((q, idx) => {
          if (idx !== questionIndex) return q;
          const prev = q.nihilistSolution || {};
          return { ...q, nihilistSolution: { ...prev, [target]: plain[target] } } as QuoteData;
        });
        setQuotes(newQuotes);
      }
      return;
    }

    // Baconian: sequentially reveal letters starting right after the crib, and sync identical 5-bit groups
    if (quote.cipherType === 'Baconian') {
      const encrypted = quote.encrypted;
      // Parse encrypted text into tokens and capture 5-bit groups with their parsed indices
      const parsedTokens: { token: string; isGroup: boolean }[] = [];
      let currentGroup = '';
      for (let i = 0; i < encrypted.length; i++) {
        const ch = encrypted[i];
        if (ch === 'A' || ch === 'B') {
          currentGroup += ch;
          if (currentGroup.length === 5) {
            parsedTokens.push({ token: currentGroup, isGroup: true });
            currentGroup = '';
          }
        } else if (ch === ' ') {
          continue;
        } else {
          if (currentGroup.length > 0) {
            // Flush any partial group (shouldn't happen for valid ciphertext)
            if (currentGroup.length === 5) {
              parsedTokens.push({ token: currentGroup, isGroup: true });
            }
            currentGroup = '';
          }
          parsedTokens.push({ token: ch, isGroup: false });
        }
      }
      if (currentGroup.length === 5) {
        parsedTokens.push({ token: currentGroup, isGroup: true });
      }

      // Build mapping between sequential group order and parsed token indices
      const groupParsedIdxs: number[] = [];
      const groupTokens: string[] = [];
      parsedTokens.forEach((t, idx) => {
        if (t.isGroup) {
          groupParsedIdxs.push(idx);
          groupTokens.push(t.token);
        }
      });

      const letterOnlyPlain = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      // Determine crib: smallest word >=3
      const words = (quote.quote.match(/[A-Za-z]+/g) || [])
        .map(w => w.toUpperCase())
        .filter(w => w.length >= 3)
        .sort((a, b) => a.length - b.length);
      const cribWord = words[0] || '';
      const cribStart = cribWord ? letterOnlyPlain.indexOf(cribWord) : 0;
      const startLetterIdx = cribStart >= 0 ? cribStart + (cribWord ? cribWord.length : 0) : 0;

      // Find first unfilled group after startLetterIdx
      const currentSolution = (quote.solution || {}) as { [key: number]: string };
      let targetGroupOrderIdx = -1;
      for (let k = startLetterIdx; k < groupTokens.length; k++) {
        const parsedIdx = groupParsedIdxs[k];
        if (!currentSolution[parsedIdx] || currentSolution[parsedIdx].length === 0) {
          targetGroupOrderIdx = k;
          break;
        }
      }

      if (targetGroupOrderIdx !== -1) {
        const correctPlainLetter = letterOnlyPlain[targetGroupOrderIdx];
        const targetToken = groupTokens[targetGroupOrderIdx];

        // Prepare updated solution by syncing all identical groups
        const newQuotes = quotes.map((q, idx) => {
          if (idx !== questionIndex) return q;
          const prevSol = (q.solution || {}) as { [key: number]: string };
          const updated: { [key: number]: string } = { ...prevSol };
          groupTokens.forEach((tok, orderIdx) => {
            if (tok === targetToken) {
              const pIdx = groupParsedIdxs[orderIdx];
              updated[pIdx] = correctPlainLetter;
            }
          });
          return { ...q, solution: updated } as QuoteData;
        });
        setQuotes(newQuotes);
      }
      return;
    }

    // Get all cipher letters that haven't been revealed yet
    const availableLetters = quote.encrypted
      .toUpperCase()
      .split('')
      .filter(char => /[A-Z]/.test(char))
      .filter(char => !revealedLetters[questionIndex]?.[char]);

    if (availableLetters.length === 0) return;

    // Pick a random cipher letter
    const randomCipherLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
    
    // Get the correct plain letter for this cipher letter
    let correctPlainLetter = '';
    
    if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.cipherType === 'Atbash') {
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      const plainIndex = 25 - cipherIndex;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
      // For Affine cipher, we need to find the modular inverse
      const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
      // Find modular inverse of affineA mod 26
      let aInverse = 1;
      for (let i = 1; i < 26; i++) {
        if ((quote.affineA * i) % 26 === 1) {
          aInverse = i;
          break;
        }
      }
      const plainIndex = (aInverse * (cipherIndex - quote.affineB + 26)) % 26;
      correctPlainLetter = String.fromCharCode(plainIndex + 65);
    } else if (quote.key && ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat'].includes(quote.cipherType)) {
      // For aristocrat/patristocrat ciphers, find the plain letter from the key
      const keyIndex = quote.key.indexOf(randomCipherLetter);
      if (keyIndex !== -1) {
        correctPlainLetter = String.fromCharCode(keyIndex + 65);
      }
    } else if (quote.cipherType === 'Porta' && quote.portaKeyword) {
      // For Porta cipher, find the position and get the corresponding plain letter
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    } else if ((quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') && quote.matrix) {
      // For Hill cipher, we need to decrypt using the matrix inverse
      // This is complex, so we'll just reveal a letter from the original quote
      const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Find the position of the random cipher letter in the encrypted text
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
        correctPlainLetter = originalQuote[cipherIndex];
      }
    } else if (quote.cipherType === 'Fractionated Morse' && quote.fractionationTable) {
      // For Fractionated Morse, reveal the triplet that maps to this cipher letter
      for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
        if (letter === randomCipherLetter) {
          // Instead of revealing a plain letter, reveal the triplet
          // This will be used to update the replacement table
          correctPlainLetter = triplet; // Store the triplet as the "plain letter"
          break;
        }
      }
    } else if (quote.cipherType === 'Xenocrypt') {
      // For Xenocrypt, handle Spanish text normalization
      const normalizedOriginal = quote.quote.toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ü/g, 'U')
        .replace(/Ñ/g, 'N')
        .replace(/[^A-Z]/g, '');
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      
      // Find the position of the random cipher letter in the encrypted text
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      if (cipherIndex !== -1 && cipherIndex < normalizedOriginal.length) {
        correctPlainLetter = normalizedOriginal[cipherIndex];
      }
    } else if ((quote as any).nihilistPolybiusKey || (quote as any).nihilistCipherKey) {
      // For Nihilist cipher, reveal the position-based mapping
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    } else if (quote.cipherType === 'Complete Columnar' && quote.columnarKey) {
      // For Complete Columnar, reveal the position-based mapping
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    }

    // Update the revealed letters state
    if (correctPlainLetter) {
      const newRevealedLetters = {
        ...revealedLetters,
        [questionIndex]: {
          ...revealedLetters[questionIndex],
          [randomCipherLetter]: correctPlainLetter
        }
      };
      setRevealedLetters(newRevealedLetters);

      // Track if this letter was revealed by a hint (after 3rd hint)
      if (newHintCount > 3) {
        const newHintedLetters = {
          ...hintedLetters,
          [questionIndex]: {
            ...hintedLetters[questionIndex],
            [randomCipherLetter]: true
          }
        };
        setHintedLetters(newHintedLetters);
      }

      // Update the quotes state to reflect the revealed letter
      const newQuotes = quotes.map((q, idx) => {
        if (idx === questionIndex) {
          let updatedSolution = {
            ...q.solution,
            [randomCipherLetter]: correctPlainLetter
          };
          
          // For Fractionated Morse, also update the replacement table
          if (q.cipherType === 'Fractionated Morse' && q.fractionationTable) {
            // Find which triplet this cipher letter maps to
            for (const [triplet, letter] of Object.entries(q.fractionationTable)) {
              if (letter === randomCipherLetter) {
                // Update the replacement table entry for this triplet
                updatedSolution = {
                  ...updatedSolution,
                  [`replacement_${triplet}`]: randomCipherLetter
                };
                break;
              }
            }
          }
          
          return {
            ...q,
            solution: updatedSolution
          };
        }
        return q;
      });
      setQuotes(newQuotes);
    }
  }, [quotes, revealedLetters, setRevealedLetters, setQuotes, hintCounts, setHintCounts, setHintedLetters]);

  // Handle hint functionality
  const handleHintClick = useCallback((questionIndex: number) => {
    const quote = quotes[questionIndex];
    if (!quote) return;

    // Check if this cipher type has a crib available
    const hintContent = getHintContent(quote);
    const hasCrib = hintContent.includes('Crib:') && !hintContent.includes('No crib found');
    
    if (hasCrib) {
      // If crib is not shown yet, show it
      if (!activeHints[questionIndex]) {
        setActiveHints({
          ...activeHints,
          [questionIndex]: true
        });
      } else if (quote.cipherType === 'Complete Columnar' && !activeHints[`${questionIndex}_second_crib`]) {
        // For Complete Columnar, show second crib before revealing random letters
        setActiveHints({
          ...activeHints,
          [`${questionIndex}_second_crib`]: true
        });
      } else {
        // If crib is already shown, reveal a random letter
        revealRandomLetter(questionIndex);
      }
    } else {
      // For ciphers without cribs, always reveal a random correct letter
      revealRandomLetter(questionIndex);
    }
  }, [quotes, activeHints, setActiveHints, getHintContent, revealRandomLetter]);

  return {
    getHintContent,
    handleHintClick
  };
};
