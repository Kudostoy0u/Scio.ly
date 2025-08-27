import { useCallback } from 'react';
import { QuoteData } from '../types';

// Helper function for keyword-based alphabet generation (copied from cipher-utils)
const generateKeywordAlphabet = (keyword: string): string => {
    const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    const used = new Set<string>();
    const result: string[] = [];
    
    // Add keyword letters first (removing duplicates)
    for (const char of cleanKeyword) {
        if (!used.has(char)) {
            used.add(char);
            result.push(char);
        }
    }
    
    // Add remaining alphabet letters
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        if (!used.has(char)) {
            result.push(char);
        }
    }
    
    return result.join('');
};

export const useAnswerChecking = (quotes: QuoteData[]) => {
  // Handle checking answer for k1/k2/k3 variants/caesar/atbash/affine/xenocrypt ciphers
  const checkSubstitutionAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (!['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Nihilist', 'Fractionated Morse', 'Complete Columnar'].includes(quote.cipherType) || !quote.solution) return false;

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

    // For other substitution ciphers (k1/k2/k3 variants, xenocrypt, nihilist, complete columnar)
    if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Nihilist', 'Complete Columnar'].includes(quote.cipherType)) {
      // If asking for keyword/key phrase, check if the keyword is correct
      if (quote.askForKeyword) {
        // For K1, K2, K3 ciphers, the key contains the keyword used to construct the alphabet
        // We need to check if the user's keyword solution matches the keyword
        const userKeyword = (quote.keywordSolution || '').toUpperCase().replace(/[^A-Z]/g, '');
        const expectedKeyword = quote.key || '';
        
        // Check if the user's keyword matches the expected keyword (case-insensitive)
        return userKeyword === expectedKeyword.toUpperCase();
      }
      
      // For keyword-based ciphers (K1, K2, K3), we need to reconstruct the substitution mapping
      if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt'].includes(quote.cipherType)) {
        // Reconstruct the substitution mapping from the keyword
        const keyword = quote.key || '';
        const plainAlphabet = generateKeywordAlphabet(keyword);
        const cipherAlphabet = quote.cipherType.includes('K1') || quote.cipherType.includes('K3') 
          ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' 
          : generateKeywordAlphabet(keyword);
        
        // Handle K3 shift to avoid self-mapping
        const shift = quote.cipherType.includes('K3') ? 1 : 0;
        
        // Create substitution mapping
        const substitutionMap: { [key: string]: string } = {};
        for (let i = 0; i < 26; i++) {
          const shiftedIndex = (i + shift) % 26;
          substitutionMap[plainAlphabet[i]] = cipherAlphabet[shiftedIndex];
        }
        
        // Check if all cipher letters are correctly mapped
        for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
          if (substitutionMap[plainLetter] !== cipherLetter) return false;
        }
        return true;
      }
      
      // For other ciphers, use the existing logic
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

  const checkCryptarithmAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (quote.cipherType !== 'Cryptarithm' || !quote.solution || !quote.cryptarithmData) return false;
    
    // Check if the letter-to-digit mapping is correct based on the puzzle
    const equation = quote.cryptarithmData.equation;
    let expectedMapping: { [key: string]: string } = {};
    
    // Determine expected mapping based on the equation
    if (equation.includes('E A T') && equation.includes('T H A T') && equation.includes('A P P L E')) {
      // EAT + THAT = APPLE puzzle
      expectedMapping = {
        'A': '1', 'E': '8', 'H': '2', 'L': '3', 'P': '0', 'T': '9'
      };
    } else if (equation.includes('S E N D') && equation.includes('M O R E') && equation.includes('M O N E Y')) {
      // SEND + MORE = MONEY puzzle
      expectedMapping = {
        'S': '9', 'E': '5', 'N': '6', 'D': '7', 'M': '1', 'O': '0', 'R': '8', 'Y': '2'
      };
    } else if (equation.includes('C R O S S') && equation.includes('R O A D S') && equation.includes('D A N G E R')) {
      // CROSS + ROADS = DANGER puzzle
      expectedMapping = {
        'C': '9', 'R': '6', 'O': '2', 'S': '3', 'A': '1', 'D': '5', 'N': '8', 'G': '4', 'E': '0'
      };
    }
    
    // Check each letter mapping
    for (const [letter, digit] of Object.entries(expectedMapping)) {
      if (quote.solution[letter] !== digit) return false;
    }
    
    return true;
  }, [quotes]);

  return {
    checkSubstitutionAnswer,
    checkHillAnswer,
    checkPortaAnswer,
    checkBaconianAnswer,
    checkCheckerboardAnswer,
    checkCryptarithmAnswer
  };
};
