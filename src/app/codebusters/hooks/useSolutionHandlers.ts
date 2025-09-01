import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { QuoteData } from '../types';

export const useSolutionHandlers = (
  quotes: QuoteData[],
  setQuotes: Dispatch<SetStateAction<QuoteData[]>>
) => {
  // Handle input change for aristocrat/patristocrat solution
  const handleSolutionChange = useCallback((quoteIndex: number, cipherLetter: string, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...(quote.solution || {}), [cipherLetter]: plainLetter } }
        : quote
    ));
  }, [setQuotes]);

  // Handle input change for baconian solution (uses position-based indexing)
  const handleBaconianSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...(quote.solution || {}), [position]: plainLetter.toUpperCase() } }
        : quote
    ));
  }, [setQuotes]);

  // Handle frequency note change
  const handleFrequencyNoteChange = useCallback((quoteIndex: number, letter: string, note: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, frequencyNotes: { ...(quote.frequencyNotes || {}), [letter]: note } }
        : quote
    ));
  }, [setQuotes]);

  // Handle Hill cipher solution changes
  const handleHillSolutionChange = useCallback((quoteIndex: number, type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { 
            ...quote, 
            hillSolution: { 
              ...(quote.hillSolution || { matrix: [], plaintext: {} }), 
              [type]: value 
            } as {
              matrix: string[][];
              plaintext: { [key: number]: string };
            }
          }
        : quote
    ));
  }, [setQuotes]);

  // Handle Nihilist cipher solution changes
  const handleNihilistSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => {
      if (index === quoteIndex) {
        return {
          ...quote,
          nihilistSolution: {
            ...(quote.nihilistSolution || {}),
            [position]: plainLetter
          }
        };
      }
      return quote;
    }));
  }, [setQuotes]);

  // Handle Checkerboard cipher solution changes (position-based like Nihilist)
  const handleCheckerboardSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => {
      if (index === quoteIndex) {
        return {
          ...quote,
          checkerboardSolution: {
            ...(quote.checkerboardSolution || {}),
            [position]: plainLetter.toUpperCase()
          }
        };
      }
      return quote;
    }));
  }, [setQuotes]);

  // Handle keyword solution changes for K1, K2, K3 ciphers when askForKeyword is true
  const handleKeywordSolutionChange = useCallback((quoteIndex: number, keyword: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, keywordSolution: keyword }
        : quote
    ));
  }, [setQuotes]);

  // Handle Cryptarithm cipher solution changes (position-based like Nihilist)
  const handleCryptarithmSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => {
      if (index === quoteIndex) {
        return {
          ...quote,
          cryptarithmSolution: {
            ...(quote.cryptarithmSolution || {}),
            [position]: plainLetter.toUpperCase()
          }
        };
      }
      return quote;
    }));
  }, [setQuotes]);

  return {
    handleSolutionChange,
    handleBaconianSolutionChange,
    handleFrequencyNoteChange,
    handleHillSolutionChange,
    handleNihilistSolutionChange,
    handleCheckerboardSolutionChange,
    handleKeywordSolutionChange,
    handleCryptarithmSolutionChange
  };
};
