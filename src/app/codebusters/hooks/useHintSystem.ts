'use client';
import { useCallback } from 'react';
import { QuoteData } from '../types';

export const useHintSystem = (
  quotes: QuoteData[],
  activeHints: {[questionIndex: number]: boolean},
  setActiveHints: (hints: {[questionIndex: number]: boolean}) => void,
  revealedLetters: {[questionIndex: number]: {[letter: string]: string}},
  setRevealedLetters: (letters: {[questionIndex: number]: {[letter: string]: string}}) => void,
  setQuotes: (quotes: QuoteData[]) => void
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

    const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
    const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');

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
  }, []);

  // Reveal a random correct letter for substitution ciphers
  const revealRandomLetter = useCallback((questionIndex: number) => {
    const quote = quotes[questionIndex];
    if (!quote) return;

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
    } else if (quote.cipherType === 'Baconian') {
      // For Baconian cipher, reveal the binary pattern that maps to this cipher letter
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    } else if (quote.cipherType === 'Nihilist' && (quote.nihilistPolybiusKey || quote.nihilistCipherKey)) {
      // For Nihilist cipher, reveal the position-based mapping
      const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
      const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
      const cipherIndex = cipherText.indexOf(randomCipherLetter);
      
      if (cipherIndex !== -1 && cipherIndex < plainText.length) {
        // Get the corresponding plain letter from the original text
        correctPlainLetter = plainText[cipherIndex];
      }
    } else if (quote.cipherType === 'Columnar Transposition' && quote.columnarKey) {
      // For Columnar Transposition, reveal the position-based mapping
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

      // Update the quotes state to reflect the revealed letter
      const newQuotes = quotes.map((q, idx) => {
        if (idx === questionIndex) {
          return {
            ...q,
            solution: {
              ...q.solution,
              [randomCipherLetter]: correctPlainLetter
            }
          };
        }
        return q;
      });
      setQuotes(newQuotes);
    }
  }, [quotes, revealedLetters, setRevealedLetters, setQuotes]);

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
