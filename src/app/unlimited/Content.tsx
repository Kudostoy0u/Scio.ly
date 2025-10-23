'use client';
import logger from '@/lib/utils/logger';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';


import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';

import { updateMetrics } from '@/app/utils/metrics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/app/contexts/ThemeContext';
import Header from '@/app/components/Header';
import api from '../api';
// offline storage handled in fetchBaseQuestions
// MarkdownExplanation and QuestionActions are used inside QuestionCard
import EditQuestionModal from '@/app/components/EditQuestionModal';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import { Question } from '@/app/utils/geminiService';
//
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  gradeWithGemini,
  getExplanation,
  calculateMCQScore
} from '@/app/utils/questionUtils';
// Reuse the tested /test question loader to avoid divergence
import { fetchQuestionsForParams } from '@/app/test/hooks/utils/fetchQuestions';







import LoadingFallback from './components/LoadingFallback';
import QuestionCard from './components/QuestionCard';
//
import { buildEditPayload } from './utils/editPayload';






export default function UnlimitedPracticePage({ initialRouterData }: { initialRouterData?: any }) {
  const router = useRouter();

  const [data, setData] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [currentAnswer, setCurrentAnswer] = useState<(string | null)[]>([]);
  const [routerData, setRouterData] = useState<RouterParams>(initialRouterData || {});
  const { darkMode } = useTheme();

  const [explanations, setExplanations] = useState<Explanations>({});
  const [loadingExplanation, setLoadingExplanation] = useState<LoadingExplanation>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;

  const [gradingResults, setGradingResults] = useState<GradingResults>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  

  // No explicit namePool state needed; built per-batch
  const BATCH_SIZE = 20;
  const [answeredInBatch, setAnsweredInBatch] = useState<number>(0);
  const fetchStartedRef = useRef(false);
  const batchReloadingRef = useRef(false);


  useEffect(() => {

    if (fetchStartedRef.current) {
      return;
    }
    if (data.length > 0 || isLoading === false) {
      return;
    }

    const storedParams = SyncLocalStorage.getItem('testParams');
    const routerParams = initialRouterData || (storedParams ? JSON.parse(storedParams) : {});
    if (!routerParams || Object.keys(routerParams).length === 0) {
      router.push('/');
      return;
    }
    setRouterData(routerParams);


    const storedQuestions = SyncLocalStorage.getItem('unlimitedQuestions');
    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      setIsLoading(false);
      return;
    }





    const loadBatch = async () => {
      try {
        fetchStartedRef.current = true;
        // Reuse test loader for consistent normalization and ID behavior
        let questions = await fetchQuestionsForParams(routerParams, BATCH_SIZE);
        // Deterministic shuffle per-batch to provide a fixed order
        const seed = Date.now();
        const rng = (() => {
          let s = seed % 2147483647;
          return () => (s = (s * 48271) % 2147483647) / 2147483647;
        })();
        const arr = [...questions];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        // Dedup by normalized text and id
        const seen = new Set<string>();
        const deduped = arr.filter((q: any) => {
          const id = q.id ? String(q.id) : '';
          const text = typeof q.question === 'string' ? q.question.trim().toLowerCase() : '';
          const key = id || text;
          if (!key) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        questions = deduped;
        setData(questions);
        setCurrentQuestionIndex(0);
        setAnsweredInBatch(0);
        const serialized = JSON.stringify(questions, (key, value) => key === 'imageData' ? undefined : value);
        SyncLocalStorage.setItem('unlimitedQuestions', serialized);
        setIsLoading(false);
      } catch {
        setFetchError('Failed to load questions. Please try again later.');
        setIsLoading(false);
      } finally {
        fetchStartedRef.current = true;
      }
    };

    loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Ensure the current question index is valid/stable once data is loaded
  useEffect(() => {
    if (data.length > 0) {
      setCurrentQuestionIndex((prev) => {
        if (prev >= 0 && prev < data.length) return prev;
        return 0; // start at the first question in this batch
      });
    }
  }, [data.length]);


  useEffect(() => {
    const loadUserBookmarks = async () => {
          const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const bookmarks = await loadBookmarksFromSupabase(user.id);
        

        const bookmarkMap: Record<string, boolean> = {};
        bookmarks.forEach(bookmark => {
          if (bookmark.source === 'unlimited') {
                                const key = (bookmark.question as any).imageData
              ? `id:${(bookmark.question as any).imageData}`
              : bookmark.question.question;
            bookmarkMap[key] = true;
          }
        });
        
        setBookmarkedQuestions(bookmarkMap);
      }
    };
    
    loadUserBookmarks();


    return () => {
      if (window.location.pathname !== '/unlimited') {
        SyncLocalStorage.removeItem('unlimitedQuestions');
        SyncLocalStorage.removeItem('testParams');
        SyncLocalStorage.removeItem('contestedUnlimitedQuestions');
      }
    };
  }, []);


  // ID placeholders no longer used; ID questions are built during batch load


  const currentQuestion = data[currentQuestionIndex];



  // for radio buttons or free-response we simply store a single value.
  const handleAnswerChange = (answer: string | null, multiselect = false) => {
    if (multiselect) {
      setCurrentAnswer((prev) => {

        if (prev.includes(answer)) {
          return prev.filter((ans) => ans !== answer);
        }
        return [...prev, answer];
      });
    } else {
      setCurrentAnswer([answer]);
    }
  };

  /*
    Updated isCorrect now returns a numeric score:
    - For questions with options: uses calculateMCQScore
    - For free-response questions we use gradeWithGemini.
  */
  const isCorrect = async (question: Question, answers: (string | null)[]): Promise<number> => {
    if (!question.answers || question.answers.length === 0) return 0;

    if (question.options && question.options.length > 0) {
      return calculateMCQScore(question, answers);
    }


    if (!answers[0]) return 0;
    return await gradeWithGemini(answers[0], question.answers, question.question);
  };


  const handleSubmit = async () => {
    setIsSubmitted(true);

    try {
      // 🔍 debug: log submission details
      
      
      const score = await isCorrect(currentQuestion, currentAnswer);
      
      
      
      setGradingResults((prev) => ({ ...prev, [currentQuestionIndex]: score }));


      const wasAttempted = currentAnswer.length > 0 && currentAnswer[0] !== null && currentAnswer[0] !== '';

      const fractionalCorrect = Math.max(0, Math.min(1, score));
      
      const { data: { user } } = await supabase.auth.getUser();
      await updateMetrics(user?.id || null, {
        questionsAttempted: wasAttempted ? 1 : 0,
        correctAnswers: wasAttempted ? fractionalCorrect : 0,
        eventName: wasAttempted ? (routerData.eventName || undefined) : undefined,
      });
    } catch (error) {
      logger.error('Error updating metrics:', error);
    }

    setAnsweredInBatch((prev) => prev + 1);
  };


  const handleNext = () => {
    if (data.length > 0) {
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, data.length - 1));
      setCurrentAnswer([]);
      setIsSubmitted(false);
      // If finished the batch, load another batch and replace
      if (answeredInBatch + 1 >= BATCH_SIZE) {
        if (batchReloadingRef.current) return;
        batchReloadingRef.current = true;
        // Clear stored batch so next mount won't restore old
        try { SyncLocalStorage.removeItem('unlimitedQuestions'); } catch {}
        // Trigger fresh load by re-running initial effect logic minimally
        (async () => {
          setIsLoading(true);
          setFetchError(null);
          try {
            const paramsStr = SyncLocalStorage.getItem('testParams');
            const routerParams = initialRouterData || (paramsStr ? JSON.parse(paramsStr) : {});
            let questions = await fetchQuestionsForParams(routerParams, BATCH_SIZE);
            const seed = Date.now();
            const rng = (() => {
              let s = seed % 2147483647;
              return () => (s = (s * 48271) % 2147483647) / 2147483647;
            })();
            const arr = [...questions];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(rng() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            const seen = new Set<string>();
            const deduped = arr.filter((q: any) => {
              const id = q.id ? String(q.id) : '';
              const text = typeof q.question === 'string' ? q.question.trim().toLowerCase() : '';
              const key = id || text;
              if (!key) return true;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            questions = deduped;
            setData(questions);
            setCurrentQuestionIndex(0);
            setAnsweredInBatch(0);
            const serialized = JSON.stringify(questions, (key, value) => key === 'imageData' ? undefined : value);
            SyncLocalStorage.setItem('unlimitedQuestions', serialized);
          } catch {
            setFetchError('Failed to load questions. Please try again later.');
          } finally {
            setIsLoading(false);
            batchReloadingRef.current = false;
          }
        })();
      }
    } else {
      logger.warn("No questions available to select randomly.");

    }
  };



  const handleGetExplanation = async (index: number, question: Question, userAnswer: (string | null)[]) => {

    const originalGetExplanation = () => getExplanation(
      index,
      question,
      userAnswer,
      routerData,
      explanations,
      setExplanations,
      setLoadingExplanation,
      lastCallTime,
      setLastCallTime,
      setData,
      gradingResults,
      setGradingResults,
      undefined, // no useranswers for unlimited
      RATE_LIMIT_DELAY
    );

    await originalGetExplanation();
    

    if (question.options && question.options.length > 0) {
      const newScore = await isCorrect(question, userAnswer);
      if (newScore !== gradingResults[index]) {
        setGradingResults(prev => ({ ...prev, [index]: newScore }));
      }
    }
    

    setSubmittedReports(prev => ({ ...prev, [index]: true }));
  };





  const handleBookmarkChange = (key: string, isBookmarked: boolean) => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [key]: isBookmarked
    }));
  };

  const handleEditSubmitted = (index: number) => {
    setSubmittedEdits(prev => ({ ...prev, [index]: true }));
  };

  const handleQuestionRemoved = (_questionIndex: number) => {

    // since there's only one question shown at a time
    handleNext();
  };

  const handleEditOpen = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (editedQuestion: Question, reason: string, originalQuestion: Question, aiBypass?: boolean, aiSuggestion?: { question: string; options?: string[]; answers: string[]; answerIndices?: number[] }): Promise<{ success: boolean; message: string; reason: string; }> => {
    try {
      logger.log('🔍 [CONTENT] Edit submit with aiBypass:', aiBypass, 'aiSuggestion:', aiSuggestion);
      const payload = buildEditPayload({ originalQuestion, editedQuestion, reason, eventName: routerData.eventName, aiBypass, aiSuggestion });
      logger.log('🔍 [CONTENT] Final POST body to /api/report/edit:', payload);
      
      const response = await fetch(api.reportEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        if (editingQuestion) {
          const questionIndex = currentQuestionIndex;

          setData(prevData => {
            const newData = [...prevData];
            newData[questionIndex] = editedQuestion;
            return newData;
          });
          

          const updatedData = data.map((q, idx) => 
            idx === questionIndex ? editedQuestion : q
          );
          SyncLocalStorage.setItem('unlimitedQuestions', JSON.stringify(updatedData));
          
          handleEditSubmitted(questionIndex);
        }
        return { success: true, message: result.message || 'Edit submitted successfully!', reason: result.message || 'Edit submitted successfully!' };
      } else {
        return { success: false, message: result.message || 'Failed to submit edit', reason: result.message || 'Failed to submit edit' };
      }
    } catch (error) {
      logger.error('Error submitting edit:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.', reason: 'An unexpected error occurred. Please try again.' };
    }
  };
  const renderQuestion = (question: Question) => {
    const currentAnswers = currentAnswer || [];
    const key = (question as any).imageData ? `id:${(question as any).imageData}` : question.question;
    const isBookmarked = bookmarkedQuestions[key] || false;
    return (
      <QuestionCard
        question={question}
        questionIndex={currentQuestionIndex}
        darkMode={darkMode}
        isSubmitted={isSubmitted}
        gradingScore={gradingResults[currentQuestionIndex]}
        currentAnswers={currentAnswers}
        isLoadingId={false}
        showIdSpinner={false}
        onAnswerToggle={(ans, multi) => handleAnswerChange(ans, multi)}
        onGetExplanation={() => handleGetExplanation(currentQuestionIndex, question, currentAnswers ?? [])}
        explanation={explanations[currentQuestionIndex]}
        loadingExplanation={!!loadingExplanation[currentQuestionIndex]}
        isBookmarked={isBookmarked}
        eventName={routerData.eventName || 'Unknown Event'}
        onBookmarkChange={handleBookmarkChange}
        isSubmittedReport={submittedReports[currentQuestionIndex]}
        isSubmittedEdit={submittedEdits[currentQuestionIndex]}
        onEdit={() => handleEditOpen(question)}
        onQuestionRemoved={handleQuestionRemoved}
      />
    );
  };



  const handleResetTest = () => {
    setCurrentAnswer([]);
    setCurrentQuestionIndex(0);
    setData([]);
    setGradingResults({});
    setIsSubmitted(false);
    setExplanations({});
    

    SyncLocalStorage.removeItem('unlimitedQuestions');
    SyncLocalStorage.removeItem('testParams');
    SyncLocalStorage.removeItem('contestedUnlimitedQuestions');
    
    router.push('/practice');
  };

  return (
    <>
      <Header />
      <div className="relative min-h-screen">
        {/* Background */}
        <div
          className={`absolute inset-0 ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}
        ></div>

        <div className="relative flex flex-col items-center p-6 pt-20">
          <header className="w-full max-w-3xl flex justify-between items-center py-2">
            <h1 className={`text-xl md:text-3xl font-extrabold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {routerData.eventName || 'Loading...'}
            </h1>
            {/* Reset button removed for Unlimited mode */}
          </header>

          {/* Inline back link to Practice */}
          <div className="w-full max-w-3xl">
            <button
              onClick={handleResetTest}
              className={`group inline-flex items-center text-base font-medium ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              <span className="ml-2">Go back</span>
            </button>
          </div>

          <main
            className={`w-full max-w-3xl rounded-lg shadow-md p-6 mt-4  ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            {isLoading ? (
              <LoadingFallback />
            ) : fetchError ? (
              <div className="text-red-600 text-center">{fetchError}</div>
            ) : routerData.eventName === "Codebusters" && routerData.types === 'multiple-choice' ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  No MCQs available for this event
                </p>
                <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Please select &quot;MCQ + FRQ&quot; in the dashboard to practice this event
                </p>
              </div>
            ) : !currentQuestion ? (
              <div>No questions available.</div>
            ) : (
              <div className="space-y-4">
                {renderQuestion(currentQuestion)}

                {/* Action Button */}
                <div className="text-center">
                  {!isSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                        darkMode
                          ? 'bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200'
                          : 'bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600'
                      }`}
                    >
                      {currentAnswer.length === 0 || currentAnswer[0] === null || currentAnswer[0] === '' ? 'Skip Question' : 'Check Answer'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className={`w-full px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                        darkMode
                          ? 'bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200'
                          : 'bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600'
                      }`}
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* No floating back button */}


        </div>
      </div>

      {editingQuestion && (
        <EditQuestionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          darkMode={darkMode}
          question={editingQuestion}
          eventName={routerData.eventName || 'Unknown Event'}
          canEditAnswers={isSubmitted}
        />
      )}

      {/* Global ToastContainer handles notifications */}
    </>
  );
}