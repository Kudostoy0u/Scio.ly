import { useMemo } from 'react';
import { QuoteData } from '../types';

export const useProgressCalculation = (quotes: QuoteData[]) => {
  // Calculate progress for each quote
  const calculateQuoteProgress = (quote: QuoteData): number => {
    if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Nihilist', 'Fractionated Morse', 'Xenocrypt'].includes(quote.cipherType)) {
      const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])].length;
      const filledLetters = quote.solution ? Object.keys(quote.solution).length : 0;
      return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
    } else if (quote.cipherType === 'Hill 2x2') {
      // For Hill 2x2 cipher
      const matrixSize = 4; // 2x2 = 4 cells
      const matrixProgress = quote.hillSolution?.matrix.reduce((acc, row) => 
        acc + row.filter(cell => cell !== '').length, 0) || 0;
      const plaintextProgress = Object.keys(quote.hillSolution?.plaintext || {}).length / 
        (quote.encrypted.match(/[A-Z]/g)?.length || 1);
      return ((matrixProgress / matrixSize) * 50) + (plaintextProgress * 50); // Weight matrix and plaintext equally
    } else if (quote.cipherType === 'Hill 3x3') {
      // For Hill 3x3 cipher, only count plaintext letters as progress
      const plaintextProgress = Object.keys(quote.hillSolution?.plaintext || {}).length / 
        (quote.encrypted.match(/[A-Z]/g)?.length || 1);
      return plaintextProgress * 100;
    } else if (quote.cipherType === 'Complete Columnar') {
      // For Complete Columnar, calculate progress based on decrypted text length
      const originalLength = quote.quote.toUpperCase().replace(/[^A-Z]/g, '').length;
      const decryptedLength = quote.solution?.decryptedText?.length || 0;
      return originalLength > 0 ? (decryptedLength / originalLength) * 100 : 0;
    } else if (quote.cipherType === 'Nihilist') {
      // For Nihilist, calculate progress based on filled positions
      const originalLength = quote.quote.toUpperCase().replace(/[^A-Z]/g, '').length;
      const filledPositions = Object.keys(quote.nihilistSolution || {}).length;
      return originalLength > 0 ? (filledPositions / originalLength) * 100 : 0;
    } else {
      return 0;
    }
  };

  // Calculate overall progress
  const totalProgress = useMemo(() => {
    return quotes.reduce((acc, quote) => 
      acc + calculateQuoteProgress(quote), 0) / (quotes.length || 1);
  }, [quotes]);

  return {
    calculateQuoteProgress,
    totalProgress
  };
};
