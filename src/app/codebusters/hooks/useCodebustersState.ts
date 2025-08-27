import { useState, useEffect } from 'react';
import { QuoteData } from '../types';
// import { toast } from 'react-toastify';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  migrateFromLegacyStorage
} from '@/app/utils/timeManagement';

// localStorage keys for different event types
const NORMAL_EVENT_PREFERENCES = 'scio_normal_event_preferences';
const CODEBUSTERS_PREFERENCES = 'scio_codebusters_preferences';

// Default values
const NORMAL_DEFAULTS = {
  questionCount: 10,
  timeLimit: 15
};

const CODEBUSTERS_DEFAULTS = {
  questionCount: 3,
  timeLimit: 15
};

// Helper functions for localStorage
const loadPreferences = (eventName: string) => {
  const isCodebusters = eventName === 'Codebusters';
  const key = isCodebusters ? CODEBUSTERS_PREFERENCES : NORMAL_EVENT_PREFERENCES;
  const defaults = isCodebusters ? CODEBUSTERS_DEFAULTS : NORMAL_DEFAULTS;
  
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const preferences = JSON.parse(saved);
      return {
        questionCount: preferences.questionCount || defaults.questionCount,
        timeLimit: preferences.timeLimit || defaults.timeLimit
      };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  
  return defaults;
};

export const useCodebustersState = () => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(CODEBUSTERS_DEFAULTS.timeLimit * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [, setIsTimeSynchronized] = useState(false);
  const [, setSyncTimestamp] = useState<number | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [quotesLoadedFromStorage, setQuotesLoadedFromStorage] = useState(false);
  const [activeHints, setActiveHints] = useState<{[questionIndex: number]: boolean}>({});
  const [revealedLetters, setRevealedLetters] = useState<{[questionIndex: number]: {[letter: string]: string}}>({});
  const [hintedLetters, setHintedLetters] = useState<{[questionIndex: number]: {[letter: string]: boolean}}>({});
  const [hintCounts, setHintCounts] = useState<{[questionIndex: number]: number}>({});
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedCipherType, setSelectedCipherType] = useState<string>('');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [questionPoints, setQuestionPoints] = useState<{[key: number]: number}>({});

  // Load data from localStorage on component mount
  useEffect(() => {
    // Prevent double loading
    if (hasAttemptedLoad) {
      return;
    }
    
    setHasAttemptedLoad(true);
    
    const testParamsStr = localStorage.getItem('testParams');
    const savedQuotes = localStorage.getItem('codebustersQuotes');
    const savedIsTestSubmitted = localStorage.getItem('codebustersIsTestSubmitted');
    const savedTestScore = localStorage.getItem('codebustersTestScore');
    const forceRefresh = localStorage.getItem('codebustersForceRefresh');
    const savedQuotesLoadedFromStorage = localStorage.getItem('codebustersQuotesLoadedFromStorage');
    
    // Keep loading true until we've fully processed everything
    setIsLoading(true);
    
    if (testParamsStr) {
      console.log('Found testParams, checking for saved quotes...');
      // Check if we should force refresh (clear saved quotes and load fresh ones)
      if (forceRefresh === 'true') {
        console.log('Force refresh detected, clearing quotes');
        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersForceRefresh');
        // Set loading to false so parent can trigger loadQuestionsFromDatabase
        setIsLoading(false);
      } else if (savedQuotes) {
        console.log('Found saved quotes, loading them');
        console.log('savedIsTestSubmitted:', savedIsTestSubmitted);
        console.log('savedTestScore:', savedTestScore);
        
        try {
          const parsedQuotes = JSON.parse(savedQuotes);
          setQuotes(parsedQuotes);
          
          // Also restore test submission state if it exists
          if (savedIsTestSubmitted) {
            try {
              const isSubmitted = JSON.parse(savedIsTestSubmitted);
              console.log('Setting isTestSubmitted to:', isSubmitted);
              setIsTestSubmitted(isSubmitted);
            } catch (error) {
              console.error('Error parsing saved test submitted:', error);
            }
          }
          
          if (savedTestScore) {
            try {
              const score = JSON.parse(savedTestScore);
              console.log('Setting testScore to:', score);
              setTestScore(score);
            } catch (error) {
              console.error('Error parsing saved test score:', error);
            }
          }
          
          setQuotesLoadedFromStorage(true);
          localStorage.setItem('codebustersQuotesLoadedFromStorage', 'true');
        } catch (error) {
          console.error('Error parsing saved quotes:', error);
          setError('Could not load test data. It might be corrupted.');
        }
      } else {
        console.log('No saved quotes found, will trigger fresh load');
        // If we have params but no quotes, it's a new test, not a shared one.
        // Set loading to false so parent can trigger loadQuestionsFromDatabase
        setIsLoading(false);
      }

      // Reset hint-related state on refresh to start fresh hint tracking
      setRevealedLetters({});
      setHintedLetters({});
      setHintCounts({});

      // Initialize time management system
      const testParams = JSON.parse(testParamsStr);
      const eventName = testParams.eventName || 'Codebusters';
      const preferences = loadPreferences(eventName);
      const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
      
      // Check if this is a fresh reset (no share code)
      const hasShareCode = localStorage.getItem('shareCode');
      
      // Initialize time management session
      let session;
      
      if (!hasShareCode) {
        // Fresh test or reset - try to migrate from legacy storage first
        session = migrateFromLegacyStorage(eventName, timeLimit);
        
        if (!session) {
          // Check if we have an existing session
          session = getCurrentTestSession();
          
          if (!session) {
            // New test - initialize session
            session = initializeTestSession(eventName, timeLimit, false);
          } else {
            // Resume existing session
            session = resumeTestSession();
          }
        }
      } else {
        // Shared test - use existing session or create new one
        session = getCurrentTestSession();
        
        if (!session) {
          // Initialize shared test session
          session = initializeTestSession(eventName, timeLimit, true);
        } else {
          // Resume existing shared session
          session = resumeTestSession();
        }
      }
      
      if (session) {
        setTimeLeft(session.timeState.timeLeft);
        setIsTimeSynchronized(session.timeState.isTimeSynchronized);
        setSyncTimestamp(session.timeState.syncTimestamp);
        // Only set test submitted from session if we don't have a saved value in localStorage
        if (!savedIsTestSubmitted) {
          setIsTestSubmitted(session.isSubmitted);
        }
      }
    } else {
      // No test parameters found - show error
      setError('No test parameters found. Please configure a test from the practice page.');
    }

    // Restore quotesLoadedFromStorage flag from localStorage
    if (savedQuotesLoadedFromStorage === 'true') {
      console.log('Restoring quotesLoadedFromStorage flag');
      setQuotesLoadedFromStorage(true);
    }
    
    // Note: Test submission state and score are now restored when quotes are loaded above
    
    // Set loading to false after everything is processed
    console.log('Setting isLoading to false');
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save state to localStorage
  useEffect(() => {
    if (quotes.length > 0) {
      localStorage.setItem('codebustersQuotes', JSON.stringify(quotes));
    }
    localStorage.setItem('codebustersIsTestSubmitted', JSON.stringify(isTestSubmitted));
    if (testScore !== null) {
      localStorage.setItem('codebustersTestScore', JSON.stringify(testScore));
    }
  }, [quotes, isTestSubmitted, testScore]);

  return {
    // State
    quotes,
    setQuotes,
    isTestSubmitted,
    setIsTestSubmitted,
    testScore,
    setTestScore,
    timeLeft,
    setTimeLeft,
    isLoading,
    setIsLoading,
    error,
    setError,
    showPDFViewer,
    setShowPDFViewer,
    shareModalOpen,
    setShareModalOpen,
    inputCode,
    setInputCode,
    setIsTimeSynchronized,
    setSyncTimestamp,
    hasAttemptedLoad,
    quotesLoadedFromStorage,
    activeHints,
    setActiveHints,
    revealedLetters,
    setRevealedLetters,
    hintedLetters,
    setHintedLetters,
    hintCounts,
    setHintCounts,
    infoModalOpen,
    setInfoModalOpen,
    selectedCipherType,
    setSelectedCipherType,
    printModalOpen,
    setPrintModalOpen,
    tournamentName,
    setTournamentName,
    questionPoints,
    setQuestionPoints,
    // Utilities
    loadPreferences
  };
};
