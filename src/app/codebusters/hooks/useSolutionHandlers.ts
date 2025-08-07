import { useCallback } from 'react';
import { QuoteData } from '../types';

export const useSolutionHandlers = (quotes: QuoteData[], setQuotes: (quotes: QuoteData[]) => void) => {
  // Handle input change for aristocrat/patristocrat solution
  const handleSolutionChange = useCallback((quoteIndex: number, cipherLetter: string, plainLetter: string) => {
    const newQuotes = quotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...quote.solution, [cipherLetter]: plainLetter.toUpperCase() } }
        : quote
    );
    setQuotes(newQuotes);
  }, [quotes, setQuotes]);

  // Handle input change for baconian solution (uses position-based indexing)
  const handleBaconianSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    const newQuotes = quotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, solution: { ...quote.solution, [position]: plainLetter.toUpperCase() } }
        : quote
    );
    setQuotes(newQuotes);
  }, [quotes, setQuotes]);

  // Handle frequency note change
  const handleFrequencyNoteChange = useCallback((quoteIndex: number, letter: string, note: string) => {
    const newQuotes = quotes.map((quote, index) => 
      index === quoteIndex 
        ? { ...quote, frequencyNotes: { ...quote.frequencyNotes, [letter]: note } }
        : quote
    );
    setQuotes(newQuotes);
  }, [quotes, setQuotes]);

  // Handle Hill cipher solution changes
  const handleHillSolutionChange = useCallback((quoteIndex: number, type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => {
    const newQuotes = quotes.map((quote, index) => 
      index === quoteIndex 
        ? { 
            ...quote, 
            hillSolution: { 
              ...quote.hillSolution, 
              [type]: value 
            } as {
              matrix: string[][];
              plaintext: { [key: number]: string };
            }
          }
        : quote
    );
    setQuotes(newQuotes);
  }, [quotes, setQuotes]);

  // Handle Nihilist cipher solution changes
  const handleNihilistSolutionChange = useCallback((quoteIndex: number, position: number, plainLetter: string) => {
    const newQuotes = quotes.map((quote, index) => {
      if (index === quoteIndex) {
        return {
          ...quote,
          nihilistSolution: {
            ...quote.nihilistSolution,
            [position]: plainLetter
          }
        };
      }
      return quote;
    });
    setQuotes(newQuotes);
  }, [quotes, setQuotes]);

  return {
    handleSolutionChange,
    handleBaconianSolutionChange,
    handleFrequencyNoteChange,
    handleHillSolutionChange,
    handleNihilistSolutionChange
  };
};
