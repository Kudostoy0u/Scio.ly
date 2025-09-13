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


import { 
  useCodebustersState, 
  useAnswerChecking, 
  useHintSystem, 
  useSolutionHandlers, 
  useProgressCalculation 
} from './hooks';


import { 
  Header, 
  LoadingState, 
  EmptyState, 
  ShareButton, 
  QuestionCard, 
  SubmitButton, 
  PDFModal,
  CodebustersSummary,
  PrintConfigModal
} from './components';
import { FloatingActionButtons } from '@/app/components/FloatingActionButtons';
import { createPrintStyles, createPrintContent, setupPrintWindow, createInPagePrint } from './utils/printUtils';
import { resolveQuestionPoints } from './utils/gradingUtils';

export default function CodeBusters() {
    const { darkMode } = useTheme();
    const router = useRouter();
    const [isOffline, setIsOffline] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    

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
    } = useCodebustersState();


    const { checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer, checkCheckerboardAnswer, checkCryptarithmAnswer } = useAnswerChecking(quotes);
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
        handleCryptarithmSolutionChange,
        handleKeywordSolutionChange
    } = useSolutionHandlers(quotes, setQuotes);
    const { totalProgress, calculateQuoteProgress } = useProgressCalculation(quotes);




    useEffect(() => {
        const cleanup = setupVisibilityHandling();
        return cleanup;
    }, []);


    useEffect(() => {
        return () => {
            try { pauseTestSession(); } catch {}
        };
    }, []);


    useEffect(() => {
        try { resumeFromPause(); } catch {}
    }, []);


    const handleSubmitTest = useCallback(async () => {
        let correctCount = 0;

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
            : quote.cipherType === 'Cryptarithm'
                ? checkCryptarithmAnswer(index)
                : false;
            if (isCorrect) correctCount++;
        });


        const score = (correctCount / Math.max(1, quotes.length)) * 100;
        setTestScore(score);
        setIsTestSubmitted(true);
        

        try {
            localStorage.setItem('codebustersIsTestSubmitted', 'true');
            localStorage.setItem('codebustersTestScore', score.toString());
            localStorage.setItem('codebustersTimeLeft', timeLeft?.toString() || '0');
            localStorage.setItem('codebustersQuotes', JSON.stringify(quotes));
            localStorage.setItem('codebustersQuotesLoadedFromStorage', 'true');
        } catch {}
        

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        

        markTestSubmitted();


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
    }, [quotes, checkSubstitutionAnswer, checkHillAnswer, checkPortaAnswer, checkBaconianAnswer, checkCheckerboardAnswer, checkCryptarithmAnswer, setTestScore, setIsTestSubmitted, calculateQuoteProgress, timeLeft]);


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
            

            if (session.timeState.isTimeSynchronized && session.timeState.syncTimestamp && session.timeState.originalTimeAtSync) {

                const now = Date.now();
                const elapsedMs = now - session.timeState.syncTimestamp;
                const elapsedSeconds = Math.floor(elapsedMs / 1000);
                const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);

            } else if (!session.timeState.isPaused) {

                const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
                setTimeLeft(newTimeLeft);
                updateTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isTestSubmitted, handleSubmitTest, setTimeLeft]);


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


    const handleReset = useCallback(() => {

        const testParams = JSON.parse(localStorage.getItem('testParams') || '{}');
        const eventName = testParams.eventName || 'Codebusters';
        const preferences = loadPreferences(eventName);
        const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
        

        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersQuoteIndices');
        localStorage.removeItem('codebustersQuoteUUIDs');
        localStorage.removeItem('codebustersShareData');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('codebustersRevealedLetters');
        localStorage.removeItem('codebustersHintedLetters');
        localStorage.removeItem('codebustersHintCounts');
        localStorage.removeItem('shareCode');
        

        localStorage.setItem('codebustersForceRefresh', 'true');
        

        clearTestSession();
        

        initializeTestSession(eventName, timeLimit, false);
        

        setIsResetting(true);
        setIsTestSubmitted(false);
        setTestScore(0);
        setTimeLeft(timeLimit * 60);
        

        setActiveHints({});
        setRevealedLetters({});
        setHintedLetters({});
        setHintCounts({});
        setResetTrigger(prev => prev + 1);
        

        const customSetLoading = (loading: boolean) => {

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
    }, [loadPreferences, setQuotes, setIsTestSubmitted, setTestScore, setTimeLeft, setError, setIsLoading, setActiveHints, setRevealedLetters, setHintedLetters, setHintCounts, setResetTrigger]);


    const handleBack = useCallback(() => {
        try {

            pauseTestSession();

            localStorage.removeItem('unlimitedQuestions');
        } catch {}
        router.push('/practice');
    }, [router]);


    const handleRetry = useCallback(() => {
        setError(null);
        setIsLoading(true);
        handleLoadQuestions();
    }, [setError, setIsLoading, handleLoadQuestions]);


    const handleGoToPractice = useCallback(() => {
        router.push('/practice');
    }, [router]);


    const handleTestReset = useCallback(() => {

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        

        const testParams = JSON.parse(localStorage.getItem('testParams') || '{}');
        const eventName = testParams.eventName || 'Codebusters';
        const preferences = loadPreferences(eventName);
        const timeLimit = parseInt(testParams.timeLimit) || preferences.timeLimit;
        

        localStorage.removeItem('codebustersQuotes');
        localStorage.removeItem('codebustersQuoteIndices');
        localStorage.removeItem('codebustersQuoteUUIDs');
        localStorage.removeItem('codebustersShareData');
        localStorage.removeItem('codebustersIsTestSubmitted');
        localStorage.removeItem('codebustersTestScore');
        localStorage.removeItem('codebustersTimeLeft');
        localStorage.removeItem('codebustersRevealedLetters');
        localStorage.removeItem('codebustersHintedLetters');
        localStorage.removeItem('codebustersHintCounts');
        localStorage.removeItem('codebustersQuotesLoadedFromStorage');
        localStorage.removeItem('shareCode');
        

        localStorage.setItem('codebustersForceRefresh', 'true');
        

        clearTestSession();
        

        initializeTestSession(eventName, timeLimit, false);
        

        setIsResetting(true);
        setIsTestSubmitted(false);
        setTestScore(0);
        setTimeLeft(timeLimit * 60);
        

        setActiveHints({});
        setRevealedLetters({});
        

        const customSetLoading = (loading: boolean) => {

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


    const handlePrintConfig = useCallback(() => {
        setPrintModalOpen(true);
    }, [setPrintModalOpen]);


    const handleActualPrint = useCallback(async () => {
        if (!tournamentName.trim()) {
            toast.error('Tournament name is required');
            return;
        }


        const questionsContainer = document.querySelector('[data-questions-container]');
        if (!questionsContainer) {
            toast.error('Could not find questions to print');
            return;
        }


        const clonedContainer = questionsContainer.cloneNode(true) as HTMLElement;
        

        const interactiveElements = clonedContainer.querySelectorAll('button, .hint-button, .info-button, .floating-buttons');
        interactiveElements.forEach(el => el.remove());


        const questionHeaders = clonedContainer.querySelectorAll('[data-question-header]');
        questionHeaders.forEach((header, index) => {
            const pts = resolveQuestionPoints(quotes[index], index, questionPoints);
            header.textContent = `Question ${index + 1} [${pts} pts]`;
        });



        // onto the same page when space allows.


        const getStylesheets = () => {
            const stylesheets = Array.from(document.styleSheets);
            let cssText = '';
            
            stylesheets.forEach(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || sheet.rules || []);
                    rules.forEach(rule => {
                        cssText += rule.cssText + '\n';
                    });
                } catch {

                    console.log('Skipping external stylesheet:', sheet.href);
                }
            });
            
            return cssText;
        };


        const printStyles = createPrintStyles(getStylesheets);


        const createCodebustersAnswerKey = () => {
            let answerKeyHtml = '<div class="answer-key-section">';
            answerKeyHtml += '<div class="answer-key-header">ANSWER KEY</div>';
            answerKeyHtml += '<div class="answer-key-content">';
            

            const totalQuestions = quotes.length;
            const columns = Math.min(2, Math.ceil(totalQuestions / 10)); // 10 questions per column max
            const questionsPerColumn = Math.ceil(totalQuestions / columns);
            
            for (let col = 0; col < columns; col++) {
                answerKeyHtml += '<div class="answer-column">';
                
                for (let i = col * questionsPerColumn; i < Math.min((col + 1) * questionsPerColumn, totalQuestions); i++) {
                    const quote = quotes[i];
                    const questionNumber = i + 1;
                    

                    const decryptedQuote = quote.quote || '[No solution available]';
                    answerKeyHtml += `<div class="answer-item"><strong>${questionNumber}.</strong> ${decryptedQuote}</div>`;
                }
                
                answerKeyHtml += '</div>';
            }
            
            answerKeyHtml += '</div>';
            answerKeyHtml += '</div>';
            
            return answerKeyHtml;
        };


        const printContent = createPrintContent({
            tournamentName,
            questionsHtml: clonedContainer.innerHTML + createCodebustersAnswerKey(),
            questionPoints
        }, printStyles);


        try {

            await createInPagePrint({
                tournamentName,
                questionsHtml: clonedContainer.innerHTML + createCodebustersAnswerKey(),
                questionPoints
            }, printStyles);
        } catch {

            try {
                await setupPrintWindow(printContent);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to print questions');
            }
        }


        setPrintModalOpen(false);
    }, [quotes, tournamentName, questionPoints, setPrintModalOpen]);


    useEffect(() => {
        if (hasAttemptedLoad && quotes.length === 0 && !isLoading && !error && !quotesLoadedFromStorage) {
            console.log('Triggering loadQuestionsFromDatabase');
            handleLoadQuestions();
        }
    }, [hasAttemptedLoad, quotes.length, isLoading, error, quotesLoadedFromStorage, handleLoadQuestions]);

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
                    <div className="w-full max-w-[80vw] mt-0 mb-3">
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
                                questionPoints={questionPoints}
                            />
                        </div>
                    ) : (
                        <div
                            className={`sticky top-4 z-10 w-full max-w-[80vw] bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
                        >
                            <div
                                className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
                                style={{ width: `${totalProgress}%` }}
                            ></div>
                        </div>
                    )}

                    <main
                        className={`w-full max-w-[80vw] rounded-lg shadow-md p-6 mt-4 ${
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
                                onPrint={handlePrintConfig}
                                isOffline={isOffline} 
                                darkMode={darkMode}
                            />
                        )}
                        
                        <div data-questions-container>
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
                                    questionPoints={questionPoints}
                                    resetTrigger={resetTrigger}

                                />
                            ))}
                        </div>
                        
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

                    {/* Print Configuration Modal */}
                    <PrintConfigModal
                        isOpen={printModalOpen}
                        onClose={() => setPrintModalOpen(false)}
                        onPrint={handleActualPrint}
                        quotes={quotes}
                        tournamentName={tournamentName}
                        setTournamentName={setTournamentName}
                        questionPoints={questionPoints}
                        setQuestionPoints={setQuestionPoints}
                        darkMode={darkMode}
                    />
                    
                </div>
            </div>
            
            {/* Global ToastContainer handles notifications */}
        </>
    );
}