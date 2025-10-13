'use client';
import React, { useEffect, useCallback, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';

import MainHeader from '@/app/components/Header';

import ShareModal from '@/app/components/ShareModal';
import {
  getCurrentTestSession,
  initializeTestSession,
  updateTimeLeft,
  markTestSubmitted,
  setupVisibilityHandling,
    clearTestSession,
    pauseTestSession,
    resumeFromPause
} from '@/app/utils/timeManagement';
import CipherInfoModal from './CipherInfoModal';
import { loadQuestionsFromDatabase } from './services/questionLoader';
import { supabase } from '@/lib/supabase';
import { updateMetrics } from '@/app/utils/metrics';
import { QuoteData } from './types';
import { cleanQuote } from './utils/quoteCleaner';
import { calculateCipherGrade } from './utils/gradingUtils';
import {
  k1Aristo as encryptK1Aristocrat,
  k2Aristo as encryptK2Aristocrat,
  k3Aristo as encryptK3Aristocrat,
  k1Patri as encryptK1Patristocrat,
  k2Patri as encryptK2Patristocrat,
  k3Patri as encryptK3Patristocrat,
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
  encryptRandomXenocrypt,
  k1Xeno as encryptK1Xenocrypt,
  k2Xeno as encryptK2Xenocrypt,
  k3Xeno as encryptK3Xenocrypt,
  encryptCheckerboard,
  encryptCryptarithm,
} from './cipher-utils';

// Import hooks
import { 
  useCodebustersState, 
  useAnswerChecking, 
  useHintSystem, 
  useSolutionHandlers, 
  useProgressCalculation 
} from './hooks';

// Import components
import { 
  Header, 
  LoadingState, 
  EmptyState, 
  ShareButton, 
  QuestionCard, 
  SubmitButton, 
  PDFModal,
  CodebustersSummary
} from './components';
import { FloatingActionButtons } from '@/app/components/FloatingActionButtons';

export default function CodeBusters() {
    const { darkMode } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOffline, setIsOffline] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    
    // Check for assignment parameter in URL
    const assignmentId = searchParams.get('assignment');
    
    // Detect offline status
    useEffect(() => {
        const updateOnline = () => setIsOffline(!navigator.onLine);
        updateOnline();
        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);
        
        return () => {
            window.removeEventListener('online', updateOnline);
            window.removeEventListener('offline', updateOnline);
        };
    }, []);

    // Use custom hooks for state management
    const {
        quotes,
        setQuotes,
        isTestSubmitted,
        setIsTestSubmitted,
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

        hasAttemptedLoad,
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
        loadPreferences
    } = useCodebustersState(assignmentId);

    // Use custom hooks for functionality
    const { checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer, checkCheckerboardAnswer } = useAnswerChecking(quotes);
    const { getHintContent, handleHintClick } = useHintSystem(
        quotes, 
        activeHints, 
        setActiveHints, 
        revealedLetters, 
        setRevealedLetters, 
        setQuotes,
        hintedLetters,
        setHintedLetters,
        hintCounts,
        setHintCounts
    );
    const { 
        handleSolutionChange, 
        handleBaconianSolutionChange, 
        handleHillSolutionChange, 
        handleNihilistSolutionChange,
        handleCheckerboardSolutionChange,
        handleKeywordSolutionChange,
        handleCryptarithmSolutionChange
    } = useSolutionHandlers(quotes, setQuotes);
    const { totalProgress, calculateQuoteProgress } = useProgressCalculation(quotes);

    // Setup visibility handling for time management
    useEffect(() => {
        const cleanup = setupVisibilityHandling();
        return cleanup;
    }, []);

    // Pause timer when navigating away/unmounting
    useEffect(() => {
        return () => {
            try { pauseTestSession(); } catch {}
        };
    }, []);

    // Ensure we resume from pause on mount so the ticker runs while on page
    useEffect(() => {
        try { resumeFromPause(); } catch {}
    }, []);

    // Handle test submission
    const handleSubmitTest = useCallback(async () => {
        let correctCount = 0;
        // Legacy correctness for UI percent
        quotes.forEach((quote, index) => {
            const isCorrect = ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt'].includes(quote.cipherType)
                ? checkSubstitutionAnswer(index)
                : (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3')
                    ? checkHillAnswer(index)
                    : quote.cipherType === 'Porta'
                        ? checkPortaAnswer(index)
                        : quote.cipherType === 'Baconian'
                            ? checkBaconianAnswer(index)
                            : quote.cipherType === 'Checkerboard'
                                ? checkCheckerboardAnswer(index)
                                : false;
            if (isCorrect) correctCount++;
        });

        // Calculate UI score as percentage
        const score = (correctCount / Math.max(1, quotes.length)) * 100;
        setTestScore(score);
        setIsTestSubmitted(true);
        
        // Scroll to top when test is submitted - more robust approach
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        
        // Mark test as submitted using new time management system
        markTestSubmitted();

        // Calculate points using the exact same method as the test summary
        let totalPointsEarned = 0;
        let totalPointsAttempted = 0;
        let totalInputs = 0;
        
        quotes.forEach((quote, quoteIndex) => {
            // Import the grading function (we'll need to add this import)
            const gradeResult = calculateCipherGrade(quote, quoteIndex, {}, {});
            totalPointsEarned += gradeResult.score;
            totalPointsAttempted += gradeResult.attemptedScore;
            totalInputs += gradeResult.totalInputs;
        });
        
        // Store these values for assignment submission
        const codebustersPoints = {
            totalPointsEarned: Math.round(totalPointsEarned),
            totalPointsAttempted: Math.round(totalPointsAttempted),
            totalInputs: totalInputs
        };

        try {
            const { data: { user } } = await supabase.auth.getUser();
            await updateMetrics(user?.id || null, {
                questionsAttempted: Math.round(totalPointsAttempted),
                // Use the exact same calculation as the test summary
                correctAnswers: Math.round(totalPointsEarned),
                eventName: 'Codebusters'
            });
        } catch (e) {
            console.error('Failed to update metrics for Codebusters:', e);
        }

        // If this is an assignment, save the results
        if (assignmentId) {
            try {
                console.log('Submitting Codebusters assignment results...');
                
                // Prepare submission data
                const submissionData = {
                    assignmentId: assignmentId,
                    answers: quotes.map((quote, index) => ({
                        questionId: quote.id,
                        answer: quote.solution || '',
                        isCorrect: ['K1 Aristocrat', 'K2 Aristocrat', 'K3 Aristocrat', 'K1 Patristocrat', 'K2 Patristocrat', 'K3 Patristocrat', 'Random Aristocrat', 'Random Patristocrat', 'Caesar', 'Atbash', 'Affine', 'Xenocrypt'].includes(quote.cipherType)
                            ? checkSubstitutionAnswer(index)
                            : (quote.cipherType === 'Hill 2x2' || quote.cipherType === 'Hill 3x3')
                                ? checkHillAnswer(index)
                                : quote.cipherType === 'Porta'
                                    ? checkPortaAnswer(index)
                                    : quote.cipherType === 'Baconian'
                                        ? checkBaconianAnswer(index)
                                        : quote.cipherType === 'Checkerboard'
                                            ? checkCheckerboardAnswer(index)
                                            : false,
                        points: quote.points || 10,
                        timeSpent: 0, // Could track time per question if needed
                        // Add progress and difficulty for proper point calculation
                        progress: calculateQuoteProgress(quote),
                        difficulty: typeof quote.difficulty === 'number' ? quote.difficulty : 0.5
                    })),
                    totalScore: score,
                    timeSpent: 0, // Could track total time if needed
                    submittedAt: new Date().toISOString(),
                    isDynamicCodebusters: true, // Flag to indicate this is a dynamic Codebusters assignment
                    // Send the exact same values as the test summary
                    codebustersPoints: codebustersPoints
                };

                const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(submissionData)
                });

                if (response.ok) {
                    console.log('Assignment submitted successfully');
                    toast.success('Assignment submitted successfully!');
                    
                    // Remove assignment query parameter from URL after successful submission
                    const url = new URL(window.location.href);
                    url.searchParams.delete('assignment');
                    window.history.replaceState({}, '', url.pathname + url.search);
                } else {
                    console.error('Failed to submit assignment');
                    toast.error('Failed to submit assignment');
                }
            } catch (error) {
                console.error('Error submitting assignment:', error);
                toast.error('Error submitting assignment');
            }
        }
    }, [quotes, checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer, checkCheckerboardAnswer, setTestScore, setIsTestSubmitted, calculateQuoteProgress, assignmentId]);

    // Handle time management
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

            } else if (!session.timeState.isPaused) {
                // Non-synchronized test - decrement from stored timeLeft only while mounted/not paused
                const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isTestSubmitted, handleSubmitTest, setTimeLeft]);

    // Handle loading assignment questions
    const handleLoadAssignmentQuestions = useCallback(async (assignmentId: string) => {
        try {
            console.log('=== LOADING CODEBUSTERS ASSIGNMENT ===');
            console.log('Assignment ID:', assignmentId);
            
            const response = await fetch(`/api/assignments/${assignmentId}`);
            console.log('Assignment API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Assignment data:', data);
                
                const assignment = data.assignment;
                const questions = assignment.questions;
                console.log('Questions from assignment:', questions);
                console.log('Questions length:', questions?.length || 0);
                
                if (questions && questions.length > 0) {
                    // Check if this is a parameters-based assignment (dynamic generation)
                    const paramsQuestion = questions.find((q: any) => q.question_type === 'codebusters_params');
                    console.log('Looking for parameters question:', paramsQuestion);
                    
                    if (paramsQuestion && paramsQuestion.parameters) {
                        console.log('Found parameters question, generating Codebusters questions dynamically from parameters:', paramsQuestion.parameters);
                        
                        // Generate questions dynamically using the parameters
                        try {
                            const generatedQuestions = await generateCodebustersQuestionsFromParams(paramsQuestion.parameters);
                            setQuotes(generatedQuestions);
                            
                            // Set time limit from assignment
                            const timeLimit = assignment.time_limit_minutes || 15;
                            setTimeLeft(timeLimit * 60);
                            
                            setIsLoading(false);
                            console.log('=== DYNAMIC QUESTIONS GENERATED SUCCESSFULLY ===');
                        } catch (error) {
                            console.error('Error generating dynamic questions:', error);
                            setError('Failed to generate questions for this assignment');
                            setIsLoading(false);
                        }
                    } else {
                        console.log('No parameters question found, converting pre-generated questions');
                        // Convert pre-generated assignment questions to QuoteData format
                        const codebustersQuotes: QuoteData[] = questions.map((q: any, index: number) => ({
                            id: q.id || `assignment-${index}`,
                            quote: q.quote || q.question_text || '',
                            author: q.author || 'Unknown',
                            cipherType: q.cipherType || 'Random Aristocrat',
                            difficulty: q.difficulty || 'Medium',
                            division: q.division || 'C',
                            charLength: q.charLength || 100,
                            encrypted: q.encrypted || '',
                            key: q.key || '',
                            hint: q.hint || '',
                            solution: q.solution || q.correct_answer || ''
                        }));
                        
                        console.log('Converted to Codebusters format:', codebustersQuotes);
                        setQuotes(codebustersQuotes);
                        
                        // Set time limit from assignment
                        const timeLimit = assignment.time_limit_minutes || 15;
                        setTimeLeft(timeLimit * 60);
                        
                        setIsLoading(false);
                        console.log('=== ASSIGNMENT LOADED SUCCESSFULLY ===');
                    }
                } else {
                    console.log('No questions found in assignment, setting error');
                    setError('No questions found in this assignment');
                    setIsLoading(false);
                }
            } else {
                setError('Failed to load assignment');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error loading assignment:', error);
            setError('Failed to load assignment');
            setIsLoading(false);
        }
    }, [setQuotes, setTimeLeft, setIsLoading, setError]);

    // Generate Codebusters questions from assignment parameters
    const generateCodebustersQuestionsFromParams = async (params: any): Promise<QuoteData[]> => {
        try {
            console.log('Generating questions with params:', params);
            
            // Fetch quotes from the API
            const quotesResponse = await fetch(`/api/quotes?language=en&limit=${params.questionCount * 2}&charLengthMin=${params.charLengthMin}&charLengthMax=${params.charLengthMax}`);
            if (!quotesResponse.ok) {
                throw new Error('Failed to fetch quotes');
            }
            
            const quotesData = await quotesResponse.json();
            const quotes = quotesData.data?.quotes || quotesData.quotes || [];
            
            if (quotes.length === 0) {
                throw new Error('No quotes available');
            }

            // Generate encrypted quotes using the selected cipher types
            const generatedQuestions: QuoteData[] = [];
            const cipherTypes = params.cipherTypes || ['Caesar'];
            
            for (let i = 0; i < params.questionCount; i++) {
                const quote = quotes[i % quotes.length];
                const cipherType = cipherTypes[i % cipherTypes.length];
                
                console.log(`Generating question ${i + 1} with cipher type: ${cipherType}`);
                
                // Clean the quote for encryption
                const cleanedQuote = cleanQuote(quote.quote);
                console.log(`Cleaned quote: ${cleanedQuote}`);
                
                // Encrypt the quote using the appropriate cipher
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
                        cipherResult = encryptK1Aristocrat(cleanedQuote);
                        break;
                    case 'K2 Aristocrat':
                        cipherResult = encryptK2Aristocrat(cleanedQuote);
                        break;
                    case 'K3 Aristocrat':
                        cipherResult = encryptK3Aristocrat(cleanedQuote);
                        break;
                    case 'K1 Patristocrat':
                        cipherResult = encryptK1Patristocrat(cleanedQuote);
                        break;
                    case 'K2 Patristocrat':
                        cipherResult = encryptK2Patristocrat(cleanedQuote);
                        break;
                    case 'K3 Patristocrat':
                        cipherResult = encryptK3Patristocrat(cleanedQuote);
                        break;
                    case 'Random Aristocrat':
                        cipherResult = encryptRandomAristocrat(cleanedQuote);
                        break;
                    case 'Random Patristocrat':
                        cipherResult = encryptRandomPatristocrat(cleanedQuote);
                        break;
                    case 'Caesar':
                        cipherResult = encryptCaesar(cleanedQuote);
                        break;
                    case 'Atbash':
                        cipherResult = encryptAtbash(cleanedQuote);
                        break;
                    case 'Affine':
                        cipherResult = encryptAffine(cleanedQuote);
                        break;
                    case 'Hill 2x2':
                        cipherResult = encryptHill2x2(cleanedQuote);
                        break;
                    case 'Hill 3x3':
                        cipherResult = encryptHill3x3(cleanedQuote);
                        break;
                    case 'Porta':
                        cipherResult = encryptPorta(cleanedQuote);
                        break;
                    case 'Baconian':
                        cipherResult = encryptBaconian(cleanedQuote);
                        break;
                    case 'Nihilist':
                        cipherResult = encryptNihilist(cleanedQuote);
                        break;
                    case 'Fractionated Morse':
                        cipherResult = encryptFractionatedMorse(cleanedQuote);
                        break;
                    case 'Complete Columnar':
                        cipherResult = encryptColumnarTransposition(cleanedQuote);
                        break;
                    case 'Random Xenocrypt':
                        cipherResult = encryptRandomXenocrypt(cleanedQuote);
                        break;
                    case 'K1 Xenocrypt':
                        cipherResult = encryptK1Xenocrypt(cleanedQuote);
                        break;
                    case 'K2 Xenocrypt':
                        cipherResult = encryptK2Xenocrypt(cleanedQuote);
                        break;
                    case 'K3 Xenocrypt':
                        cipherResult = encryptK3Xenocrypt(cleanedQuote);
                        break;
                    case 'Checkerboard':
                        cipherResult = encryptCheckerboard(cleanedQuote);
                        break;
                    case 'Cryptarithm':
                        cipherResult = encryptCryptarithm(cleanedQuote);
                        break;
                    default:
                        console.warn(`Unknown cipher type: ${cipherType}, defaulting to Caesar`);
                        cipherResult = encryptCaesar(cleanedQuote);
                }
                
                console.log(`Encryption result:`, cipherResult);
                
                // Create the question with proper encryption
                const question: QuoteData = {
                    id: `assignment-${i}`,
                    author: quote.author,
                    quote: quote.quote,
                    encrypted: cipherResult.encrypted,
                    cipherType: cipherType as any,
                    difficulty: 0.5,
                    division: params.division || 'C',
                    charLength: quote.quote.length,
                    key: cipherResult.key || '',
                    hint: '', // Could be generated based on cipher type if needed
                    solution: {}, // Initialize as empty object for progress tracking
                    points: 10,
                    // Add cipher-specific properties
                    ...(cipherResult.matrix && { matrix: cipherResult.matrix }),
                    ...(cipherResult.keyword && { portaKeyword: cipherResult.keyword }),
                    ...(cipherResult.shift && { caesarShift: cipherResult.shift }),
                    ...(cipherResult.a && cipherResult.b && { affineA: cipherResult.a, affineB: cipherResult.b }),
                    ...(cipherResult.fractionationTable && { fractionationTable: cipherResult.fractionationTable })
                };
                
                generatedQuestions.push(question);
            }
            
            return generatedQuestions;
        } catch (error) {
            console.error('Error generating Codebusters questions:', error);
            throw error;
        }
    };

    // Handle loading questions from database
    const handleLoadQuestions = useCallback(async () => {
        await loadQuestionsFromDatabase(
            setIsLoading,
            setError,
            setQuotes,
            setTimeLeft,
            setIsTestSubmitted,
            setTestScore,
            loadPreferences
        );
    }, [setIsLoading, setError, setQuotes, setTimeLeft, setIsTestSubmitted, setTestScore, loadPreferences]);

    // Handle reset functionality
    const handleReset = useCallback(() => {
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
        localStorage.removeItem('codebustersRevealedLetters');
        localStorage.removeItem('codebustersHintedLetters');
        localStorage.removeItem('codebustersHintCounts');
        localStorage.removeItem('shareCode');
        
        // Set force refresh flag to get new random quotes
        localStorage.setItem('codebustersForceRefresh', 'true');
        
        // Clear time management session completely
        clearTestSession();
        
        // Initialize a fresh session with the correct time limit
        initializeTestSession(eventName, timeLimit, false);
        
        // Set resetting state and update other state
        setIsResetting(true);
        setIsTestSubmitted(false);
        setTestScore(0);
        setTimeLeft(timeLimit * 60);
        
        // Clear hint states
        setActiveHints({});
        setRevealedLetters({});
        setHintedLetters({});
        setHintCounts({});
        setHintedLetters({});
        setHintCounts({});
        
        // Use the original loader but with a custom callback to avoid clearing quotes immediately
        const customSetLoading = (loading: boolean) => {
            // Don't set loading to true during reset to keep old quotes visible
            if (!loading) {
                setIsLoading(false);
            }
        };
        
        const customSetQuotes = (newQuotes: QuoteData[]) => {
            setQuotes(newQuotes);
            setIsResetting(false);
        };
        
        loadQuestionsFromDatabase(
            customSetLoading,
            setError,
            customSetQuotes,
            setTimeLeft,
            setIsTestSubmitted,
            setTestScore,
            loadPreferences
        );
    }, [loadPreferences, setQuotes, setIsTestSubmitted, setTestScore, setTimeLeft, setError, setIsLoading, setActiveHints, setRevealedLetters, setHintedLetters, setHintCounts]);

    // Handle back navigation: preserve Codebusters progress for resume banner on Practice
    const handleBack = useCallback(() => {
        try {
            // Ensure timer is paused when exiting
            pauseTestSession();
            // Only clear unrelated unlimited cache; keep Codebusters keys and testParams so Practice can detect progress
            localStorage.removeItem('unlimitedQuestions');
        } catch {}
        router.push('/practice');
    }, [router]);

    // Handle retry loading
    const handleRetry = useCallback(() => {
        setError(null);
        setIsLoading(true);
        handleLoadQuestions();
    }, [setError, setIsLoading, handleLoadQuestions]);

    // Handle navigation to practice page
    const handleGoToPractice = useCallback(() => {
        router.push('/practice');
    }, [router]);

    // Handle test reset after submission
    const handleTestReset = useCallback(() => {
        // Scroll to top when resetting test
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        
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
        localStorage.removeItem('codebustersRevealedLetters');
        localStorage.removeItem('codebustersHintedLetters');
        localStorage.removeItem('codebustersHintCounts');
        localStorage.removeItem('shareCode');
        
        // Set force refresh flag to get new random quotes
        localStorage.setItem('codebustersForceRefresh', 'true');
        
        // Clear time management session completely
        clearTestSession();
        
        // Initialize a fresh session with the correct time limit
        initializeTestSession(eventName, timeLimit, false);
        
        // Set resetting state and update other state
        setIsResetting(true);
        setIsTestSubmitted(false);
        setTestScore(0);
        setTimeLeft(timeLimit * 60);
        
        // Clear hint states
        setActiveHints({});
        setRevealedLetters({});
        
        // Use the original loader but with a custom callback to avoid clearing quotes immediately
        const customSetLoading = (loading: boolean) => {
            // Don't set loading to true during reset to keep old quotes visible
            if (!loading) {
                setIsLoading(false);
            }
        };
        
        const customSetQuotes = (newQuotes: QuoteData[]) => {
            setQuotes(newQuotes);
            setIsResetting(false);
        };
        
        loadQuestionsFromDatabase(
            customSetLoading,
            setError,
            customSetQuotes,
            setTimeLeft,
            setIsTestSubmitted,
            setTestScore,
            loadPreferences
        );
    }, [loadPreferences, setQuotes, setIsTestSubmitted, setTestScore, setTimeLeft, setError, setIsLoading, setActiveHints, setRevealedLetters]);

    // Load questions if needed
    useEffect(() => {
        console.log('=== CODEBUSTERS LOADING EFFECT DEBUG ===');
        console.log('hasAttemptedLoad:', hasAttemptedLoad);
        console.log('quotes.length:', quotes.length);
        console.log('isLoading:', isLoading);
        console.log('error:', error);
        console.log('assignmentId:', assignmentId);
        
        if (hasAttemptedLoad && quotes.length === 0 && !isLoading && !error) {
            if (assignmentId) {
                console.log('=== CODEBUSTERS ASSIGNMENT LOADING DEBUG ===');
                console.log('Assignment ID:', assignmentId);
                console.log('Loading assignment questions for Codebusters');
                handleLoadAssignmentQuestions(assignmentId);
            } else {
                console.log('No assignment ID, triggering loadQuestionsFromDatabase');
                handleLoadQuestions();
            }
        } else {
            console.log('Loading conditions not met, skipping load');
        }
    }, [hasAttemptedLoad, quotes.length, isLoading, error, handleLoadQuestions, handleLoadAssignmentQuestions, assignmentId]);

    return (
        <>
            <MainHeader />
            <div className="relative min-h-screen">
                {/* Background */}
                <div
                    className={`absolute inset-0 ${
                        darkMode ? 'bg-gray-900' : 'bg-gray-50'
                    }`}
                ></div>

                {/* Global scrollbar theme is centralized in globals.css */}

                {/* Page Content */}
                <div className="relative flex flex-col items-center p-3 md:p-6 pt-24 md:pt-24">
                    <Header 
                        darkMode={darkMode}
                        timeLeft={timeLeft}
                        isTestSubmitted={isTestSubmitted}
                    />

                    {/* Inline back link to Practice */}
                    <div className="w-full max-w-[90vw] md:max-w-6xl mt-0 mb-3">
                      <button
                        onClick={handleBack}
                        className={`group inline-flex items-center text-base font-medium ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
                        <span className="ml-2">Go back</span>
                      </button>
                    </div>

                    {/* Progress Bar or Summary */}
                    {isTestSubmitted ? (
                        <div className="w-full">
                            <CodebustersSummary
                                quotes={quotes}
                                darkMode={darkMode}
                                hintedLetters={hintedLetters}
                                _hintCounts={hintCounts}
                            />
                        </div>
                    ) : (
                        <div
                            className={`sticky top-4 z-10 w-full max-w-[90vw] md:max-w-6xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
                        >
                            <div
                                className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                                style={{ width: `${totalProgress}%` }}
                            ></div>
                        </div>
                    )}

                    <main
                        className={`w-full max-w-[90vw] md:max-w-6xl rounded-lg shadow-md p-3 md:p-6 mt-4 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                    >
                        <LoadingState 
                            isLoading={isLoading && !isResetting}
                            error={error}
                            darkMode={darkMode}
                            onRetry={handleRetry}
                            onGoToPractice={handleGoToPractice}
                        />
                        
                        <EmptyState 
                            darkMode={darkMode}
                            hasAttemptedLoad={hasAttemptedLoad}
                            isLoading={isLoading && !isResetting}
                            error={error}
                            quotes={quotes}
                        />
                        
                        {/* Take together button - positioned right above questions */}
                        {!isLoading && !error && quotes.length > 0 && hasAttemptedLoad && (
                            <ShareButton 
                                onShare={() => setShareModalOpen(true)} 
                                onReset={handleReset}
                                isOffline={isOffline} 
                                darkMode={darkMode}
                            />
                        )}
                        
                        {!isLoading && !error && hasAttemptedLoad && quotes.length > 0 && quotes.map((item, index) => (
                            <QuestionCard
                                key={index}
                                item={item}
                                index={index}
                                darkMode={darkMode}
                                isTestSubmitted={isTestSubmitted}
                                quotes={quotes}
                                activeHints={activeHints}
                                getHintContent={getHintContent}
                                handleHintClick={handleHintClick}
                                setSelectedCipherType={setSelectedCipherType}
                                setInfoModalOpen={setInfoModalOpen}
                                handleSolutionChange={handleSolutionChange}
                                handleBaconianSolutionChange={handleBaconianSolutionChange}
                                handleHillSolutionChange={handleHillSolutionChange}
                                handleNihilistSolutionChange={handleNihilistSolutionChange}
                                handleCheckerboardSolutionChange={handleCheckerboardSolutionChange}
                                handleCryptarithmSolutionChange={handleCryptarithmSolutionChange}
                                handleKeywordSolutionChange={handleKeywordSolutionChange}
                                hintedLetters={hintedLetters}
                                _hintCounts={hintCounts}
                            />
                        ))}
                        
                        {/* Submit Button */}
                        {!isLoading && !error && quotes.length > 0 && hasAttemptedLoad && !isResetting && (
                            <SubmitButton 
                                isTestSubmitted={isTestSubmitted}
                                darkMode={darkMode}
                                onSubmit={handleSubmitTest}
                                onReset={handleTestReset}
                                onGoBack={handleGoToPractice}
                                isAssignment={!!assignmentId}
                            />
                        )}
                    </main>

                    {/* Floating Action Buttons */}
                    <FloatingActionButtons
                        darkMode={darkMode}
                        showReferenceButton={true}
                        onShowReference={() => setShowPDFViewer(true)}
                        eventName="Codebusters"
                    />

                    {/* Custom PDF Modal */}
                    <PDFModal 
                        showPDFViewer={showPDFViewer}
                        darkMode={darkMode}
                        onClose={() => setShowPDFViewer(false)}
                    />

                    {/* Share Modal */}
                    <ShareModal
                        isOpen={shareModalOpen}
                        onClose={() => setShareModalOpen(false)}
                        inputCode={inputCode}
                        setInputCode={setInputCode}
                        darkMode={darkMode}
                        isCodebusters={true}
                        encryptedQuotes={quotes as any}
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
            
            {/* Global ToastContainer handles notifications */}
        </>
    );
}