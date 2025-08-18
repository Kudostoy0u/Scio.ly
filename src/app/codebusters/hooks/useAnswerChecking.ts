import { useCallback } from 'react';
import { QuoteData } from '../types';

export const useAnswerChecking = (quotes: QuoteData[]) => {
  // Handle checking answer for k1/k2/k3 variants/caesar/atbash/affine/xenocrypt ciphers
  const checkSubstitutionAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (!['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt', 'Nihilist', 'Fractionated Morse', 'Columnar Transposition'].includes(quote.cipherType) || !quote.solution) return false;

    // For caesar cipher
    if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
      const shift = quote.caesarShift;
      for (let i = 0; i < 26; i++) {
        const plainLetter = String.fromCharCode(65 + i);
        const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
        if (quote.solution[cipherLetter] !== plainLetter) return false;
      }
      return true;
    }

    // For atbash cipher
    if (quote.cipherType === 'Atbash') {
      const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
      for (let i = 0; i < 26; i++) {
        const plainLetter = String.fromCharCode(65 + i);
        const cipherLetter = atbashMap[i];
        if (quote.solution[cipherLetter] !== plainLetter) return false;
      }
      return true;
    }

    // For affine cipher
    if (quote.cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
      const a = quote.affineA;
      const b = quote.affineB;
      for (let i = 0; i < 26; i++) {
        const plainLetter = String.fromCharCode(65 + i);
        const cipherLetter = String.fromCharCode(((a * i + b) % 26) + 65);
        if (quote.solution[cipherLetter] !== plainLetter) return false;
      }
      return true;
    }

    // For fractionated morse cipher
    if (quote.cipherType === 'Fractionated Morse') {
      // Check if all cipher letters are correctly mapped to their triplets
      for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
        if (quote.fractionationTable && quote.fractionationTable[triplet] !== cipherLetter) return false;
      }
      return true;
    }

    // For other substitution ciphers (k1/k2/k3 variants, xenocrypt, nihilist, columnar transposition)
    if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Xenocrypt', 'Nihilist', 'Columnar Transposition'].includes(quote.cipherType)) {
      // Check if all cipher letters are correctly mapped
      for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
        if (quote.key && quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter) return false;
      }
      return true;
    }

    return false;
  }, [quotes]);

  // Handle checking answer for Hill cipher
  const checkHillAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if ((quote.cipherType !== 'Hill 2x2' && quote.cipherType !== 'Hill 3x3') || !quote.hillSolution) return false;
    
    // Check if the matrix is correctly filled
    const expectedMatrix = quote.matrix;
    if (!expectedMatrix) return false;
    
    // Check each cell in the matrix
    for (let i = 0; i < expectedMatrix.length; i++) {
      for (let j = 0; j < expectedMatrix[i].length; j++) {
        const expected = expectedMatrix[i][j].toString();
        const actual = quote.hillSolution.matrix[i]?.[j] || '';
        if (actual !== expected) return false;
      }
    }
    
    // Check if the plaintext is correctly filled
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < expectedPlaintext.length; i++) {
      const expected = expectedPlaintext[i];
      const actual = quote.hillSolution.plaintext[i] || '';
      if (actual !== expected) return false;
    }
    
    return true;
  }, [quotes]);

  const checkPortaAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (quote.cipherType !== 'Porta' || !quote.solution) return false;
    
    // Check if all cipher letters are correctly mapped
    for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
      if (quote.key && quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter) return false;
    }
    return true;
  }, [quotes]);

  const checkBaconianAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (quote.cipherType !== 'Baconian' || !quote.solution) return false;
    
    // Check if all positions are correctly filled
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < expectedPlaintext.length; i++) {
      const expected = expectedPlaintext[i];
      const actual = quote.solution[i] || '';
      if (actual !== expected) return false;
    }
    return true;
  }, [quotes]);

  const checkCheckerboardAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (quote.cipherType !== 'Checkerboard' || !quote.checkerboardSolution) return false;
    const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < expectedPlaintext.length; i++) {
      const expected = expectedPlaintext[i];
      const actual = quote.checkerboardSolution[i] || '';
      if (actual !== expected) return false;
    }
    return true;
  }, [quotes]);

  return {
    checkSubstitutionAnswer,
    checkHillAnswer,
    checkPortaAnswer,
    checkBaconianAnswer,
    checkCheckerboardAnswer
  };
};
