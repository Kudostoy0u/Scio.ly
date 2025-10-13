import { useState, useEffect } from 'react';
import { QuoteData } from '../types';
import logger from '@/lib/utils/logger';

// import { toast } from 'react-toastify';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  migrateFromLegacyStorage
} from '@/app/utils/timeManagement';

// localstorage keys for different event types
const NORMAL_EVENT_PREFERENCES = 'scio_normal_event_preferences';
const CODEBUSTERS_PREFERENCES = 'scio_codebusters_preferences';


const NORMAL_DEFAULTS = {
  questionCount: 10,
  timeLimit: 15
};

const CODEBUSTERS_DEFAULTS = {
  questionCount: 3,
  timeLimit: 15
};


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
    logger.error('Error loading preferences:', error);
  }
  
  return defaults;
};

export const useCodebustersState = (assignmentId?: string | null) => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(CODEBUSTERS_DEFAULTS.timeLimit * 60);
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
  const [resetTrigger, setResetTrigger] = useState(0);


  useEffect(() => {

    if (hasAttemptedLoad) {
      return;
    }
    
    setHasAttemptedLoad(true);
    
    // Skip localStorage loading if we're in assignment mode
    if (assignmentId) {
      console.log('Assignment mode detected, resetting test state and skipping localStorage loading');
      
      // Reset test state when loading assignment via notifications
      setIsTestSubmitted(false);
      setTestScore(null);
      setTimeLeft(null);
      setQuotes([]);
      setQuotesLoadedFromStorage(false);
      
      // Clear localStorage test state
      localStorage.removeItem('codebustersIsTestSubmitted');
      localStorage.removeItem('codebustersTestScore');
      localStorage.removeItem('codebustersTimeLeft');
      localStorage.removeItem('codebustersQuotes');
      localStorage.removeItem('codebustersQuotesLoadedFromStorage');
      localStorage.removeItem('testParams');
      localStorage.removeItem('testGradingResults');
      localStorage.removeItem('currentTestSession');
      
      setIsLoading(false);
      return;
    }
    
    const testParamsStr = localStorage.getItem('testParams');
    const savedQuotes = localStorage.getItem('codebustersQuotes');
    const savedIsTestSubmitted = localStorage.getItem('codebustersIsTestSubmitted');
    const savedTestScore = localStorage.getItem('codebustersTestScore');
    const forceRefresh = localStorage.getItem('codebustersForceRefresh');
    const savedQuotesLoadedFromStorage = localStorage.getItem('codebustersQuotesLoadedFromStorage');
    

    setIsLoading(true);
    

    if (savedQuotes) {
      try {
        const parsedQuotes: QuoteData[] = JSON.parse(savedQuotes);

        const updatedQuotes = parsedQuotes.map((q) => {
          if (typeof q.points === 'number' && q.points > 0) return q;
          const base = Math.max(5, Math.round(5 + 25 * (q.difficulty ?? 0.5)));
          return { ...q, points: base } as QuoteData;
        });

        if (savedIsTestSubmitted) {
          try { setIsTestSubmitted(JSON.parse(savedIsTestSubmitted)); } catch {}
        }
        if (savedTestScore) {
          try { setTestScore(JSON.parse(savedTestScore)); } catch {}
        }
        setQuotes(updatedQuotes);
        localStorage.setItem('codebustersQuotes', JSON.stringify(updatedQuotes));
        setQuotesLoadedFromStorage(true);
        localStorage.setItem('codebustersQuotesLoadedFromStorage', 'true');
        setIsLoading(false);
        return;
      } catch (e) {
        logger.error('Error parsing saved quotes:', e);
        // fall through to normal path
      }
    }

    if (testParamsStr) {
      logger.log('Found testParams, checking for saved quotes...');

      if (forceRefresh === 'true') {
        logger.log('Force refresh detected, clearing quotes');
        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersForceRefresh');

        setIsLoading(false);
      } else if (savedQuotes) {
        logger.log('Found saved quotes, loading them');
        logger.log('savedIsTestSubmitted:', savedIsTestSubmitted);
        logger.log('savedTestScore:', savedTestScore);
        
        try {
          const parsedQuotes: QuoteData[] = JSON.parse(savedQuotes);

          const updatedQuotes = parsedQuotes.map((q) => {
            if (typeof q.points === 'number' && q.points > 0) return q;
            // fallback based solely on difficulty if present, else minimal default
            const base = Math.max(5, Math.round(5 + 25 * (q.difficulty ?? 0.5)));
            return { ...q, points: base } as QuoteData;
          });

          if (savedIsTestSubmitted) {
            try {
              const isSubmitted = JSON.parse(savedIsTestSubmitted);
              logger.log('Setting isTestSubmitted to:', isSubmitted);
              setIsTestSubmitted(isSubmitted);
            } catch (error) {
              logger.error('Error parsing saved test submitted:', error);
            }
          }
          if (savedTestScore) {
            try {
              const score = JSON.parse(savedTestScore);
              logger.log('Setting testScore to:', score);
              setTestScore(score);
            } catch (error) {
              logger.error('Error parsing saved test score:', error);
            }
          }
          setQuotes(updatedQuotes);
          try { localStorage.setItem('codebustersQuotes', JSON.stringify(updatedQuotes)); } catch {}
          
          setQuotesLoadedFromStorage(true);
          localStorage.setItem('codebustersQuotesLoadedFromStorage', 'true');
        } catch (error) {
          logger.error('Error parsing saved quotes:', error);
          setError('Could not load test data. It might be corrupted.');
        }
      } else {
        logger.log('No saved quotes found, will trigger fresh load');


        setIsLoading(false);
      }


      setRevealedLetters({});
      setHintedLetters({});
      setHintCounts({});


      const testParams = JSON.parse(testParamsStr);
      const eventName = testParams.eventName || 'Codebusters';
      const preferences = loadPreferences(eventName);
      const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
      

      const hasShareCode = localStorage.getItem('shareCode');
      

      let session;
      
      if (!hasShareCode) {

        session = migrateFromLegacyStorage(eventName, timeLimit);
        
        if (!session) {

          session = getCurrentTestSession();
          
          if (!session) {

            session = initializeTestSession(eventName, timeLimit, false);
          } else {

            session = resumeTestSession();
          }
        }
      } else {

        session = getCurrentTestSession();
        
        if (!session) {

          session = initializeTestSession(eventName, timeLimit, true);
        } else {

          session = resumeTestSession();
        }
      }
      
      if (session) {
        setTimeLeft(session.timeState.timeLeft);
        setIsTimeSynchronized(session.timeState.isTimeSynchronized);
        setSyncTimestamp(session.timeState.syncTimestamp);

        if (!savedIsTestSubmitted) {
          setIsTestSubmitted(session.isSubmitted);
        }
      }
    } else {

      setError('No test parameters found. Please configure a test from the practice page.');
    }


    if (savedQuotesLoadedFromStorage === 'true') {
      logger.log('Restoring quotesLoadedFromStorage flag');
      setQuotesLoadedFromStorage(true);
    }
    

    

    logger.log('Setting isLoading to false');
    setIsLoading(false);
  }, [assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (quotes.length > 0) {
      localStorage.setItem('codebustersQuotes', JSON.stringify(quotes));
    }
    if (testScore !== null) {
      localStorage.setItem('codebustersTestScore', JSON.stringify(testScore));
    }
  }, [quotes, testScore]);

  return {

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
    resetTrigger,
    setResetTrigger,

    loadPreferences
  };
};
