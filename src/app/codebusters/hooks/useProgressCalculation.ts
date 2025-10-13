import { useMemo } from 'react';
import { QuoteData } from '../types';

export const useProgressCalculation = (quotes: QuoteData[]) => {
  const progressData = useMemo(() => {
    let totalProgress = 0;
    
    if (quotes.length === 0) {
      return { totalProgress: 0, calculateQuoteProgress: () => 0 };
    }

    quotes.forEach(quote => {
      const quoteProgress = calculateQuoteProgress(quote);
      totalProgress += quoteProgress;
    });

    const averageProgress = totalProgress / quotes.length;

    return { 
      totalProgress: averageProgress, 
      calculateQuoteProgress 
    };
  }, [quotes]);

  return progressData;
};

const calculateQuoteProgress = (quote: QuoteData): number => {
  if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Nihilist', 'Fractionated Morse', 'Xenocrypt'].includes(quote.cipherType)) {
    const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])].length;
    const filledLetters = quote.solution ? Object.values(quote.solution).filter(value => value && value.trim() !== '').length : 0;
    return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
  } else if (quote.cipherType === 'Hill 2x2') {
    const matrixSize = 4; // 2x2 = 4 cells
    const matrixProgress = quote.hillSolution?.matrix.reduce((acc, row) => 
      acc + row.filter(cell => cell !== '').length, 0) || 0;
    const plaintextProgress = Object.values(quote.hillSolution?.plaintext || {}).filter(value => value && value.trim() !== '').length / 
      (quote.encrypted.match(/[A-Z]/g)?.length || 1);
    return ((matrixProgress / matrixSize) * 50) + (plaintextProgress * 50);
  } else if (quote.cipherType === 'Hill 3x3') {
    const plaintextProgress = Object.values(quote.hillSolution?.plaintext || {}).filter(value => value && value.trim() !== '').length / 
      (quote.encrypted.match(/[A-Z]/g)?.length || 1);
    return plaintextProgress * 100;
  } else if (quote.cipherType === 'Complete Columnar') {
    const originalLength = quote.quote.toUpperCase().replace(/[^A-Z]/g, '').length;
    const decryptedLength = quote.solution?.decryptedText?.length || 0;
    return originalLength > 0 ? (decryptedLength / originalLength) * 100 : 0;
  } else if (quote.cipherType === 'Nihilist') {
    const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
    const filledPositions = quote.nihilistSolution ? Object.values(quote.nihilistSolution).filter(value => value && value.trim() !== '').length : 0;
    return totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
  } else if (quote.cipherType === 'Checkerboard') {
    const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
    const filledPositions = quote.checkerboardSolution ? Object.values(quote.checkerboardSolution).filter(value => value && value.trim() !== '').length : 0;
    return totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
  } else if (quote.cipherType === 'Fractionated Morse') {
    const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
    const filledPositions = quote.fractionatedSolution ? Object.values(quote.fractionatedSolution).filter(value => value && value.trim() !== '').length : 0;
    return totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
  } else if (quote.cipherType === 'Cryptarithm') {
    const totalPositions = quote.cryptarithmData?.digitGroups.length || 0;
    const filledPositions = quote.cryptarithmSolution ? Object.values(quote.cryptarithmSolution).filter(value => value && value.trim() !== '').length : 0;
    return totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
  }
  
  return 0;
};