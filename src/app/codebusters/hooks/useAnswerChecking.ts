import { useCallback } from 'react';
import { QuoteData } from '../types';


const generateKeywordAlphabet = (keyword: string): string => {
    const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    const used = new Set<string>();
    const result: string[] = [];
    

    for (const char of cleanKeyword) {
        if (!used.has(char)) {
            used.add(char);
            result.push(char);
        }
    }
    

    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        if (!used.has(char)) {
            result.push(char);
        }
    }
    
    return result.join('');
};

export const useAnswerChecking = (quotes: QuoteData[]) => {

  const checkSubstitutionAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (!['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Nihilist', 'Fractionated Morse', 'Complete Columnar'].includes(quote.cipherType) || !quote.solution) return false;


    if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
      const shift = quote.caesarShift;
      for (let i = 0; i < 26; i++) {
        const plainLetter = String.fromCharCode(65 + i);
        const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
        if (quote.solution[cipherLetter] !== plainLetter) return false;
      }
      return true;
    }


    if (quote.cipherType === 'Atbash') {
      const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
      for (let i = 0; i < 26; i++) {
        const plainLetter = String.fromCharCode(65 + i);
        const cipherLetter = atbashMap[i];
        if (quote.solution[cipherLetter] !== plainLetter) return false;
      }
      return true;
    }


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


    if (quote.cipherType === 'Fractionated Morse') {

      for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
        if (quote.fractionationTable && quote.fractionationTable[triplet] !== cipherLetter) return false;
      }
      return true;
    }


    if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Random Xenocrypt', 'K1 Xenocrypt', 'K2 Xenocrypt', 'Nihilist', 'Complete Columnar'].includes(quote.cipherType)) {

      if (quote.askForKeyword) {


        const userKeyword = (quote.keywordSolution || '').toUpperCase().replace(/[^A-Z]/g, '');
        const expectedKeyword = quote.key || '';
        

        return userKeyword === expectedKeyword.toUpperCase();
      }
      

      if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'K1 Xenocrypt', 'K2 Xenocrypt', 'K3 Xenocrypt'].includes(quote.cipherType)) {

        const keyword = quote.key || '';
        const isXeno = quote.cipherType.includes('Xenocrypt');

        const substitutionMap: { [key: string]: string } = {};

        if (quote.plainAlphabet && quote.cipherAlphabet) {
          const pa = quote.plainAlphabet;
          const ca = quote.cipherAlphabet;
          const len = Math.min(pa.length, ca.length);
          for (let i = 0; i < len; i++) substitutionMap[pa[i]] = ca[i];
        } else if (quote.cipherType.includes('K3')) {
          const base = generateKeywordAlphabet(keyword);
          const alpha = isXeno ? base + 'Ñ' : base;
          const len = isXeno ? 27 : 26;
          const kShift = (quotes[quoteIndex] as any).kShift ?? 1;
          for (let i = 0; i < len; i++) {
            const shiftedIndex = (i + kShift) % len;
            substitutionMap[alpha[i]] = alpha[shiftedIndex];
          }
        } else {
          const plainAlphabet = quote.cipherType.includes('K1')
            ? (isXeno ? generateKeywordAlphabet(keyword) + 'Ñ' : generateKeywordAlphabet(keyword))
            : (isXeno ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
          const baseCipher = quote.cipherType.includes('K1')
            ? (isXeno ? 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            : (isXeno ? generateKeywordAlphabet(keyword) + 'Ñ' : generateKeywordAlphabet(keyword));
          const kShift = (quotes[quoteIndex] as any).kShift ?? 0;
          const cipherAlphabet = baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
          const len = isXeno ? 27 : 26;
          for (let i = 0; i < len; i++) {
            substitutionMap[plainAlphabet[i]] = cipherAlphabet[i];
          }
        }

        for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
          if (substitutionMap[plainLetter] !== cipherLetter) return false;
        }
        return true;
      }
      

      for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
        if (quote.key && quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter) return false;
      }
      return true;
    }

    return false;
  }, [quotes]);


  const checkHillAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if ((quote.cipherType !== 'Hill 2x2' && quote.cipherType !== 'Hill 3x3') || !quote.hillSolution) return false;
    

    const expectedMatrix = quote.matrix;
    if (!expectedMatrix) return false;
    

    for (let i = 0; i < expectedMatrix.length; i++) {
      for (let j = 0; j < expectedMatrix[i].length; j++) {
        const expected = expectedMatrix[i][j].toString();
        const actual = quote.hillSolution.matrix[i]?.[j] || '';
        if (actual !== expected) return false;
      }
    }
    

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
    

    for (const [cipherLetter, plainLetter] of Object.entries(quote.solution)) {
      if (quote.key && quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter) return false;
    }
    return true;
  }, [quotes]);

  const checkBaconianAnswer = useCallback((quoteIndex: number): boolean => {
    const quote = quotes[quoteIndex];
    if (quote.cipherType !== 'Baconian' || !quote.solution) return false;
    

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
    if (quote.cipherType !== 'Cryptarithm' || !quote.cryptarithmSolution || !quote.cryptarithmData) return false;
    

    const expectedWords = quote.cryptarithmData.digitGroups.map(group => group.word.replace(/\s/g, ''));
    const allExpectedLetters = expectedWords.join('');
    

    for (let i = 0; i < allExpectedLetters.length; i++) {
      const expected = allExpectedLetters[i];
      const actual = quote.cryptarithmSolution[i] || '';
      if (actual !== expected) return false;
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
