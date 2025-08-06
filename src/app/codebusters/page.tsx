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
  clearTestSession,
  resetTestSession
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
  encryptHill2x2,
  encryptHill3x3,
  encryptPorta,
  encryptBaconian,
  encryptNihilist,
  encryptFractionatedMorse,
  encryptColumnarTransposition,
  encryptXenocrypt,
  mod26
} from './cipher-utils';
import {
  HillDisplay,
  PortaDisplay,
  SubstitutionDisplay,
  FractionatedMorseDisplay,
  BaconianDisplay,
  ColumnarTranspositionDisplay,
  NihilistDisplay
} from './cipher-displays';
import { QuoteData } from './types';
import CipherInfoModal from './CipherInfoModal';

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
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [selectedCipherType, setSelectedCipherType] = useState<string>('');

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
        if ((quote.cipherType !== 'Hill 2x2' && quote.cipherType !== 'Hill 3x3') || !quote.hillSolution) return false;
        
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
                : (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3')
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
        if (['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Nihilist', 'Fractionated Morse', 'Xenocrypt'].includes(quote.cipherType)) {
            const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])].length;
            const filledLetters = quote.solution ? Object.keys(quote.solution).length : 0;
            return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
        } else if (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') {
            // For Hill cipher
            const matrixSize = quote.cipherType === 'Hill 3x3' ? 9 : 4; // 3x3 = 9 cells, 2x2 = 4 cells
            const matrixProgress = quote.hillSolution?.matrix.reduce((acc, row) => 
                acc + row.filter(cell => cell !== '').length, 0) || 0;
            const plaintextProgress = Object.keys(quote.hillSolution?.plaintext || {}).length / 
                (quote.encrypted.match(/[A-Z]/g)?.length || 1);
            return ((matrixProgress / matrixSize) * 50) + (plaintextProgress * 50); // Weight matrix and plaintext equally
        } else if (quote.cipherType === 'Columnar Transposition') {
            // For Columnar Transposition, calculate progress based on decrypted text length
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
                loadQuestionsFromDatabase();
            } else if (savedQuotes) {
                try {
                    const parsedQuotes = JSON.parse(savedQuotes);
                    
                    // Calculate decryption matrices for Hill 3x3 ciphers if not already present
                    const processedQuotes = parsedQuotes.map(quote => {
                        if (quote.cipherType === 'Hill 3x3' && quote.matrix && !quote.decryptionMatrix) {
                            // Calculate determinant
                            const det = mod26(
                                quote.matrix[0][0] * (quote.matrix[1][1] * quote.matrix[2][2] - quote.matrix[1][2] * quote.matrix[2][1]) -
                                quote.matrix[0][1] * (quote.matrix[1][0] * quote.matrix[2][2] - quote.matrix[1][2] * quote.matrix[2][0]) +
                                quote.matrix[0][2] * (quote.matrix[1][0] * quote.matrix[2][1] - quote.matrix[1][1] * quote.matrix[2][0])
                            );
                            
                            // Find modular multiplicative inverse of determinant
                            let detInverse = 0;
                            for (let i = 1; i < 26; i++) {
                                if (mod26(det * i) === 1) {
                                    detInverse = i;
                                    break;
                                }
                            }
                            
                            // Calculate cofactor matrix
                            const cofactors = [
                                [mod26(quote.matrix[1][1] * quote.matrix[2][2] - quote.matrix[1][2] * quote.matrix[2][1]), 
                                 mod26(-(quote.matrix[1][0] * quote.matrix[2][2] - quote.matrix[1][2] * quote.matrix[2][0])), 
                                 mod26(quote.matrix[1][0] * quote.matrix[2][1] - quote.matrix[1][1] * quote.matrix[2][0])],
                                [mod26(-(quote.matrix[0][1] * quote.matrix[2][2] - quote.matrix[0][2] * quote.matrix[2][1])), 
                                 mod26(quote.matrix[0][0] * quote.matrix[2][2] - quote.matrix[0][2] * quote.matrix[2][0]), 
                                 mod26(-(quote.matrix[0][0] * quote.matrix[2][1] - quote.matrix[0][1] * quote.matrix[2][0]))],
                                [mod26(quote.matrix[0][1] * quote.matrix[1][2] - quote.matrix[0][2] * quote.matrix[1][1]), 
                                 mod26(-(quote.matrix[0][0] * quote.matrix[1][2] - quote.matrix[0][2] * quote.matrix[1][0])), 
                                 mod26(quote.matrix[0][0] * quote.matrix[1][1] - quote.matrix[0][1] * quote.matrix[1][0])]
                            ];
                            
                            // Transpose and multiply by det inverse
                            const decryptionMatrix = [
                                [mod26(cofactors[0][0] * detInverse), mod26(cofactors[1][0] * detInverse), mod26(cofactors[2][0] * detInverse)],
                                [mod26(cofactors[0][1] * detInverse), mod26(cofactors[1][1] * detInverse), mod26(cofactors[2][1] * detInverse)],
                                [mod26(cofactors[0][2] * detInverse), mod26(cofactors[1][2] * detInverse), mod26(cofactors[2][2] * detInverse)]
                            ];
                            
                            return {
                                ...quote,
                                decryptionMatrix
                            };
                        }
                        return quote;
                    });
                    
                    setQuotes(processedQuotes);
                    setIsLoading(false);
                    toast.success('Test loaded successfully!');
                } catch (error) {
                    console.error('Error parsing saved quotes:', error);
                    setError('Could not load test data. It might be corrupted.');
                    setIsLoading(false);
                }
            } else {
                // If we have params but no quotes, it's a new test, not a shared one.
                loadQuestionsFromDatabase();
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

    // Function to load questions from database
    const loadQuestionsFromDatabase = async () => {
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
                    'hill': 'Hill 2x2',
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
                    'Hill': 'Hill 2x2',
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
                'C': ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Baconian', 'Xenocrypt', 'Fractionated Morse', 'Porta', 'Columnar Transposition', 'Nihilist', 'Hill 2x2', 'Hill 3x3']
            };
            
            const availableCipherTypes = cipherTypes && cipherTypes.length > 0 
                ? cipherTypes 
                : (division === 'B' || division === 'C') 
                    ? divisionBCipherTypes[division] 
                    : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Hill 2x2', 'Hill 3x3', 'Porta', 'Baconian', 'Nihilist', 'Fractionated Morse', 'Columnar Transposition', 'Xenocrypt'];

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
                // console.log(`🔍 Fetched ${englishQuotes.length} English quotes for ${nonXenocryptCount} questions`);
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
                // console.log(`🔍 Fetched ${spanishQuotes.length} Spanish quotes for ${xenocryptCount} questions`);
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
                // Normalize cipher type to handle case sensitivity
                const normalizedCipherType = cipherType.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
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

                switch (normalizedCipherType) {
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
                                case 'Hill 2x2':
                cipherResult = encryptHill2x2(quoteData.quote);
                break;
            case 'Hill 3x3':
                cipherResult = encryptHill3x3(quoteData.quote);
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
                        throw new Error(`Unknown cipher type: ${cipherType} (normalized: ${normalizedCipherType})`);
                }

                processedQuotes.push({
                    author: quoteData.author,
                    quote: quoteData.quote,
                    encrypted: cipherResult.encrypted,
                    cipherType: normalizedCipherType,
                    key: cipherResult.key || undefined,
                    matrix: cipherResult.matrix || undefined,
                    decryptionMatrix: 'decryptionMatrix' in cipherResult ? (cipherResult as { decryptionMatrix: number[][] }).decryptionMatrix : undefined,
                    portaKeyword: cipherResult.keyword || undefined,
                    nihilistPolybiusKey: 'polybiusKey' in cipherResult ? (cipherResult as { polybiusKey: string }).polybiusKey : undefined,
                    nihilistCipherKey: 'cipherKey' in cipherResult ? (cipherResult as { cipherKey: string }).cipherKey : undefined,
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
                    decryptionMatrix: quote.decryptionMatrix,
                    portaKeyword: quote.portaKeyword,
                    nihilistPolybiusKey: quote.nihilistPolybiusKey,
                    nihilistCipherKey: quote.nihilistCipherKey,
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
            console.error('Error loading questions from database:', error);
            setError('Failed to load questions from database');
            setIsLoading(false);
            toast.error('Failed to load questions from database');
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

    // Handle Nihilist cipher solution changes
    const handleNihilistSolutionChange = (quoteIndex: number, position: number, plainLetter: string) => {
        setQuotes(prev => prev.map((quote, index) => {
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
        }));
    };

    // Handle hint functionality
    const handleHintClick = (questionIndex: number) => {
        const quote = quotes[questionIndex];
        if (!quote) return;

        // Check if this cipher type has a crib available
        const hintContent = getHintContent(quote);
        const hasCrib = hintContent.includes('Crib:') && !hintContent.includes('No crib found');
        
        if (hasCrib) {
            // If crib is not shown yet, show it
            if (!activeHints[questionIndex]) {
                setActiveHints(prev => ({
                    ...prev,
                    [questionIndex]: true
                }));
            } else {
                // If crib is already shown, reveal a random letter
                revealRandomLetter(questionIndex);
            }
        } else {
            // For ciphers without cribs, always reveal a random correct letter
            revealRandomLetter(questionIndex);
        }
    };

    // Reveal a random correct letter for substitution ciphers
    const revealRandomLetter = (questionIndex: number) => {
        const quote = quotes[questionIndex];
        if (!quote) return;

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
        } else if (quote.cipherType === 'Porta' && quote.portaKeyword) {
            // For Porta cipher, find the position and get the corresponding plain letter
            const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
            const plainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
            const cipherIndex = cipherText.indexOf(randomCipherLetter);
            
            if (cipherIndex !== -1 && cipherIndex < plainText.length) {
                // Get the corresponding plain letter from the original text
                correctPlainLetter = plainText[cipherIndex];
            }
        } else if ((quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3') && quote.matrix) {
            // For Hill cipher, we need to decrypt using the matrix inverse
            // This is complex, so we'll just reveal a letter from the original quote
            const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
            const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
            
            // Find the position of the random cipher letter in the encrypted text
            const cipherIndex = cipherText.indexOf(randomCipherLetter);
            if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
                correctPlainLetter = originalQuote[cipherIndex];
            }
        } else if (quote.cipherType === 'Fractionated Morse' && quote.fractionationTable) {
            // For Fractionated Morse, reveal the triplet that maps to this cipher letter
            for (const [triplet, letter] of Object.entries(quote.fractionationTable)) {
                if (letter === randomCipherLetter) {
                    // Instead of revealing a plain letter, reveal the triplet
                    // This will be used to update the replacement table
                    correctPlainLetter = triplet; // Store the triplet as the "plain letter"
                    break;
                }
            }
        } else if (quote.cipherType === 'Xenocrypt') {
            // For Xenocrypt, handle Spanish text normalization
            const normalizedOriginal = quote.quote.toUpperCase()
                .replace(/Á/g, 'A')
                .replace(/É/g, 'E')
                .replace(/Í/g, 'I')
                .replace(/Ó/g, 'O')
                .replace(/Ú/g, 'U')
                .replace(/Ü/g, 'U')
                .replace(/Ñ/g, 'N')
                .replace(/[^A-Z]/g, '');
            const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
            
            // Find the position of the random cipher letter in the encrypted text
            const cipherIndex = cipherText.indexOf(randomCipherLetter);
            if (cipherIndex !== -1 && cipherIndex < normalizedOriginal.length) {
                correctPlainLetter = normalizedOriginal[cipherIndex];
            }
        } else {
            // For any other cipher type, try to find the letter from the original quote
            const originalQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
            const cipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
            
            // Find the position of the random cipher letter in the encrypted text
            const cipherIndex = cipherText.indexOf(randomCipherLetter);
            if (cipherIndex !== -1 && cipherIndex < originalQuote.length) {
                correctPlainLetter = originalQuote[cipherIndex];
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

            // Update the solution - handle Fractionated Morse differently
            setQuotes(prev => prev.map((q, index) => {
                if (index === questionIndex) {
                    if (q.cipherType === 'Fractionated Morse') {
                        // For Fractionated Morse, update the replacement table AND the cipher inputs
                        // The correctPlainLetter is actually a triplet
                        const newSolution = { 
                            ...q.solution, 
                            [`replacement_${correctPlainLetter}`]: randomCipherLetter 
                        };
                        
                        // Also update all cipher inputs that show this letter with the triplet
                        newSolution[randomCipherLetter] = correctPlainLetter;
                        
                        return { 
                            ...q, 
                            solution: newSolution
                        };
                    } else {
                        // For other ciphers, update normally
                        return { 
                            ...q, 
                            solution: { ...q.solution, [randomCipherLetter]: correctPlainLetter } 
                        };
                    }
                }
                return q;
            }));
        }
    };

    // Get hint content for different cipher types
    const getHintContent = (quote: QuoteData) => {
        const cleanCipherText = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, '');
        const cleanPlainText = quote.quote.toUpperCase().replace(/[^A-Z]/g, '');
        
        switch (quote.cipherType) {
            case 'Porta':
                return quote.portaKeyword ? `Keyword: ${quote.portaKeyword}` : 'No keyword available';
            case 'Caesar':
                return quote.caesarShift !== undefined ? `Shift: ${quote.caesarShift}` : 'No shift available';
            case 'Affine':
                return quote.affineA !== undefined && quote.affineB !== undefined 
                    ? `a = ${quote.affineA}, b = ${quote.affineB}` 
                    : 'No coefficients available';
            case 'Hill 2x2':
            case 'Hill 3x3':
                // Find a 2-letter crib from the cipher text
                const hillCrib = find2LetterCrib(cleanCipherText, cleanPlainText);
                return hillCrib ? `Crib: ${hillCrib.cipher} → ${hillCrib.plain}` : 'No 2-letter crib found';
            case 'Fractionated Morse':
                // Find a 3-letter crib from the cipher text
                const morseCrib = find3LetterCrib(cleanCipherText, cleanPlainText);
                return morseCrib ? `Crib: ${morseCrib.cipher} → ${morseCrib.plain}` : 'No 3-letter crib found';
            case 'Baconian':
                // Find a 5-letter crib from the cipher text
                const baconianCrib = find5LetterCrib(cleanCipherText, cleanPlainText);
                return baconianCrib ? `Crib: ${baconianCrib.cipher} → ${baconianCrib.plain}` : 'No 5-letter crib found';
            case 'Nihilist':
                // Find a single letter crib
                const nihilistCrib = findSingleLetterCrib(cleanCipherText, cleanPlainText);
                return nihilistCrib ? `Crib: ${nihilistCrib.cipher} → ${nihilistCrib.plain}` : 'No single letter crib found';
            case 'Columnar Transposition':
                // Find the longest word in the original quote
                const words = quote.quote.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(word => word.length > 0);
                const longestWord = words.reduce((longest, current) => 
                    current.length > longest.length ? current : longest, '');
                return longestWord ? `Crib: ${longestWord}` : 'No word crib found';
            case 'Xenocrypt':
                // Find a Spanish word crib
                const xenocryptCrib = findSpanishWordCrib(cleanCipherText, cleanPlainText);
                return xenocryptCrib ? `Crib: ${xenocryptCrib.cipher} → ${xenocryptCrib.plain}` : 'No Spanish word crib found';
            case 'K1 Aristocrat':
            case 'K2 Aristocrat':
            case 'K3 Aristocrat':
            case 'Random Aristocrat':
            case 'K1 Patristocrat':
            case 'K2 Patristocrat':
            case 'K3 Patristocrat':
            case 'Random Patristocrat':
                // Find a word crib for aristocrat/patristocrat
                const aristocratCrib = findWordCrib(cleanCipherText, cleanPlainText);
                return aristocratCrib ? `Crib: ${aristocratCrib.cipher} → ${aristocratCrib.plain}` : 'No word crib found';
            case 'Atbash':
                // Find a single letter crib for atbash
                const atbashCrib = findSingleLetterCrib(cleanCipherText, cleanPlainText);
                return atbashCrib ? `Crib: ${atbashCrib.cipher} → ${atbashCrib.plain}` : 'No single letter crib found';
            default:
                return 'Click for a random letter hint';
        }
    };

    // Helper functions to find cribs
    const find2LetterCrib = (cipherText: string, plainText: string) => {
        const commonPairs = ['TH', 'HE', 'AN', 'IN', 'ER', 'RE', 'ON', 'AT', 'ND', 'ST', 'ES', 'EN', 'OF', 'TE', 'ED', 'OR', 'TI', 'HI', 'AS', 'TO'];
        
        for (const pair of commonPairs) {
            const plainIndex = plainText.indexOf(pair);
            if (plainIndex !== -1 && plainIndex + 1 < cipherText.length) {
                const cipherPair = cipherText.substring(plainIndex, plainIndex + 2);
                return { cipher: cipherPair, plain: pair };
            }
        }
        return null;
    };

    const find3LetterCrib = (cipherText: string, plainText: string) => {
        const commonTriplets = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW'];
        
        for (const triplet of commonTriplets) {
            const plainIndex = plainText.indexOf(triplet);
            if (plainIndex !== -1 && plainIndex + 2 < cipherText.length) {
                const cipherTriplet = cipherText.substring(plainIndex, plainIndex + 3);
                return { cipher: cipherTriplet, plain: triplet };
            }
        }
        return null;
    };

    const find5LetterCrib = (cipherText: string, plainText: string) => {
        const commonWords = ['THEIR', 'WOULD', 'THERE', 'COULD', 'THINK', 'AFTER', 'NEVER', 'ABOUT', 'AGAIN', 'BEFORE', 'LITTLE', 'SHOULD', 'BECAUSE'];
        
        for (const word of commonWords) {
            const plainIndex = plainText.indexOf(word);
            if (plainIndex !== -1 && plainIndex + 4 < cipherText.length) {
                const cipherWord = cipherText.substring(plainIndex, plainIndex + 5);
                return { cipher: cipherWord, plain: word };
            }
        }
        return null;
    };

    const findSingleLetterCrib = (cipherText: string, plainText: string) => {
        // Find the most frequent letter in the plain text
        const letterCount: { [key: string]: number } = {};
        for (const char of plainText) {
            letterCount[char] = (letterCount[char] || 0) + 1;
        }
        
        const mostFrequent = Object.entries(letterCount)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (mostFrequent) {
            const [letter, count] = mostFrequent;
            if (count > 1) {
                const plainIndex = plainText.indexOf(letter);
                if (plainIndex !== -1 && plainIndex < cipherText.length) {
                    return { cipher: cipherText[plainIndex], plain: letter };
                }
            }
        }
        return null;
    };

    const findWordCrib = (cipherText: string, plainText: string) => {
        const commonWords = ['THE', 'AND', 'THAT', 'HAVE', 'FOR', 'NOT', 'WITH', 'YOU', 'THIS', 'BUT', 'HIS', 'FROM', 'THEY', 'SAY', 'HER', 'SHE', 'WILL', 'ONE', 'ALL', 'WOULD', 'THERE', 'THEIR', 'WHAT', 'SO', 'UP', 'OUT', 'IF', 'ABOUT', 'WHO', 'GET', 'WHICH', 'GO', 'ME', 'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME', 'NO', 'JUST', 'HIM', 'KNOW', 'TAKE', 'PEOPLE', 'INTO', 'YEAR', 'YOUR', 'GOOD', 'SOME', 'COULD', 'THEM', 'SEE', 'OTHER', 'THAN', 'THEN', 'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK', 'ALSO', 'BACK', 'AFTER', 'USE', 'TWO', 'HOW', 'OUR', 'WORK', 'FIRST', 'WELL', 'WAY', 'EVEN', 'NEW', 'WANT', 'BECAUSE', 'ANY', 'THESE', 'GIVE', 'DAY', 'MOST', 'US'];
        
        for (const word of commonWords) {
            const plainIndex = plainText.indexOf(word);
            if (plainIndex !== -1 && plainIndex + word.length - 1 < cipherText.length) {
                const cipherWord = cipherText.substring(plainIndex, plainIndex + word.length);
                return { cipher: cipherWord, plain: word };
            }
        }
        return null;
    };

    const findSpanishWordCrib = (cipherText: string, plainText: string) => {
        // Normalize Spanish text for crib finding
        const normalizedPlainText = plainText
            .replace(/Á/g, 'A')
            .replace(/É/g, 'E')
            .replace(/Í/g, 'I')
            .replace(/Ó/g, 'O')
            .replace(/Ú/g, 'U')
            .replace(/Ü/g, 'U')
            .replace(/Ñ/g, 'N');
        
        const spanishWords = ['EL', 'LA', 'DE', 'QUE', 'Y', 'A', 'EN', 'UN', 'ES', 'SE', 'NO', 'TE', 'LO', 'LE', 'DA', 'SU', 'POR', 'SON', 'TRE', 'MAS', 'PARA', 'UNA', 'TAMBIEN', 'MI', 'PERO', 'SUS', 'ME', 'HA', 'SI', 'AL', 'COMO', 'BIEN', 'ESTA', 'ESTE', 'YA', 'CUANDO', 'TODO', 'ESTA', 'VAMOS', 'VER', 'DESPUES', 'HACE', 'DONDE', 'QUIEN', 'ESTAN', 'ASIA', 'HACIA', 'ESTOS', 'ESTAS', 'SINO', 'DURANTE', 'TODOS', 'PUEDE', 'TANTO', 'SIGLO', 'ANTES', 'MISMO', 'DESDE', 'PRIMERA', 'GRAN', 'PARTE', 'TODA', 'TENIA', 'TRES', 'SEGUN', 'MENOS', 'MUNDO', 'AÑO', 'BEN', 'MIENTRAS', 'CASO', 'NUNCA', 'PODER', 'OBRA', 'LUGAR', 'TAN', 'SEGURO', 'HORA', 'MANERA', 'AQUI', 'SER', 'DOS', 'PRIMERO', 'SOCIAL', 'REAL', 'FORMAR', 'TIEMPO', 'ELLA', 'MUCHO', 'GRUPO', 'SEGUIR', 'TIPO', 'ACTUAL', 'CONOCER', 'LADO', 'MOMENTO', 'MOSTRAR', 'PROBLEMA', 'SERVICIO', 'SENTIR', 'NACIONAL', 'HUMANO', 'SERIE', 'IMPORTANTE', 'CUERPO', 'ACTIVIDAD', 'PROCESO', 'INFORMACION', 'PRESENTAR', 'SISTEMA', 'POLITICO', 'ECONOMICO', 'CENTRO', 'COMUNIDAD', 'FINAL', 'RELACION', 'PROGRAMA', 'INTERES', 'NATURAL', 'CULTURA', 'PRODUCCION', 'AMERICA', 'CONDICION', 'PROYECTO', 'SOCIEDAD', 'ACTIVIDAD', 'ORGANIZACION', 'NECESARIO', 'DESARROLLO', 'PRESENTE', 'SITUACION', 'ESPECIAL', 'DIFERENTE', 'VARIO', 'SEGURO', 'ESPECIALMENTE', 'POSIBLE', 'ANTERIOR', 'PRINCIPAL', 'LARGO', 'CIENTIFICO', 'TECNICO', 'MEDICO', 'POLITICO', 'ECONOMICO', 'SOCIAL', 'CULTURAL', 'NATURAL', 'HISTORICO', 'GEOGRAFICO', 'LINGUISTICO', 'PSICOLOGICO', 'FILOSOFICO', 'MATEMATICO', 'FISICO', 'QUIMICO', 'BIOLOGICO', 'MEDICO', 'JURIDICO', 'MILITAR', 'RELIGIOSO', 'ARTISTICO', 'LITERARIO', 'MUSICAL', 'CINEMATOGRAFICO', 'TEATRAL', 'DANZARIO', 'PICTORICO', 'ESCULTORICO', 'ARQUITECTONICO', 'URBANISTICO', 'DISEÑADOR', 'INGENIERO', 'ARQUITECTO', 'MEDICO', 'ABOGADO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR', 'INGENIERO', 'ARQUITECTO', 'ABOGADO', 'MEDICO', 'PROFESOR', 'MAESTRO', 'DOCTOR'];
        
        for (const word of spanishWords) {
            const plainIndex = normalizedPlainText.indexOf(word);
            if (plainIndex !== -1 && plainIndex + word.length - 1 < cipherText.length) {
                const cipherWord = cipherText.substring(plainIndex, plainIndex + word.length);
                return { cipher: cipherWord, plain: word };
            }
        }
        return null;
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
                                                loadQuestionsFromDatabase();
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
                                        <span className={`px-2 py-1 rounded text-sm ${
                                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {item.cipherType.charAt(0).toUpperCase() + item.cipherType.slice(1)}
                                        </span>
                                        <button
                                            onClick={() => handleHintClick(index)}
                                            className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                                                darkMode 
                                                    ? 'bg-gray-600 border-gray-500 text-white' 
                                                    : 'text-gray-600'
                                            }`}
                                            title="Get a hint"
                                        >
                                            <svg 
                                                width="10" 
                                                height="10" 
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
                                        <button
                                            onClick={() => {
                                                setSelectedCipherType(item.cipherType);
                                                setInfoModalOpen(true);
                                            }}
                                            className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                                                darkMode 
                                                    ? 'bg-gray-600 border-gray-500 text-white' 
                                                    : 'text-gray-600'
                                            }`}
                                            title="Cipher information"
                                        >
                                            <svg 
                                                width="10" 
                                                height="10" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M12 16v-4"/>
                                                <path d="M12 8h.01"/>
                                            </svg>
                                        </button>
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

                                {(item.cipherType === 'Hill 2x2' || item.cipherType === 'Hill 3x3') ? (
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
                                ) : item.cipherType === 'Columnar Transposition' ? (
                                    <ColumnarTranspositionDisplay
                                        text={item.encrypted}
                                        quoteIndex={index}
                                        solution={item.solution}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                        onSolutionChange={handleSolutionChange}
                                    />
                                ) : item.cipherType === 'Nihilist' ? (
                                    <NihilistDisplay
                                        text={item.encrypted}
                                        polybiusKey={item.nihilistPolybiusKey!}
                                        cipherKey={item.nihilistCipherKey!}
                                        quoteIndex={index}
                                        solution={item.nihilistSolution}
                                        isTestSubmitted={isTestSubmitted}
                                        quotes={quotes}
                                        onSolutionChange={handleNihilistSolutionChange}
                                    />
                                ) : ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'Random Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt'].includes(item.cipherType) ? (
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
                                        className={`w-full px-4 py-2 font-semibold rounded-lg ${
                                            darkMode
                                                ? 'bg-gray-800 text-blue-300 border-2 border-blue-300 hover:bg-gray-700 hover:text-blue-200 hover:border-blue-200'
                                                : 'bg-gray-200 text-blue-700 border-2 border-blue-700 hover:bg-gray-100 hover:text-blue-600 hover:border-blue-600'
                                        }`}
                                    >
                                        Submit Answers
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            // Clear all test data
                                            localStorage.removeItem('codebustersQuotes');
                                            localStorage.removeItem('codebustersTimeLeft');
                                            localStorage.removeItem('codebustersIsTestSubmitted');
                                            localStorage.removeItem('codebustersTestScore');
                                            localStorage.removeItem('testParams');
                                            
                                            // Reset time management session
                                            const timeLimit = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.timeLimit || "15";
                                            const eventName = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.eventName || "Codebusters";
                                            const newSession = resetTestSession(eventName, parseInt(timeLimit));
                                            
                                            // Update state with new session
                                            setTimeLeft(newSession.timeState.timeLeft);
                                            setIsTimeSynchronized(newSession.timeState.isTimeSynchronized);
                                            setSyncTimestamp(newSession.timeState.syncTimestamp);
                                            setIsTestSubmitted(false);
                                            
                                            // Reload the page to start fresh
                                            window.location.reload();
                                        }}
                                        className={`w-full px-4 py-2 font-semibold rounded-lg ${
                                            darkMode
                                                ? 'bg-gray-800 text-blue-300 border-2 border-blue-300 hover:bg-gray-700 hover:text-blue-200 hover:border-blue-200'
                                                : 'bg-gray-200 text-blue-700 border-2 border-blue-700 hover:bg-gray-100 hover:text-blue-600 hover:border-blue-600'
                                        }`}
                                    >
                                        Reset Test
                                    </button>
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

                    {/* Cipher Info Modal */}
                    <CipherInfoModal
                        isOpen={infoModalOpen}
                        onClose={() => setInfoModalOpen(false)}
                        cipherType={selectedCipherType}
                        darkMode={darkMode}
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