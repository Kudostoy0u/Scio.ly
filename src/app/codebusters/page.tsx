'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation';
import { FaShareAlt } from 'react-icons/fa';

import ShareModal from '@/app/components/ShareModal';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  updateTimeLeft,
  markTestSubmitted,
  migrateFromLegacyStorage,
  setupVisibilityHandling,
  clearTestSession
} from '@/app/utils/timeManagement';
import {
  formatTime,
  encryptK1Aristocrat,
  encryptK2Aristocrat,
  encryptK3Aristocrat,
  encryptK1Patristocrat,
  encryptK2Patristocrat,
  encryptK3Patristocrat,
  encryptRandomAristocrat,
  encryptRandomPatristocrat,
  encryptCaesar,
  encryptAtbash,
  encryptAffine,
  encryptHill,
  encryptPorta,
  encryptBaconian,
  encryptNihilist,
  encryptFractionatedMorse,
  encryptColumnarTransposition,
  encryptXenocrypt
} from './cipher-utils';
import {
  HillDisplay,
  PortaDisplay,
  SubstitutionDisplay,
  FractionatedMorseDisplay,
  BaconianDisplay
} from './cipher-displays';
import { QuoteData } from './types';

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

export default function CodeBusters() {
    const { darkMode } = useTheme();
    const router = useRouter();
    const [quotes, setQuotes] = useState<QuoteData[]>([]);
    const [isTestSubmitted, setIsTestSubmitted] = useState(false);
    const [testScore, setTestScore] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(CODEBUSTERS_DEFAULTS.timeLimit * 60); // Default time limit in seconds
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPDFViewer, setShowPDFViewer] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [inputCode, setInputCode] = useState<string>('');
    const [, setIsTimeSynchronized] = useState(false);
    const [, setSyncTimestamp] = useState<number | null>(null);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
    const [activeHints, setActiveHints] = useState<{[questionIndex: number]: boolean}>({});
    const [revealedLetters, setRevealedLetters] = useState<{[questionIndex: number]: {[letter: string]: string}}>({});

    // Handle checking answer for k1/k2/k3 variants/caesar/atbash/affine/xenocrypt ciphers
    const checkSubstitutionAnswer = useCallback((quoteIndex: number): boolean => {
        const quote = quotes[quoteIndex];
        if (!['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt', 'Nihilist', 'Fractionated Morse', 'Columnar Transposition'].includes(quote.cipherType) || !quote.solution) return false;

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

        // For other substitution ciphers (k1/k2/k3 variants, xenocrypt, nihilist, columnar transposition)
        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Xenocrypt', 'Nihilist', 'Columnar Transposition'].includes(quote.cipherType)) {
            // Check if all cipher letters are correctly mapped
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
        if (quote.cipherType !== 'Hill' || !quote.hillSolution) return false;
        
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

    // Update handleSubmitTest to include Baconian cipher checking
    const handleSubmitTest = useCallback(() => {
        let correctCount = 0;
        quotes.forEach((quote, index) => {
            const isCorrect = ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine'].includes(quote.cipherType)
                ? checkSubstitutionAnswer(index)
                : quote.cipherType === 'Hill'
                    ? checkHillAnswer(index)
                    : quote.cipherType === 'Porta'
                        ? checkPortaAnswer(index)
                        : quote.cipherType === 'Baconian'
                            ? checkBaconianAnswer(index)
                            : false;
            if (isCorrect) correctCount++;
        });

        // Calculate score as percentage
        const score = (correctCount / quotes.length) * 100;
        setTestScore(score);
        setIsTestSubmitted(true);
        
        // Mark test as submitted using new time management system
        markTestSubmitted();
    }, [quotes, checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer]);

    // Setup visibility handling for time management
    useEffect(() => {
        const cleanup = setupVisibilityHandling();
        return cleanup;
    }, []);

    // Calculate progress for each quote
    const calculateQuoteProgress = (quote: QuoteData): number => {
        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Nihilist', 'Fractionated Morse', 'Columnar Transposition', 'Xenocrypt'].includes(quote.cipherType)) {
            const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])].length;
            const filledLetters = quote.solution ? Object.keys(quote.solution).length : 0;
            return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
        } else if (quote.cipherType === 'Hill') {
            // For Hill cipher
            const matrixProgress = quote.hillSolution?.matrix.reduce((acc, row) => 
                acc + row.filter(cell => cell !== '').length, 0) || 0;
            const plaintextProgress = Object.keys(quote.hillSolution?.plaintext || {}).length / 
                (quote.encrypted.match(/[A-Z]/g)?.length || 1);
            return ((matrixProgress / 4) * 50) + (plaintextProgress * 50); // Weight matrix and plaintext equally
        } else {
            return 0;
        }
    };

    // Calculate overall progress
    const totalProgress = quotes.reduce((acc, quote) => 
        acc + calculateQuoteProgress(quote), 0) / (quotes.length || 1);

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
        
        // This is the primary loading logic. It relies on data being pre-loaded into localStorage.
        if (testParamsStr) {
            // Check if we should force refresh (clear saved quotes and load fresh ones)
            if (forceRefresh === 'true') {
                localStorage.removeItem('codebustersQuotes');
                localStorage.removeItem('codebustersForceRefresh');
                loadQuestionsFromRedis();
            } else if (savedQuotes) {
                try {
                    const parsedQuotes = JSON.parse(savedQuotes);
                    setQuotes(parsedQuotes);
                    setIsLoading(false);
                    toast.success('Test loaded successfully!');
                } catch (error) {
                    console.error('Error parsing saved quotes:', error);
                    setError('Could not load test data. It might be corrupted.');
                    setIsLoading(false);
                }
            } else {
                // If we have params but no quotes, it's a new test, not a shared one.
                loadQuestionsFromRedis();
            }

            // Initialize time management system
            const testParams = JSON.parse(testParamsStr);
            const eventName = testParams.eventName || 'Codebusters';
            const preferences = loadPreferences(eventName);
            const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
            
            // Check if this is a fresh reset (no share code)
            const hasShareCode = localStorage.getItem('shareCode');
            
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
                    // Resume existing session
                    session = resumeTestSession();
                }
            }
            
            if (session) {
                setTimeLeft(session.timeState.timeLeft);
                setIsTimeSynchronized(session.timeState.isTimeSynchronized);
                setSyncTimestamp(session.timeState.syncTimestamp);
                setIsTestSubmitted(session.isSubmitted);
            }
        } else {
            // No test parameters found - show error
            setError('No test parameters found. Please configure a test from the practice page.');
        }

        if (savedIsTestSubmitted) {
            try {
                setIsTestSubmitted(JSON.parse(savedIsTestSubmitted));
            } catch (error) {
                console.error('Error parsing saved test submitted:', error);
            }
        }

        if (savedTestScore) {
            try {
                setTestScore(JSON.parse(savedTestScore));
            } catch (error) {
                console.error('Error parsing saved test score:', error);
            }
        }

    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Function to load questions from Redis KV
    const loadQuestionsFromRedis = async () => {
        setIsLoading(true);
        setError(null);
        
        // Always reset the timer and submission state for a new test
        const testParamsStr = localStorage.getItem('testParams');
        const testParams = testParamsStr ? JSON.parse(testParamsStr) : {};
        const eventName = testParams.eventName || 'Codebusters';
        const preferences = loadPreferences(eventName);
        setTimeLeft(preferences.timeLimit * 60); // Use preferences for time limit
        setIsTestSubmitted(false);
        setTestScore(null);
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');

        try {
            // Get test parameters from localStorage
            const testParamsStr = localStorage.getItem('testParams');
            if (!testParamsStr) {
                setError('No test parameters found. Please configure a test from the practice page.');
                setIsLoading(false);
                return;
            }

            const testParams = JSON.parse(testParamsStr);
            const eventName = testParams.eventName || 'Codebusters';
            const preferences = loadPreferences(eventName);
            const questionCount = parseInt(testParams.questionCount) || preferences.questionCount;
            let cipherTypes = (testParams.cipherTypes || testParams.subtopics || []).map((type: string) => type.toLowerCase());
            
            // Map subtopic names to cipher type names for Codebusters
            if (testParams.eventName === 'Codebusters') {
                const subtopicToCipherMap: { [key: string]: string } = {
                    // Handle lowercase versions (from old format)
                    'k1 aristocrat': 'K1 Aristocrat',
                    'k2 aristocrat': 'K2 Aristocrat',
                    'k3 aristocrat': 'K3 Aristocrat',
                    'k1 patristocrat': 'K1 Patristocrat',
                    'k2 patristocrat': 'K2 Patristocrat',
                    'k3 patristocrat': 'K3 Patristocrat',
                    'random aristocrat': 'Random Aristocrat',
                    'random patristocrat': 'Random Patristocrat',
                    'caesar': 'Caesar',
                    'atbash': 'Atbash',
                    'affine': 'Affine',
                    'hill': 'Hill',
                    'baconian': 'Baconian',
                    'porta': 'Porta',
                    'nihilist': 'Nihilist',
                    'fractionated morse': 'Fractionated Morse',
                    'columnar transposition': 'Columnar Transposition',
                    'xenocrypt': 'Xenocrypt',
                    // Handle correct format (from practice page)
                    'K1 Aristocrat': 'K1 Aristocrat',
                    'K2 Aristocrat': 'K2 Aristocrat',
                    'K3 Aristocrat': 'K3 Aristocrat',
                    'K1 Patristocrat': 'K1 Patristocrat',
                    'K2 Patristocrat': 'K2 Patristocrat',
                    'K3 Patristocrat': 'K3 Patristocrat',
                    'Random Aristocrat': 'Random Aristocrat',
                    'Random Patristocrat': 'Random Patristocrat',
                    'Caesar': 'Caesar',
                    'Atbash': 'Atbash',
                    'Affine': 'Affine',
                    'Hill': 'Hill',
                    'Baconian': 'Baconian',
                    'Porta': 'Porta',
                    'Nihilist': 'Nihilist',
                    'Fractionated Morse': 'Fractionated Morse',
                    'Columnar Transposition': 'Columnar Transposition',
                    'Xenocrypt': 'Xenocrypt',
                    // Handle standalone entries (should be mapped to Random variants)
                    'aristocrat': 'Random Aristocrat',
                    'patristocrat': 'Random Patristocrat'
                };
            
                cipherTypes = cipherTypes.map(subtopic => 
                    subtopicToCipherMap[subtopic] || subtopic
                );
            }

            // Determine cipher types in advance for each question
            const division = testParams.division || 'any';
            
            // Define division-based cipher types
            const divisionBCipherTypes = {
                'B': ['K1 Aristocrat', 'K2 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'Random Patristocrat', 'Baconian', 'Fractionated Morse', 'Columnar Transposition', 'Xenocrypt', 'Porta', 'Nihilist', 'Atbash', 'Caesar', 'Affine'],
                'C': ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Baconian', 'Xenocrypt', 'Fractionated Morse', 'Porta', 'Columnar Transposition', 'Nihilist', 'Hill']
            };
            
            const availableCipherTypes = cipherTypes && cipherTypes.length > 0 
                ? cipherTypes 
                : (division === 'B' || division === 'C') 
                    ? divisionBCipherTypes[division] 
                    : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Hill', 'Porta', 'Baconian', 'Nihilist', 'Fractionated Morse', 'Columnar Transposition', 'Xenocrypt'];

            // Determine cipher types for each question in advance
            const questionCipherTypes: QuoteData['cipherType'][] = [];
            for (let i = 0; i < questionCount; i++) {
                const cipherType = availableCipherTypes[Math.floor(Math.random() * availableCipherTypes.length)] as QuoteData['cipherType'];
                questionCipherTypes.push(cipherType);
            }

            // Count xenocrypt vs non-xenocrypt questions
            const xenocryptCount = questionCipherTypes.filter(type => type === 'Xenocrypt').length;
            const nonXenocryptCount = questionCount - xenocryptCount;
            
            console.log(`🔍 Quote requirements: ${nonXenocryptCount} English, ${xenocryptCount} Spanish, total: ${questionCount}`);
            console.log(`🔍 Cipher types:`, questionCipherTypes);

            // Fetch English quotes for non-xenocrypt questions
            let englishQuotes: Array<{id: string, author: string, quote: string}> = [];
            if (nonXenocryptCount > 0) {
                const englishResponse = await fetch(`/api/quotes?language=en&limit=${nonXenocryptCount}`);
                if (!englishResponse.ok) {
                    throw new Error(`Failed to fetch English quotes: ${englishResponse.statusText}`);
                }
                const englishData = await englishResponse.json();
                englishQuotes = englishData.data?.quotes || englishData.quotes || [];
                console.log(`🔍 Fetched ${englishQuotes.length} English quotes for ${nonXenocryptCount} questions`);
            }

            // Fetch Spanish quotes for xenocrypt questions
            let spanishQuotes: Array<{id: string, author: string, quote: string}> = [];
            if (xenocryptCount > 0) {
                const spanishResponse = await fetch(`/api/quotes?language=es&limit=${xenocryptCount}`);
                if (!spanishResponse.ok) {
                    throw new Error(`Failed to fetch Spanish quotes: ${spanishResponse.statusText}`);
                }
                const spanishData = await spanishResponse.json();
                spanishQuotes = spanishData.data?.quotes || spanishData.quotes || [];
                console.log(`🔍 Fetched ${spanishQuotes.length} Spanish quotes for ${xenocryptCount} questions`);
            }

            // Verify we have enough quotes before processing
            if (nonXenocryptCount > 0 && englishQuotes.length < nonXenocryptCount) {
                throw new Error(`Not enough English quotes. Need ${nonXenocryptCount}, got ${englishQuotes.length}`);
            }
            if (xenocryptCount > 0 && spanishQuotes.length < xenocryptCount) {
                throw new Error(`Not enough Spanish quotes. Need ${xenocryptCount}, got ${spanishQuotes.length}`);
            }
            
            console.log(`🔍 Quote validation passed: ${englishQuotes.length} English, ${spanishQuotes.length} Spanish quotes available`);
            
            // Prepare quotes for processing
            const processedQuotes: QuoteData[] = [];
            const quoteUUIDs: Array<{id: string, language: string, cipherType: string}> = [];
            let englishQuoteIndex = 0;
            let spanishQuoteIndex = 0;

            for (let i = 0; i < questionCount; i++) {
                const cipherType = questionCipherTypes[i];
                let quoteData: { quote: string; author: string; originalIndex: number; isSpanish?: boolean; id?: string };

                if (cipherType === 'Xenocrypt') {
                    // Use Spanish quote for xenocrypt
                    if (spanishQuoteIndex >= spanishQuotes.length) {
                        throw new Error(`Not enough Spanish quotes available for xenocrypt questions. Need ${xenocryptCount}, got ${spanishQuotes.length}`);
                    }
                    const spanishQuote = spanishQuotes[spanishQuoteIndex];
                    quoteData = { 
                        quote: spanishQuote.quote, 
                        author: spanishQuote.author, 
                        originalIndex: spanishQuoteIndex,
                        isSpanish: true,
                        id: spanishQuote.id
                    };
                    quoteUUIDs.push({ id: spanishQuote.id, language: 'es', cipherType });
                    spanishQuoteIndex++;
                } else {
                    // Use English quote for non-xenocrypt
                    if (englishQuoteIndex >= englishQuotes.length) {
                        throw new Error(`Not enough English quotes available for non-xenocrypt questions. Need ${nonXenocryptCount}, got ${englishQuotes.length}`);
                    }
                    const englishQuote = englishQuotes[englishQuoteIndex];
                    quoteData = { 
                        quote: englishQuote.quote, 
                        author: englishQuote.author, 
                        originalIndex: englishQuoteIndex,
                        isSpanish: false,
                        id: englishQuote.id
                    };
                    quoteUUIDs.push({ id: englishQuote.id, language: 'en', cipherType });
                    englishQuoteIndex++;
                }

                // Encrypt the quote based on cipher type
                let cipherResult: { 
                    encrypted: string; 
                    key?: string; 
                    matrix?: number[][]; 
                    keyword?: string; 
                    fractionationTable?: { [key: string]: string }; 
                    shift?: number; 
                    a?: number; 
                    b?: number; 
                };

                switch (cipherType) {
                    case 'K1 Aristocrat':
                        cipherResult = encryptK1Aristocrat(quoteData.quote);
                        break;
                    case 'K2 Aristocrat':
                        cipherResult = encryptK2Aristocrat(quoteData.quote);
                        break;
                    case 'K3 Aristocrat':
                        cipherResult = encryptK3Aristocrat(quoteData.quote);
                        break;
                    case 'K1 Patristocrat':
                        cipherResult = encryptK1Patristocrat(quoteData.quote);
                        break;
                    case 'K2 Patristocrat':
                        cipherResult = encryptK2Patristocrat(quoteData.quote);
                        break;
                    case 'K3 Patristocrat':
                        cipherResult = encryptK3Patristocrat(quoteData.quote);
                        break;
                    case 'Random Aristocrat':
                        cipherResult = encryptRandomAristocrat(quoteData.quote);
                        break;
                    case 'Random Patristocrat':
                        cipherResult = encryptRandomPatristocrat(quoteData.quote);
                        break;
                    case 'Caesar':
                        cipherResult = encryptCaesar(quoteData.quote);
                        break;
                    case 'Atbash':
                        cipherResult = encryptAtbash(quoteData.quote);
                        break;
                    case 'Affine':
                        cipherResult = encryptAffine(quoteData.quote);
                        break;
                    case 'Hill':
                        cipherResult = encryptHill(quoteData.quote);
                        break;
                    case 'Porta':
                        cipherResult = encryptPorta(quoteData.quote);
                        break;
                    case 'Baconian':
                        cipherResult = encryptBaconian(quoteData.quote);
                        break;
                    case 'Nihilist':
                        cipherResult = encryptNihilist(quoteData.quote);
                        break;
                    case 'Fractionated Morse':
                        cipherResult = encryptFractionatedMorse(quoteData.quote);
                        break;
                    case 'Columnar Transposition':
                        cipherResult = encryptColumnarTransposition(quoteData.quote);
                        break;
                    case 'Xenocrypt':
                        cipherResult = encryptXenocrypt(quoteData.quote);
                        break;
                    default:
                        throw new Error(`Unknown cipher type: ${cipherType}`);
                }

                processedQuotes.push({
                    author: quoteData.author,
                    quote: quoteData.quote,
                    encrypted: cipherResult.encrypted,
                    cipherType,
                    key: cipherResult.key || undefined,
                    matrix: cipherResult.matrix || undefined,
                    portaKeyword: cipherResult.keyword || undefined,
                    fractionationTable: cipherResult.fractionationTable || undefined,
                    caesarShift: cipherResult.shift || undefined,
                    affineA: cipherResult.a || undefined,
                    affineB: cipherResult.b || undefined,
                    difficulty: Math.random() * 0.8 + 0.2,
                });
            }

            // Store the complete quote data for sharing (including encryption details)
            const shareData = {
                quoteUUIDs,
                processedQuotes: processedQuotes.map(quote => ({
                    author: quote.author,
                    quote: quote.quote,
                    encrypted: quote.encrypted,
                    cipherType: quote.cipherType,
                    key: quote.key,
                    matrix: quote.matrix,
                    portaKeyword: quote.portaKeyword,
                    fractionationTable: quote.fractionationTable,
                    caesarShift: quote.caesarShift,
                    affineA: quote.affineA,
                    affineB: quote.affineB,
                    difficulty: quote.difficulty
                }))
            };
            localStorage.setItem('codebustersShareData', JSON.stringify(shareData));

            setQuotes(processedQuotes);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading questions from Redis:', error);
            setError('Failed to load questions from Redis');
            setIsLoading(false);
            toast.error('Failed to load questions from Redis');
        }
    };

    useEffect(() => {
        if (quotes.length > 0) {
            localStorage.setItem('codebustersQuotes', JSON.stringify(quotes));
        }
        localStorage.setItem('codebustersIsTestSubmitted', JSON.stringify(isTestSubmitted));
        if (testScore !== null) {
            localStorage.setItem('codebustersTestScore', JSON.stringify(testScore));
        }
    }, [quotes, isTestSubmitted, testScore]);

    useEffect(() => {
        if (timeLeft === null || isTestSubmitted) return;

        if (timeLeft === 0) {
            handleSubmitTest();
            return;
        }

        if (timeLeft === 300) { // 5 minutes
            toast.warning("Warning: Five minutes left");
        }
        if (timeLeft === 60) {
            toast.warning("Warning: One minute left");
        }
        if (timeLeft === 30) {
            toast.warning("Warning: Thirty seconds left");
        }

        const timer = setInterval(() => {
            const session = getCurrentTestSession();
            if (!session) return;
            
            // Update time based on session state
            if (session.timeState.isTimeSynchronized && session.timeState.syncTimestamp && session.timeState.originalTimeAtSync) {
                // Synchronized test - calculate based on original sync point
                const now = Date.now();
                const elapsedMs = now - session.timeState.syncTimestamp;
                const elapsedSeconds = Math.floor(elapsedMs / 1000);
                const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);

            } else {
                // Non-synchronized test - calculate based on test start time and pauses
                const now = Date.now();
                const totalElapsedMs = now - (session.timeState.testStartTime || now) - session.timeState.totalPausedTime;
                const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);
                const originalTimeLimit = session.timeLimit * 60;
                const newTimeLeft = Math.max(0, originalTimeLimit - totalElapsedSeconds);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isTestSubmitted, handleSubmitTest]);

    // Handle input change for aristocrat/patristocrat solution
    const handleSolutionChange = (quoteIndex: number, cipherLetter: string, plainLetter: string) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { ...quote, solution: { ...quote.solution, [cipherLetter]: plainLetter.toUpperCase() } }
                : quote
        ));
    };

    // Handle input change for baconian solution (uses position-based indexing)
    const handleBaconianSolutionChange = (quoteIndex: number, position: number, plainLetter: string) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { ...quote, solution: { ...quote.solution, [position]: plainLetter.toUpperCase() } }
                : quote
        ));
    };

    // Handle frequency note change
    const handleFrequencyNoteChange = (quoteIndex: number, letter: string, note: string) => {
        setQuotes(prev => prev.map((quote, index) => 
            index === quoteIndex 
                ? { ...quote, frequencyNotes: { ...quote.frequencyNotes, [letter]: note } }
                : quote
        ));
    };

    // Handle Hill cipher solution changes
    const handleHillSolutionChange = (quoteIndex: number, type: 'matrix' | 'plaintext', value: string[][] | { [key: number]: string }) => {
        setQuotes(prev => prev.map((quote, index) => 
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
        ));
    };

    // Handle hint functionality
    const handleHintClick = (questionIndex: number) => {
        const quote = quotes[questionIndex];
        if (!quote) return;

        // Toggle hint visibility for ciphers that have keywords/keys
        if (['Porta', 'Caesar', 'Affine', 'Hill', 'Fractionated Morse'].includes(quote.cipherType)) {
            setActiveHints(prev => ({
                ...prev,
                [questionIndex]: !prev[questionIndex]
            }));
        } else {
            // For substitution ciphers, reveal a random correct letter
            revealRandomLetter(questionIndex);
        }
    };

    // Reveal a random correct letter for substitution ciphers
    const revealRandomLetter = (questionIndex: number) => {
        const quote = quotes[questionIndex];
        if (!quote || !quote.key) return;

        // Get all cipher letters that haven't been revealed yet
        const availableLetters = quote.encrypted
            .toUpperCase()
            .split('')
            .filter(char => /[A-Z]/.test(char))
            .filter(char => !revealedLetters[questionIndex]?.[char]);

        if (availableLetters.length === 0) return;

        // Pick a random cipher letter
        const randomCipherLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
        
        // Get the correct plain letter for this cipher letter
        let correctPlainLetter = '';
        
        if (quote.cipherType === 'Caesar' && quote.caesarShift !== undefined) {
            const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
            const plainIndex = (cipherIndex - quote.caesarShift + 26) % 26;
            correctPlainLetter = String.fromCharCode(plainIndex + 65);
        } else if (quote.cipherType === 'Atbash') {
            const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
            const plainIndex = 25 - cipherIndex;
            correctPlainLetter = String.fromCharCode(plainIndex + 65);
        } else if (quote.cipherType === 'Affine' && quote.affineA !== undefined && quote.affineB !== undefined) {
            // For Affine cipher, we need to find the modular inverse
            const cipherIndex = randomCipherLetter.charCodeAt(0) - 65;
            // Find modular inverse of affineA mod 26
            let aInverse = 1;
            for (let i = 1; i < 26; i++) {
                if ((quote.affineA * i) % 26 === 1) {
                    aInverse = i;
                    break;
                }
            }
            const plainIndex = (aInverse * (cipherIndex - quote.affineB + 26)) % 26;
            correctPlainLetter = String.fromCharCode(plainIndex + 65);
        } else if (quote.key && ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat'].includes(quote.cipherType)) {
            // For aristocrat/patristocrat ciphers, find the plain letter from the key
            const keyIndex = quote.key.indexOf(randomCipherLetter);
            if (keyIndex !== -1) {
                correctPlainLetter = String.fromCharCode(keyIndex + 65);
            }
        }

        if (correctPlainLetter) {
            // Update revealed letters state
            setRevealedLetters(prev => ({
                ...prev,
                [questionIndex]: {
                    ...prev[questionIndex],
                    [randomCipherLetter]: correctPlainLetter
                }
            }));

            // Update the solution
            setQuotes(prev => prev.map((q, index) => 
                index === questionIndex 
                    ? { ...q, solution: { ...q.solution, [randomCipherLetter]: correctPlainLetter } }
                    : q
            ));
        }
    };

    // Get hint content for different cipher types
    const getHintContent = (quote: QuoteData) => {
        switch (quote.cipherType) {
            case 'Porta':
                return quote.portaKeyword ? `Keyword: ${quote.portaKeyword}` : 'No keyword available';
            case 'Caesar':
                return quote.caesarShift !== undefined ? `Shift: ${quote.caesarShift}` : 'No shift available';
            case 'Affine':
                return quote.affineA !== undefined && quote.affineB !== undefined 
                    ? `a = ${quote.affineA}, b = ${quote.affineB}` 
                    : 'No coefficients available';
            case 'Hill':
                return quote.matrix ? `Matrix: [[${quote.matrix[0].join(', ')}], [${quote.matrix[1].join(', ')}]]` : 'No matrix available';
            case 'Fractionated Morse':
                return 'Letters map to Morse code triplets (dots, dashes, x)';
            default:
                return 'Click for a random letter hint';
        }
    };

    return (
        <>
            <div className="relative min-h-screen">
                {/* Background */}
                <div
                    className={`absolute inset-0 ${
                        darkMode ? 'bg-gray-900' : 'bg-gray-50'
                    }`}
                ></div>

                {/* Add styled scrollbar */}
                <style jsx global>{`
                    ::-webkit-scrollbar {
                        width: 8px;
                        transition: background 1s ease;
                        ${darkMode
                            ? 'background: black;'
                            : 'background: white;'
                        }
                    }

                    ::-webkit-scrollbar-thumb {
                        background: ${darkMode
                            ? '#374151'
                            : '#3b82f6'};
                        border-radius: 4px;
                        transition: background 1s ease;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: ${darkMode
                            ? '#1f2937'
                            : '#2563eb'};
                    }
                `}</style>

                {/* Page Content */}
                <div className="relative flex flex-col items-center p-6">
                    <button
                        onClick={() => {
                            // Get test params before clearing localStorage
                            const testParams = JSON.parse(localStorage.getItem('testParams') || '{}');
                            const eventName = testParams.eventName || 'Codebusters';
                            const preferences = loadPreferences(eventName);
                            const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
                            
                            // Clear all codebusters-related localStorage items
                            localStorage.removeItem('codebustersQuotes');
                            localStorage.removeItem('codebustersQuoteIndices'); // Legacy
                            localStorage.removeItem('codebustersQuoteUUIDs'); // Legacy
                            localStorage.removeItem('codebustersShareData');
                            localStorage.removeItem('codebustersIsTestSubmitted');
                            localStorage.removeItem('codebustersTestScore');
                            localStorage.removeItem('codebustersTimeLeft');
                            localStorage.removeItem('shareCode');
                            
                            // Set force refresh flag to get new random quotes
                            localStorage.setItem('codebustersForceRefresh', 'true');
                            
                            // Clear time management session completely
                            clearTestSession();
                            
                            // Initialize a fresh session with the correct time limit
                            initializeTestSession(eventName, timeLimit, false);
                            
                            // Reload the page to start fresh
                            window.location.reload();
                        }}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-transform duration-300 hover:scale-110 ${
                            darkMode ? 'bg-gray-700 text-white shadow-lg' : 'bg-white text-gray-900 shadow-md'
                        }`}
                        title="Reset Test"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                        </svg>
                    </button>
                    
                    <header className="w-full max-w-3xl flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <h1 className={`text-2xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                Scio.ly: Codebusters
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {timeLeft !== null && (
                                <div
                                    className={`text-xl font-semibold ${
                                        timeLeft <= 300
                                            ? 'text-red-600'
                                            : darkMode
                                            ? 'text-white'
                                            : 'text-blue-600'
                                    }`}
                                >
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Smooth Progress Bar */}
                    <div
                        className={`${isTestSubmitted ? '' : 'sticky top-6'
                        } z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
                    >
                        <div
                            className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                            style={{ width: `${totalProgress}%` }}
                        ></div>
                    </div>

                    <main
                        className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                    >
                        
                        {isLoading && (
                            <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                                    <p className="text-lg font-medium">Loading Codebusters questions...</p>
                                    <p className="text-sm mt-2 opacity-75">Please wait while we prepare your cipher challenges</p>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className={`text-center py-12 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl mb-4">⚠️</div>
                                    <p className="text-lg font-medium mb-2">Failed to load questions</p>
                                    <p className="text-sm opacity-75 mb-4">{error}</p>
                                    {error.includes('No test parameters found') ? (
                                        <button
                                            onClick={() => router.push('/practice')}
                                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                                                darkMode
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            Go to Practice Page
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                setIsLoading(true);
                                                loadQuestionsFromRedis();
                                            }}
                                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                                                darkMode
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {!isLoading && !error && quotes.length === 0 && hasAttemptedLoad && (
                            <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl mb-4">📝</div>
                                    <p className="text-lg font-medium mb-2">No questions available</p>
                                    <p className="text-sm opacity-75">Please check back later or try refreshing the page</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Take together button - positioned right above questions */}
                        {!isLoading && !error && quotes.length > 0 && hasAttemptedLoad && (
                                                    <button
                            onClick={() => {
                                setShareModalOpen(true);
                            }}
                            title="Share Test"
                            className="mb-4"
                        >
                                <div className="flex justify-between text-blue-400">
                                    <FaShareAlt className="transition-all duration-500 mt-0.5"/> 
                                    <p>&nbsp;&nbsp;Take together</p>
                                </div>
                            </button>
                        )}
                        
                        {!isLoading && !error && hasAttemptedLoad && quotes.map((item, index) => (
                            <div 
                                key={index} 
                                className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Question {index + 1}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleHintClick(index)}
                                            className={`p-2 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                                                darkMode 
                                                    ? 'bg-gray-600 border-blue-400 text-gray-300 hover:bg-gray-500' 
                                                    : 'bg-gray-100 border-blue-500 text-gray-600 hover:bg-gray-200'
                                            }`}
                                            title="Get a hint"
                                        >
                                            <svg 
                                                width="16" 
                                                height="16" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                                <circle cx="12" cy="17" r="1"/>
                                            </svg>
                                        </button>
                                        <span className={`px-2 py-1 rounded text-sm ${
                                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {item.cipherType.charAt(0).toUpperCase() + item.cipherType.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <p className={`mb-4 break-words whitespace-normal overflow-x-auto ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                    {item.author}
                                </p>

                                {/* Hint Card */}
                                {activeHints[index] && (
                                    <div className={`mb-4 p-3 rounded-lg border-l-4 ${
                                        darkMode 
                                            ? 'bg-blue-900/30 border-blue-400 text-blue-200' 
                                            : 'bg-blue-50 border-blue-500 text-blue-700'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg 
                                                width="16" 
                                                height="16" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <path d="M9 12l2 2 4-4"/>
                                                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                                                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                                                <path d="M13 12h3"/>
                                                <path d="M8 12H5"/>
                                            </svg>
                                            <span className="font-semibold text-sm">Hint</span>
                                        </div>
                                        <p className="text-sm font-mono">
                                            {getHintContent(item)}
                                        </p>
                                    </div>
                                )}

                                {item.cipherType === 'Hill' ? (
                                    <HillDisplay
                                        text={item.encrypted}
                                        matrix={item.matrix!}
                                        quoteIndex={index}
                                        solution={item.hillSolution}
                                        onSolutionChange={(type, value) => handleHillSolutionChange(index, type, value)}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                    />
                                ) : item.cipherType === 'Porta' ? (
                                    <PortaDisplay
                                        text={item.encrypted}
                                        keyword={item.portaKeyword!}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        frequencyNotes={item.frequencyNotes}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                        onSolutionChange={handleSolutionChange}
                                        onFrequencyNoteChange={handleFrequencyNoteChange}
                                    />
                                ) : item.cipherType === 'Baconian' ? (
                                    <BaconianDisplay
                                        text={item.encrypted}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                        onBaconianSolutionChange={handleBaconianSolutionChange}
                                    />
                                ) : item.cipherType === 'Fractionated Morse' ? (
                                    <FractionatedMorseDisplay
                                        text={item.encrypted}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        fractionationTable={item.fractionationTable}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                        onSolutionChange={handleSolutionChange}
                                    />
                                ) : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Nihilist', 'Columnar Transposition', 'Xenocrypt'].includes(item.cipherType) ? (
                                    <SubstitutionDisplay
                                        text={item.encrypted}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        isTestSubmitted={isTestSubmitted}
                                        cipherType={item.cipherType}
                                        key={item.key}
                                        caesarShift={item.caesarShift}
                                        affineA={item.affineA}
                                        affineB={item.affineB}
                                        quotes={quotes}
                                        onSolutionChange={handleSolutionChange}
                                    />
                                ) : (
                                    <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Unknown cipher type: {item.cipherType}
                                    </div>
                                )}
                                
                                {/* Difficulty Bar */}
                                <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300">
                                    <div
                                        className={`h-full rounded-full ${
                                            (item.difficulty || 0.5) >= 0.66
                                                ? 'bg-red-500'
                                                : (item.difficulty || 0.5) >= 0.33
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                        }`}
                                        style={{ width: `${(item.difficulty || 0.5) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Submit Button */}
                        {!isLoading && !error && quotes.length > 0 && hasAttemptedLoad && (
                            <div className="text-center mt-6">
                                {!isTestSubmitted ? (
                                    <button
                                        onClick={handleSubmitTest}
                                        disabled={isTestSubmitted}
                                        className={`w-full px-4 py-2 font-semibold rounded-lg transform hover:scale-105 ${
                                            darkMode
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        Submit Answers
                                    </button>
                                ) : (
                                    <div className={`text-center p-4 rounded-lg ${
                                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                        <p className={`text-lg font-semibold ${
                                            darkMode ? 'text-green-400' : 'text-green-600'
                                        }`}>
                                            Test Completed!
                                        </p>
                                        <p className={`text-sm mt-2 ${
                                            darkMode ? 'text-gray-300' : 'text-gray-600'
                                        }`}>
                                            Use the reset button in the top right to start a new test.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>

                    {/* Fixed Back Button */}
                    <button
                        onClick={() => {
                            // Clear unlimited practice-related localStorage items
                            localStorage.removeItem('unlimitedQuestions');
                            localStorage.removeItem('testParams');
                            localStorage.removeItem('codebustersQuotes');
                            localStorage.removeItem('codebustersTimeLeft');
                            localStorage.removeItem('codebustersIsTestSubmitted');
                            localStorage.removeItem('codebustersTestScore');
                            router.push('/practice');
                        }}
                        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                            darkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/50'
                                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/50'
                        }`}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    {/* Add the reference button as sticky at the bottom */}
                    <div className="fixed bottom-8 right-8 z-50">
                        <button
                            onClick={() => setShowPDFViewer(true)}
                            className={`p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                                darkMode
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                            }`}
                            title="Codebusters Reference"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Custom PDF Modal */}
                    {showPDFViewer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setShowPDFViewer(false)}>
                            <div 
                                className="relative w-11/12 h-5/6 max-w-5xl bg-white rounded-lg shadow-2xl flex flex-col" 
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={`flex justify-between items-center p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-blue-100 text-gray-800'} rounded-t-lg`}>
                                    <h3 className="text-lg font-semibold">Codebusters Reference</h3>
                                    <button
                                        onClick={() => setShowPDFViewer(false)}
                                        className={`p-2 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-white text-white' : 'hover:bg-gray-500 text-gray-700'}`}
                                        aria-label="Close"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden bg-white">
                                    <iframe
                                        src="/2024_Div_C_Resource.pdf"
                                        className="w-full h-full border-none"
                                        title="Codebusters Reference PDF"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Share Modal */}
                                <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                inputCode={inputCode}
                setInputCode={setInputCode}
                darkMode={darkMode}
                isCodebusters={true}
                encryptedQuotes={quotes}
            />
                    
                </div>
            </div>
       it     
            {/* Toast Container */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={darkMode ? "dark" : "light"}
            />
        </>
    );
}