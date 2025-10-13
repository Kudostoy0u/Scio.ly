'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import logger from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { Question } from '@/app/utils/geminiService';
//
import { normalizeQuestionsFull } from './utils/normalize';
// import { fetchIdQuestionsForParams } from '../utils/idFetch';
import { updateMetrics } from '@/app/utils/metrics';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  // buildApiParams,
  getExplanation,
  calculateMCQScore
} from '@/app/utils/questionUtils';
import {
  getCurrentTestSession,
  initializeTestSession,
  markTestSubmitted,
  resetTestSession,
  resumeTestSession,
} from '@/app/utils/timeManagement';
import { usePauseOnUnmount, useResumeOnMount, useSetupVisibility, useCountdown } from './utils/timeHooks';
import { initLoad } from './utils/initLoad';
import api from '../../api';
// import { getEventOfflineQuestions } from '@/app/utils/storage';
// normalizeQuestionText used only within old inline fetch logic (now moved)
// difficultyRanges only used in removed inline fetching logic
import { fetchQuestionsForParams } from './utils/fetchQuestions';
import { buildPreviewAutofill } from './utils/preview';
import { removeQuestionAtIndex } from './utils/questionMaintenance';
import { fetchReplacementQuestion } from './utils/replacement';
import { resolveRouterParams } from './utils/ssr';

/**
 * Test state management hook for Science Olympiad practice tests
 * Provides comprehensive state management for test sessions including questions, answers, timing, and grading
 * 
 * @param {Object} params - Hook parameters
 * @param {any[]} [params.initialData] - Initial question data for SSR
 * @param {any} [params.initialRouterData] - Initial router parameters for SSR
 * @returns {Object} Test state and control functions
 * @example
 * ```typescript
 * const {
 *   data: questions,
 *   userAnswers,
 *   isSubmitted,
 *   submitTest,
 *   updateAnswer
 * } = useTestState({
 *   initialData: serverQuestions,
 *   initialRouterData: routerParams
 * });
 * ```
 */
export function useTestState({ initialData, initialRouterData }: { initialData?: any[]; initialRouterData?: any } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const fetchStartedRef = useRef(false);
  const fetchCompletedRef = useRef(false);
  const [data, setData] = useState<Question[]>(Array.isArray(initialData) ? initialData as Question[] : []);
  const [routerData, setRouterData] = useState<RouterParams>(initialRouterData || {});
  const [userAnswers, setUserAnswers] = useState<Record<number, (string | null)[] | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Explanations>({});
  const [loadingExplanation, setLoadingExplanation] = useState<LoadingExplanation>({});
  const [lastCallTime, setLastCallTime] = useState<number>(0);
  const RATE_LIMIT_DELAY = 2000;
  const [gradingResults, setGradingResults] = useState<GradingResults>({});
  const [isMounted, setIsMounted] = useState(false);
  const ssrAppliedRef = useRef(false);
  const mountLoggedRef = useRef(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [gradingFRQs, setGradingFRQs] = useState<Record<number, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);
  const isClient = typeof window !== 'undefined';
  const previewSearch = isClient ? new URLSearchParams(window.location.search) : null;
  const isPreviewMode = !!(previewSearch && previewSearch.get('preview') === '1');



  



  const stableRouterData = useMemo(() => initialRouterData || {}, [initialRouterData]);


  useEffect(() => {
    // Handle assignment loading
    if (stableRouterData.assignmentId && !fetchCompletedRef.current) {
      const loadAssignment = async () => {
        try {
          console.log('=== CLIENT SIDE ASSIGNMENT LOADING ===');
          console.log('Loading assignment ID:', stableRouterData.assignmentId);
          
          // Reset test state when loading assignment via notifications
          console.log('Resetting test state for assignment loading...');
          setIsSubmitted(false);
          setUserAnswers({});
          setData([]);
          setRouterData({});
          setGradingResults({});
          
          // Clear localStorage test state
          localStorage.removeItem('testSubmitted');
          localStorage.removeItem('testUserAnswers');
          localStorage.removeItem('testQuestions');
          localStorage.removeItem('testParams');
          localStorage.removeItem('testGradingResults');
          localStorage.removeItem('currentTestSession');
          
          const response = await fetch(`/api/assignments/${stableRouterData.assignmentId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('Raw response from API:', JSON.stringify(data, null, 2));
            
            const assignment = data.assignment;
            console.log('Assignment object:', JSON.stringify(assignment, null, 2));
            
            // Set assignment data as questions (already formatted by API)
            const questions = assignment.questions;
            console.log('Questions from assignment:', JSON.stringify(questions, null, 2));
            console.log('Number of questions:', questions.length);
            
            if (questions.length > 0) {
              console.log('First question before normalization:', JSON.stringify(questions[0], null, 2));
            }
            
            const normalized = normalizeQuestionsFull(questions);
            console.log('Questions after normalization:', JSON.stringify(normalized, null, 2));
            
            if (normalized.length > 0) {
              console.log('First question after normalization:', JSON.stringify(normalized[0], null, 2));
            }
            
            setData(normalized);
            setRouterData({
              ...stableRouterData,
              eventName: assignment.title,
              timeLimit: '60', // Default time limit for assignments
              assignmentMode: true
            });
            setIsLoading(false);
            fetchCompletedRef.current = true;
            logger.log('loaded assignment questions', { count: normalized.length });
            console.log('=== END CLIENT SIDE ASSIGNMENT LOADING ===\n');
            return;
          }
        } catch (error) {
          console.error('Failed to load assignment:', error);
          setFetchError('Failed to load assignment');
          setIsLoading(false);
          fetchCompletedRef.current = true;
          return;
        }
      };
      
      loadAssignment();
      return;
    }

    // Prefer locally stored questions over SSR on reload to resume tests
    if (!ssrAppliedRef.current) {
      try {
        const stored = localStorage.getItem('testQuestions');
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasQs = Array.isArray(parsed) && parsed.length > 0;
          if (hasQs) {
            const normalized = normalizeQuestionsFull(parsed as Question[]);
            setData(normalized);
            // Restore submitted state and grading/user answers if present
            try {
              const session = getCurrentTestSession();
    if (session) {
      setIsSubmitted(session.isSubmitted);
              }
              const storedAnswers = localStorage.getItem('testUserAnswers');
              if (storedAnswers) {
                try { setUserAnswers(JSON.parse(storedAnswers)); } catch {}
              }
              const storedGrades = localStorage.getItem('testGradingResults');
              if (storedGrades) {
                try { setGradingResults(JSON.parse(storedGrades)); } catch {}
              }
            } catch {}
      setIsLoading(false);
      fetchCompletedRef.current = true;
            logger.log('resume from localStorage before SSR', { count: normalized.length });
      return;
    }
        }
      } catch {}
    }
    // Short-circuit if SSR provided data
    if (ssrAppliedRef.current) return;
    if (Array.isArray(initialData) && initialData.length > 0 && isLoading && !fetchCompletedRef.current) {
      ssrAppliedRef.current = true;
      logger.log('short-circuit: applying SSR initialData', { count: initialData.length });
      // Persist SSR data with normalization for consistent reloads
      const paramsStr = localStorage.getItem('testParams');
      resolveRouterParams(initialRouterData, paramsStr);
      const base = normalizeQuestionsFull(initialData as Question[]);
      setData(base);
          setIsLoading(false);
          fetchCompletedRef.current = true;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    if (!mountLoggedRef.current) {
      mountLoggedRef.current = true;
      logger.log('useTestState mount', {
        initialDataLen: Array.isArray(initialData) ? initialData.length : 0,
        hasInitialRouterData: !!initialRouterData && Object.keys(initialRouterData || {}).length > 0,
      });
    }
    setIsMounted(true);
    if (localStorage.getItem("loaded")) {
      localStorage.removeItem('testUserAnswers')
      localStorage.removeItem('testGradingResults')

      localStorage.removeItem("loaded");
    }
    
    import('./utils/storageRestore').then(({ restoreStoredState }) => {
      const restored = restoreStoredState();
      if (restored.userAnswers) setUserAnswers(restored.userAnswers);
      if (restored.gradingResults) setGradingResults(restored.gradingResults);
    }).catch(() => {});
  }, [initialData, initialRouterData]);

  // If in preview mode, auto-fill answers with correct ones (all correct for multi-select) and mark submitted once data is loaded
  useEffect(() => {
    if (!isPreviewMode) return;
    if (!Array.isArray(data) || data.length === 0) return;
    if (isSubmitted) return;
    try {
      const { filled, grades } = buildPreviewAutofill(data);
      setUserAnswers(filled);
      setGradingResults(grades);
      setIsSubmitted(true);
      localStorage.setItem('testUserAnswers', JSON.stringify(filled));
      localStorage.setItem('testGradingResults', JSON.stringify(grades));
        } catch {}
  }, [isPreviewMode, data, isSubmitted]);


  // Ensure timer shows immediately by syncing from session when available
  useEffect(() => {
    try {
      const session = resumeTestSession() || getCurrentTestSession();
      if (session) {
        setTimeLeft(session.timeState.timeLeft);
      }
    } catch {}
    // Re-run when router params are established (session is created in initLoad)
  }, [routerData]);


  useEffect(() => {
    if (fetchStartedRef.current || fetchCompletedRef.current || data.length > 0 || isLoading === false) return;
    fetchStartedRef.current = true;
    initLoad({ initialData, stableRouterData, setRouterData, setFetchError, setIsLoading, setData, setTimeLeft, fetchCompletedRef });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialData, stableRouterData]);


  useEffect(() => {
    if (timeLeft === 30) toast.warning('Warning: Thirty seconds left');
    if (timeLeft === 60) toast.warning('Warning: One minute left');
  }, [timeLeft]);

  useCountdown(timeLeft, isSubmitted, setTimeLeft, () => handleSubmit());


  usePauseOnUnmount();
  useResumeOnMount();
  useSetupVisibility();


  useEffect(() => {
    if (!isSubmitted || data.length === 0) return;

    const missing: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (typeof gradingResults[i] === 'undefined') missing.push(i);
    }
    if (missing.length === 0) return;

    (async () => {
      try {
        const { gradeMissing } = await import('./utils/grading');
        const computed: GradingResults = gradeMissing(
          data,
          userAnswers,
          calculateMCQScore,
          missing
        );
        if (Object.keys(computed).length > 0) {
          setGradingResults((prev) => ({ ...prev, ...computed }));
        }
      } catch {}
    })();
  }, [isSubmitted, data, userAnswers, gradingResults, setGradingResults]);


  useEffect(() => {
    import('./utils/bookmarks').then(async ({ fetchUserBookmarks }) => {
      try {
        const map = await fetchUserBookmarks(supabase as any, loadBookmarksFromSupabase);
        setBookmarkedQuestions(map);
      } catch {}
    }).catch(() => {});
  }, []);

  const handleAnswerChange = (
    questionIndex: number,
    answer: string | null,
    multiselect = false
  ) => {
    setUserAnswers((prev) => {
      const currentAnswers = prev[questionIndex] || [];
      let newAnswers;
      
      if (multiselect) {
        newAnswers = currentAnswers.includes(answer)
          ? currentAnswers.filter((ans) => ans !== answer)
          : [...currentAnswers, answer];
      } else {
        newAnswers = [answer];
      }
      
      const updatedAnswers = { ...prev, [questionIndex]: newAnswers };
      localStorage.setItem('testUserAnswers', JSON.stringify(updatedAnswers));
      return updatedAnswers;
    });
  };


  useEffect(() => {
    try { localStorage.setItem('testGradingResults', JSON.stringify(gradingResults)); } catch {}
  }, [gradingResults]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitted(true);
    try {
      const session = getCurrentTestSession();
      if (session && !session.isSubmitted) {
        markTestSubmitted();
      } else if (!session) {
        // Ensure a session exists so submitted state persists
        initializeTestSession(routerData.eventName || 'Unknown Event', parseInt((routerData.timeLimit as string) || '30'), false);
        markTestSubmitted();
      }
      localStorage.setItem('testSubmitted', 'true');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const { computeMcqTotals } = await import('./utils/submission');
    const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(data, userAnswers, gradingResults);
    setGradingResults(newGrading);
    
    if (frqsToGrade.length > 0) {

      frqsToGrade.forEach(item => {
        setGradingFRQs(prev => ({ ...prev, [item.index]: true }));
      });
      

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const { gradeFrqBatch } = await import('./utils/grading');
      const scores = await gradeFrqBatch(frqsToGrade as any, online);
        scores.forEach((score, idx) => {
          const questionIndex = frqsToGrade[idx].index;
          setGradingResults(prev => ({ ...prev, [questionIndex]: score }));
          setGradingFRQs(prev => ({ ...prev, [questionIndex]: false }));
      });

    }
    

    try {
      markTestSubmitted();
      localStorage.setItem('testGradingResults', JSON.stringify(gradingResults));

      // localstorage.setitem('testuseranswers', json.stringify(useranswers)); // answers are already persisted on change
      localStorage.removeItem('testFromBookmarks');
    } catch {}
    
    const { data: { user } } = await supabase.auth.getUser();
    if (routerData.eventName) {
      updateMetrics(user?.id || null, {
        questionsAttempted: mcqTotal,
        correctAnswers: Math.round(mcqScore),
        eventName: routerData.eventName
      });
    }

    // Handle assignment submission for enhanced assignments
    if (routerData.assignmentId) {
      try {
        // Format answers for submission
        const formattedAnswers: Record<string, any> = {};
        data.forEach((question, index) => {
          const answer = userAnswers[index];
          if (answer !== null && answer !== undefined && question.id) {
            formattedAnswers[question.id] = answer;
          }
        });

        const res = await fetch(`/api/assignments/${routerData.assignmentId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: formattedAnswers,
            score: mcqScore,
            totalPoints: mcqTotal,
            timeSpent: routerData.timeLimit ? (parseInt(routerData.timeLimit) * 60) - (timeLeft || 0) : 0,
            submittedAt: new Date().toISOString()
          })
        });

        if (res.ok) {
          try {
            (await import('react-toastify')).toast.success('Assignment submitted successfully!');
            
            // Remove assignment query parameter from URL after successful submission
            const url = new URL(window.location.href);
            url.searchParams.delete('assignment');
            window.history.replaceState({}, '', url.pathname + url.search);
          } catch {}
        } else {
          try {
            const j = await res.json().catch(() => null);
            const msg = j?.error || 'Failed to submit assignment';
            (await import('react-toastify')).toast.error(msg);
          } catch {}
        }
      } catch (error) {
        console.error('Assignment submission error:', error);
        try {
          (await import('react-toastify')).toast.error('Failed to submit assignment');
        } catch {}
      }
    } else {
      // Handle legacy assignment submission
      try {
        const assignmentIdStr = localStorage.getItem('currentAssignmentId');
        if (assignmentIdStr) {
          const assignmentId = Number(assignmentIdStr);
          if (!assignmentId || Number.isNaN(assignmentId)) {
            try { (await import('react-toastify')).toast.error('Could not submit results (invalid assignment).'); } catch {}
            return;
          }
          const name = (user?.user_metadata?.name || user?.email || '').toString();
          const res = await fetch('/api/assignments/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Use string form to preserve INT8 precision server-side
            body: JSON.stringify({ assignmentId: String(assignmentIdStr), userId: user?.id || null, name, eventName: routerData.eventName, score: mcqScore, detail: { total: mcqTotal } })
          });
          if (res.ok) {
            try {
              const selStr = localStorage.getItem('teamsSelection') || '';
              const sel = selStr ? JSON.parse(selStr) : null;
              const teamName = sel?.school ? `${sel.school} ${sel.division || ''}`.trim() : null;
              if (teamName) { (await import('react-toastify')).toast.success(`Sent results to ${teamName}!`); }
            } catch {}
          } else {
            try {
              const j = await res.json().catch(()=>null);
              const msg = j?.error || 'Failed to submit results';
              (await import('react-toastify')).toast.error(msg);
            } catch {}
          }
          localStorage.removeItem('currentAssignmentId');
        }
      } catch {}
    }
  }, [data, userAnswers, gradingResults, routerData, timeLeft]);

  const reloadQuestions = async () => {
    setIsResetting(true);
    setFetchError(null);
    
    try {
      const total = parseInt(routerData.questionCount || '10');
      const questions = await fetchQuestionsForParams(routerData, total);
      setData(questions);
      localStorage.setItem('testQuestions', JSON.stringify(questions));
      
    } catch (error) {
      logger.error('Error reloading questions:', error);
      setFetchError('Failed to reload questions. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTest = () => {

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
    
    setIsSubmitted(false);
    setUserAnswers({});
    setGradingResults({});
    setExplanations({});
    setSubmittedReports({});
    setSubmittedEdits({});
    
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');
    localStorage.removeItem('testGradingResults');
    localStorage.removeItem('contestedQuestions');
    localStorage.removeItem('testFromBookmarks');
    

    const timeLimit = routerData.timeLimit || "30";
    const eventName = routerData.eventName || "Unknown Event";
    const newSession = resetTestSession(eventName, parseInt(timeLimit));
    
    setTimeLeft(newSession.timeState.timeLeft);
    

    reloadQuestions();
  };

  const handleGetExplanation = (index: number, question: Question, userAnswer: (string | null)[]) => {
    getExplanation(
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
      userAnswers,
      RATE_LIMIT_DELAY
    );
  };

  const handleBookmarkChange = (questionText: string, isBookmarked: boolean) => {
    setBookmarkedQuestions(prev => ({
      ...prev,
      [questionText]: isBookmarked
    }));
  };

  const handleReportSubmitted = (index: number) => {
    setSubmittedReports(prev => ({ ...prev, [index]: true }));
  };

  const handleEditSubmitted = (index: number) => {
    setSubmittedEdits(prev => ({ ...prev, [index]: true }));
  };

  const handleQuestionRemoved = (questionIndex: number) => {
    const fetchReplacement = async (): Promise<Question | null> => fetchReplacementQuestion(routerData, data);

    (async () => {
      const replacement = await fetchReplacement();
      if (replacement) {
        setData(prevData => {
          const newData = [...prevData];
          newData[questionIndex] = replacement;
          setTimeout(() => {
            localStorage.setItem('testQuestions', JSON.stringify(newData));
          }, 0);
          return newData;
        });

        setUserAnswers(prev => ({ ...prev, [questionIndex]: null }));
        setGradingResults(prev => ({ ...prev, [questionIndex]: 0 }));
        setExplanations(prev => { const c = { ...prev }; delete c[questionIndex]; return c; });
        setLoadingExplanation(prev => { const c = { ...prev }; delete c[questionIndex]; return c; });
        setSubmittedReports(prev => { const c = { ...prev }; delete c[questionIndex]; return c; });
        setSubmittedEdits(prev => { const c = { ...prev }; delete c[questionIndex]; return c; });
      } else {
        const { newData, newAnswers, newResults, newExplanations, newLoading } = removeQuestionAtIndex(
          data,
          questionIndex,
          userAnswers,
          gradingResults,
          explanations,
          loadingExplanation
        );
        setData(newData);
        setUserAnswers(newAnswers);
        setGradingResults(newResults);
        setExplanations(newExplanations);
        setLoadingExplanation(newLoading);
          setTimeout(() => {
            localStorage.setItem('testQuestions', JSON.stringify(newData));
            localStorage.setItem('testUserAnswers', JSON.stringify(newAnswers));
          }, 0);
      }
    })();
  };

  const handleEditOpen = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (editedQuestion: Question, reason: string, originalQuestion: Question, aiBypass?: boolean, aiSuggestion?: { question: string; options?: string[]; answers: string[]; answerIndices?: number[] }): Promise<{ success: boolean; message: string; reason: string; }> => {
    try {
      logger.log('🔍 [TEST] Edit submit with aiBypass:', aiBypass, 'aiSuggestion:', aiSuggestion);
      const response = await fetch(api.reportEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: originalQuestion,
          editedQuestion: editedQuestion,
          reason: reason,
          event: routerData.eventName,
          bypass: !!aiBypass,
          aiSuggestion
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (editingQuestion) {
          const questionIndex = data.findIndex(q => q.question === editingQuestion.question);
          if (questionIndex !== -1) {
            setData(prevData => {
              const newData = [...prevData];
              newData[questionIndex] = editedQuestion;
              return newData;
            });
            
            localStorage.setItem('testQuestions', JSON.stringify(data.map((q, idx) => 
              idx === questionIndex ? editedQuestion : q
            )));
            
            handleEditSubmitted(questionIndex);
          }
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

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  const handleBackToMain = () => {
    try {
    router.push('/practice');
    } catch (e) {
      logger.error('Error navigating back to practice:', e);
      window.location.href = '/practice';
    }
  };

  const getBookmarkKey = (q: Question): string => (q as any).imageData ? `id:${(q as any).imageData}` : q.question;
  const isQuestionBookmarked = (question: Question): boolean => {
    return bookmarkedQuestions[getBookmarkKey(question)] || false;
  };

  return {

    isLoading,
    data,
    routerData,
    userAnswers,
    isSubmitted,
    fetchError,
    timeLeft,
    explanations,
    loadingExplanation,
    gradingResults,
    gradingFRQs,
    isMounted,
    shareModalOpen,
    inputCode,
    submittedReports,
    submittedEdits,
    isEditModalOpen,
    editingQuestion,
    isResetting,
    

    handleAnswerChange,
    handleSubmit,
    handleResetTest,
    handleGetExplanation,
    handleBookmarkChange,
    handleReportSubmitted,
    handleEditSubmitted,
    handleQuestionRemoved,
    handleEditOpen,
    handleEditSubmit,
    closeShareModal,
    handleBackToMain,
    isQuestionBookmarked,
    setShareModalOpen,
    setInputCode,
    setIsEditModalOpen
  };
}
