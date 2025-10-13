import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { clearTestSession } from '@/app/utils/timeManagement';
import { QuoteData } from '../types';

export interface PageActions {
  handleSubmitTest: () => void;
  handleResetTest: () => void;
  handleShareTest: () => void;
  handlePrintTest: () => void;
  handleInfoClick: (cipherType: string) => void;
}

export function usePageActions(
  quotes: QuoteData[],
  isTestSubmitted: boolean,
  setIsTestSubmitted: (submitted: boolean) => void,
  setTestScore: (score: number | null) => void,
  setQuotes: (quotes: QuoteData[]) => void,
  setActiveHints: (hints: { [questionIndex: number]: boolean }) => void,
  setRevealedLetters: (letters: { [questionIndex: number]: { [letter: string]: string } }) => void,
  setHintedLetters: (letters: { [questionIndex: number]: { [letter: string]: boolean } }) => void,
  setHintCounts: (counts: { [questionIndex: number]: number }) => void,
  setResetTrigger: (trigger: (prev: number) => number) => void,
  setShareModalOpen: (open: boolean) => void,
  setPrintModalOpen: (open: boolean) => void,
  setInfoModalOpen: (open: boolean) => void,
  setSelectedCipherType: (type: string) => void,
  _router: any
): PageActions {
  const handleSubmitTest = useCallback(() => {
    // This will be handled by the parent component
    toast.success('Test submitted successfully!');
  }, []);

  const handleResetTest = useCallback(() => {
    setQuotes(quotes.map(q => ({ ...q, userAnswer: '', isCorrect: false })));
    setIsTestSubmitted(false);
    setTestScore(null);
    setActiveHints({});
    setRevealedLetters({});
    setHintedLetters({});
    setHintCounts({});
    setResetTrigger(prev => prev + 1);
    clearTestSession();
    toast.info('Test reset successfully');
  }, [quotes, setQuotes, setIsTestSubmitted, setTestScore, setActiveHints, setRevealedLetters, setHintedLetters, setHintCounts, setResetTrigger]);

  const handleShareTest = useCallback(() => {
    setShareModalOpen(true);
  }, [setShareModalOpen]);

  const handlePrintTest = useCallback(() => {
    setPrintModalOpen(true);
  }, [setPrintModalOpen]);

  const handleInfoClick = useCallback((cipherType: string) => {
    setSelectedCipherType(cipherType);
    setInfoModalOpen(true);
  }, [setSelectedCipherType, setInfoModalOpen]);

  return {
    handleSubmitTest,
    handleResetTest,
    handleShareTest,
    handlePrintTest,
    handleInfoClick
  };
}