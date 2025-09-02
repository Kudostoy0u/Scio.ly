import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { QuoteData } from '../types';

export const useSolutionHandlers = (
  quotes: QuoteData[],
  setQuotes: Dispatch<SetStateAction<QuoteData[]>>
) => {

  const handleSolutionChange = useCallback((quoteIndex: number, cipherLetter: string, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...(quote.solution || {}), [cipherLetter]: plainLetter } }
        : quote
    ));
  }, [setQuotes]);


  const handleBaconianSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...(quote.solution || {}), [position]: plainLetter.toUpperCase() } }
        : quote
    ));
  }, [setQuotes]);


  const handleFrequencyNoteChange = useCallback((quoteIndex: number, letter: string, note: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, frequencyNotes: { ...(quote.frequencyNotes || {}), [letter]: note } }
        : quote
    ));
  }, [setQuotes]);


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


  const handleKeywordSolutionChange = useCallback((quoteIndex: number, keyword: string) => {
    setQuotes((prevQuotes) => prevQuotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, keywordSolution: keyword }
        : quote
    ));
  }, [setQuotes]);


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
