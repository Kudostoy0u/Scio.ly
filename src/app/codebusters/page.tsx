'use client';
import React, { useEffect, useCallback, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

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
    const [isOffline, setIsOffline] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    
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
    } = useCodebustersState();

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
        handleFrequencyNoteChange, 
        handleHillSolutionChange, 
        handleNihilistSolutionChange,
        handleCheckerboardSolutionChange
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

        // Metrics: Codebusters weighting: 20 * difficulty, skipped don’t count, correct only when fully correct
        let attemptedPoints = 0;
        let correctPoints = 0;
        quotes.forEach((q) => {
            const diff = typeof (q as any).difficulty === 'number' ? (q as any).difficulty : 0.5;
            const weight = Math.round(20 * Math.max(0, Math.min(1, diff)));
            const pct = Math.max(0, Math.min(100, calculateQuoteProgress(q)));
            if (pct > 0) {
                attemptedPoints += weight;
                // fractional correctness credit: weight * percent solved
                correctPoints += weight * (pct / 100);
            }
        });

        try {
            const { data: { user } } = await supabase.auth.getUser();
            await updateMetrics(user?.id || null, {
                questionsAttempted: Math.round(attemptedPoints),
                // fractional credit on correctness: weight * percent solved, rounded for storage
                correctAnswers: Math.round(correctPoints),
                eventName: 'Codebusters'
            });
        } catch (e) {
            console.error('Failed to update metrics for Codebusters:', e);
        }
    }, [quotes, checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer, checkCheckerboardAnswer, setTestScore, setIsTestSubmitted, calculateQuoteProgress]);

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
        if (hasAttemptedLoad && quotes.length === 0 && !isLoading && !error) {
            console.log('Triggering loadQuestionsFromDatabase');
            handleLoadQuestions();
        }
    }, [hasAttemptedLoad, quotes.length, isLoading, error, handleLoadQuestions]);

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
                <div className="relative flex flex-col items-center p-6 pt-20">
                    <Header 
                        darkMode={darkMode}
                        timeLeft={timeLeft}
                        isTestSubmitted={isTestSubmitted}
                    />

                    {/* Inline back link to Practice */}
                    <div className="w-full max-w-3xl mt-0 mb-3">
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
                            className={`sticky top-4 z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
                        >
                            <div
                                className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                                style={{ width: `${totalProgress}%` }}
                            ></div>
                        </div>
                    )}

                    <main
                        className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4 ${
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
                                handleFrequencyNoteChange={handleFrequencyNoteChange}
                                handleHillSolutionChange={handleHillSolutionChange}
                                handleNihilistSolutionChange={handleNihilistSolutionChange}
                                handleCheckerboardSolutionChange={handleCheckerboardSolutionChange}
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