'use client';
import logger from '@/lib/utils/logger';


import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';

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
import { shuffleArray } from '@/app/utils/questionUtils';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  gradeWithGemini,
  getExplanation,
  calculateMCQScore
} from '@/app/utils/questionUtils';
import { buildIdQuestionFromApiRow } from './utils/idBuild';







import LoadingFallback from './components/LoadingFallback';
import { supportsId } from './utils/idSupport';
import { prepareUnlimitedQuestions } from './utils/prepare';
import QuestionCard from './components/QuestionCard';
import { fetchBaseQuestions } from './utils/baseFetch';
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
  

  const [idQuestionIndices, setIdQuestionIndices] = useState<Set<number>>(new Set());
  const [idQuestionCache, setIdQuestionCache] = useState<Map<number, Question>>(new Map());
  const [namePool, setNamePool] = useState<string[]>([]);
  const [isLoadingIdQuestion, setIsLoadingIdQuestion] = useState(false);


  useEffect(() => {

    if (data.length > 0 || isLoading === false) {
      return;
    }

    const storedParams = localStorage.getItem('testParams');
    const routerParams = initialRouterData || (storedParams ? JSON.parse(storedParams) : {});
    if (!routerParams || Object.keys(routerParams).length === 0) {
      router.push('/');
      return;
    }
    setRouterData(routerParams);


    const storedQuestions = localStorage.getItem('unlimitedQuestions');
    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      


      setIsLoading(false);
      return;
    }





    const fetchData = async () => {
      try {

        // For unlimited mode, request 50 questions at a time
        const { success, data: fetched, error } = await fetchBaseQuestions(routerParams, 50);
        if (!success) throw new Error(error || 'API request failed');
        const apiResponse: any = { success, data: fetched };
        
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'API request failed');
        }
        const baseQuestions: Question[] = apiResponse.data || [];


        let finalQuestions: Question[] = baseQuestions;
        const idPct = (routerParams as any).idPercentage;
        const idSupported = supportsId(routerParams.eventName);
        if (idSupported && typeof idPct !== 'undefined' && parseInt(idPct) > 0) {
          const prepared = prepareUnlimitedQuestions({ baseQuestions, eventName: routerParams.eventName, idPercentage: idPct });
          const idIndices = new Set<number>(prepared.idIndices);
          const idCount = prepared.idCount;
          // Shuffle to mix placeholders among base
          finalQuestions = shuffleArray(prepared.finalQuestions);
          setIdQuestionIndices(idIndices);
          

          const idParams = new URLSearchParams();
          // Use the full event name for ID questions API - it doesn't support subtopics as separate params
          idParams.set('event', routerParams.eventName);
          idParams.set('limit', String(idCount));
          
          fetch(`${api.idQuestions}?${idParams.toString()}`)
            .then(r => r.json())
            .then(j => {
              const src = Array.isArray(j?.data) ? j.data : [];

              const typesSel = (routerParams.types as string) || 'multiple-choice';
              const filtered = src.filter((row: any) => {
                const isMcq = Array.isArray(row.options) && row.options.length > 0;
                if (typesSel === 'multiple-choice') return isMcq;
                if (typesSel === 'free-response') return !isMcq;
                return true;
              });

              const pool = filtered.map((row: any) => ({
                question: row.question,
                options: row.options || [],
                answers: row.answers || [],
                difficulty: row.difficulty ?? 0.5,
                event: row.event,
                imageData: Array.isArray(row.images) && row.images.length ? row.images[Math.floor(Math.random()*row.images.length)] : undefined,
              } as Question));
              setNamePool(pool.map(q => q.question)); // not used, but maintained

              setIdQuestionCache(prev => {
                const m = new Map(prev);
                const picks = [...pool];
                let idx = 0;
                for (const i of idIndices.values()) {
                  if (idx >= picks.length) break;
                  m.set(i, picks[idx++]);
                }
                return m;
              });
            })
            .catch(() => {});
        }


        const serialized = JSON.stringify(finalQuestions, (key, value) => key === 'imageData' ? undefined : value);
        localStorage.setItem('unlimitedQuestions', serialized);
        setData(finalQuestions);
      } catch {
        
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Ensure the current question index is valid once data is loaded
  useEffect(() => {
    if (data.length > 0) {
      setCurrentQuestionIndex((prev) => {
        if (prev >= 0 && prev < data.length) return prev;
        return Math.floor(Math.random() * data.length);
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
        localStorage.removeItem('unlimitedQuestions');
        localStorage.removeItem('testParams');
        localStorage.removeItem('contestedUnlimitedQuestions');
      }
    };
  }, []);


  const loadIdQuestion = useCallback(async (index: number) => {
    if (!idQuestionIndices.has(index) || idQuestionCache.has(index)) {
      return;
    }
    
    setIsLoadingIdQuestion(true);
    try {
      logger.log('[IDGEN][unlimited] loading ID question for index', index);
      

      const params = new URLSearchParams();
      params.set('event', routerData.eventName || 'Unknown Event');
      params.set('limit', '1');
      

      if (routerData.subtopics && routerData.subtopics.length > 0) {
        params.set('subtopics', routerData.subtopics.join(','));
      }
      
      const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
      const { success, data } = await resp.json();
      
              if (success && data.length > 0) {
          const item = data[0];
          

          const types = routerData.types || 'multiple-choice';
          const question: Question | undefined = buildIdQuestionFromApiRow(item, { eventName: routerData.eventName, types, namePool });
        

        if (!question) return;
        setIdQuestionCache(prev => new Map(prev).set(index, question));
        setData(prev => {
          const newData = [...prev];
          newData[index] = question;
          return newData;
        });
        
        
      }
    } catch {
      
    } finally {
      setIsLoadingIdQuestion(false);
    }
  }, [idQuestionIndices, idQuestionCache, namePool, routerData]);


  useEffect(() => {
    if (idQuestionIndices.has(currentQuestionIndex) && !idQuestionCache.has(currentQuestionIndex)) {
      loadIdQuestion(currentQuestionIndex);
    }
  }, [currentQuestionIndex, idQuestionIndices, idQuestionCache, loadIdQuestion]);


  const currentQuestion = idQuestionCache.get(currentQuestionIndex) || data[currentQuestionIndex];



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
  };


  const handleNext = () => {
    if (data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      
      setCurrentQuestionIndex(randomIndex);
      setCurrentAnswer([]);
      setIsSubmitted(false);
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
          localStorage.setItem('unlimitedQuestions', JSON.stringify(updatedData));
          
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
        isLoadingId={isLoadingIdQuestion}
        showIdSpinner={idQuestionIndices.has(currentQuestionIndex)}
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
    

    localStorage.removeItem('unlimitedQuestions');
    localStorage.removeItem('testParams');
    localStorage.removeItem('contestedUnlimitedQuestions');
    
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