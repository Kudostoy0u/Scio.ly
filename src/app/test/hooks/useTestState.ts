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
// Validation function for assignment questions
function validateAssignmentQuestions(questions: any[]): void {
  questions.forEach((question, index) => {
    if (!question.answers) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) missing required answers field`);
    }
    
    if (question.answers === undefined) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has undefined answers field`);
    }
    
    if (question.answers === null) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has null answers field`);
    }
    
    if (Array.isArray(question.answers) && question.answers.length === 0) {
      throw new Error(`Assignment question ${index + 1} (${question.question}) has empty answers array`);
    }
  });
}

export function useTestState({ initialData, initialRouterData }: { initialData?: any[]; initialRouterData?: any } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const fetchStartedRef = useRef(false);
  const fetchCompletedRef = useRef(false);
  const [data, setData] = useState<Question[]>(Array.isArray(initialData) ? initialData as Question[] : []);
  
  // Debug data state changes
  useEffect(() => {
    console.log('🔄 DATA STATE CHANGED:');
    console.log('Data length:', data.length);
    if (data.length > 0) {
      console.log('First question answers field:', data[0]?.answers);
      console.log('First question structure:', {
        question: data[0]?.question,
        hasAnswers: !!data[0]?.answers,
        answers: data[0]?.answers,
        hasOptions: !!data[0]?.options,
        optionsLength: data[0]?.options?.length
      });
    }
  }, [data]);
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
    // Handle view results mode - set submitted state if viewResults=true
    if (stableRouterData.viewResults === 'true' && !isSubmitted) {
      setIsSubmitted(true);
      // Load stored answers and grading results for view results mode
      const assignmentKey = `assignment_${stableRouterData.assignmentId}`;
      const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
      const storedGrading = localStorage.getItem(`${assignmentKey}_grading`);
      const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
      
      if (storedQuestions) {
        try {
          const parsedQuestions = JSON.parse(storedQuestions);
          console.log('📖 LOADING ASSIGNMENT QUESTIONS FROM LOCALSTORAGE:');
          console.log('Assignment key:', assignmentKey);
          console.log('Raw stored questions:', storedQuestions.substring(0, 500) + '...');
          console.log('Parsed questions:', parsedQuestions);
          console.log('First question answers field:', parsedQuestions[0]?.answers);
          
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            // Validate assignment questions have required answers field
            validateAssignmentQuestions(parsedQuestions);
            console.log('✅ VALIDATION PASSED - Setting data with questions that have answers field');
            setData(parsedQuestions);
            setIsLoading(false);
            fetchCompletedRef.current = true;
          }
        } catch (error) {
          console.error('Failed to parse stored questions:', error);
          if (error instanceof Error && error.message.includes('Assignment question')) {
            // Clear invalid questions from localStorage
            localStorage.removeItem(`${assignmentKey}_questions`);
            localStorage.removeItem(`${assignmentKey}_answers`);
            localStorage.removeItem(`${assignmentKey}_grading`);
            console.error('Cleared invalid assignment data from localStorage');
          }
        }
      }
      
      if (storedAnswers) {
        try {
          const parsedAnswers = JSON.parse(storedAnswers);
          setUserAnswers(parsedAnswers);
        } catch (error) {
          console.error('Failed to parse stored answers:', error);
        }
      }
      
      if (storedGrading) {
        try {
          const parsedGrading = JSON.parse(storedGrading);
          setGradingResults(parsedGrading);
        } catch (error) {
          console.error('Failed to parse stored grading results:', error);
        }
      }
    }
    
    // Handle assignment loading
    // Check if we're in assignment mode (has assignmentId or teamsAssign=1)
    const isAssignmentMode = !!(stableRouterData.assignmentId || stableRouterData.teamsAssign === '1' || stableRouterData.teamsAssign === 1);
    
    if (isAssignmentMode && !fetchCompletedRef.current) {
      const loadAssignment = async () => {
        try {
          console.log('=== CLIENT SIDE ASSIGNMENT LOADING ===');
          console.log('Loading assignment ID:', stableRouterData.assignmentId);
          console.log('Is assignment mode:', isAssignmentMode);
          
          const assignmentId = stableRouterData.assignmentId;
          const assignmentKey = `assignment_${assignmentId}`;
          
          // If coming from /assign/[id] route, the data should already be in localStorage in old format
          if (stableRouterData.teamsAssign === '1' || stableRouterData.teamsAssign === 1) {
            console.log('Loading from /assign/[id] route - checking old localStorage format');
            const storedQuestions = localStorage.getItem('testQuestions');
            // Use assignment-specific keys if assignmentId is available, otherwise use generic keys
            const answersKey = assignmentId ? `assignment_${assignmentId}_answers` : 'testUserAnswers';
            const gradesKey = assignmentId ? `assignment_${assignmentId}_grading` : 'testGradingResults';
            
            console.log('DEBUG: Assignment loading - checking localStorage', {
              assignmentId,
              answersKey,
              gradesKey,
              hasAssignmentId: !!assignmentId
            });
            
            const storedAnswers = localStorage.getItem(answersKey);
            const storedGrading = localStorage.getItem(gradesKey);
            
            console.log('DEBUG: Assignment localStorage check', {
              hasStoredAnswers: !!storedAnswers,
              hasStoredGrading: !!storedGrading,
              answersKey,
              gradesKey
            });
            
            if (storedQuestions) {
              try {
                const questions = JSON.parse(storedQuestions);
                const answers = storedAnswers ? JSON.parse(storedAnswers) : {};
                const grading = storedGrading ? JSON.parse(storedGrading) : {};
                
                console.log('DEBUG: Parsing assignment data', {
                  questionCount: questions.length,
                  answersObject: answers,
                  answersKeys: Object.keys(answers),
                  answersLength: Object.keys(answers).length,
                  gradingObject: grading
                });
                
                /**
                 * CRITICAL VALIDATION: Check if cached questions have valid answers field
                 */
                const hasInvalidQuestions = questions.some((q: Question) =>
                  !q.answers || !Array.isArray(q.answers) || q.answers.length === 0
                );

                if (hasInvalidQuestions) {
                  console.warn(
                    '⚠️ Old cached questions have invalid answers field - clearing cache and reloading from API',
                    { questionCount: questions.length }
                  );

                  // Clear the invalid old cache - use the SAME keys we loaded from!
                  localStorage.removeItem('testQuestions');
                  localStorage.removeItem(answersKey); // Already defined at line 218
                  localStorage.removeItem(gradesKey); // Already defined at line 219
                  localStorage.removeItem('testSubmitted');
                  localStorage.removeItem('testParams');
                  localStorage.removeItem('currentTestSession');

                  // Don't throw - just skip the cached data and fall through to API fetch below
                  // The code will naturally continue to line 387+ where the API fetch happens
                } else {
                  // Questions are valid - use cached data
                  console.log('Resuming assignment from /assign/[id] localStorage', {
                    questionCount: questions.length,
                    hasAnswers: Object.keys(answers).length > 0
                  });

                  setData(normalizeQuestionsFull(questions));
                  console.log('DEBUG: About to set user answers', answers);
                  setUserAnswers(answers);
                  setGradingResults(grading);

                  setRouterData({
                    ...stableRouterData,
                    eventName: stableRouterData.eventName || 'Assignment',
                    timeLimit: stableRouterData.timeLimit || '60',
                    assignmentMode: true
                  });

                  setIsLoading(false);
                  fetchCompletedRef.current = true;
                  return;
                }
              } catch (error) {
                console.error('Failed to parse /assign/[id] localStorage data:', error);
                // Continue to load from API
              }
            }
          }
          
          // Check for existing assignment progress in new localStorage format (for direct assignmentId)
          if (assignmentId) {
            console.log('DEBUG: New assignment format loading', {
              assignmentId,
              assignmentKey,
              teamsAssign: stableRouterData.teamsAssign
            });
            
            const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
            const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
            const storedSession = localStorage.getItem(`${assignmentKey}_session`);
            
            console.log('DEBUG: New assignment localStorage check', {
              hasStoredQuestions: !!storedQuestions,
              hasStoredAnswers: !!storedAnswers,
              hasStoredSession: !!storedSession,
              assignmentKey
            });
            
            if (storedQuestions && storedAnswers) {
              try {
                const questions = JSON.parse(storedQuestions);
                const answers = JSON.parse(storedAnswers);
                const session = storedSession ? JSON.parse(storedSession) : null;

                /**
                 * CRITICAL VALIDATION: Check if cached questions have valid answers field
                 *
                 * Old cached questions (before the fix) don't have answers field.
                 * We MUST reject these and reload from API to get the correct data.
                 */
                const hasInvalidQuestions = questions.some((q: Question) =>
                  !q.answers || !Array.isArray(q.answers) || q.answers.length === 0
                );

                if (hasInvalidQuestions) {
                  console.warn(
                    '⚠️ Cached questions have invalid answers field - clearing cache and reloading from API',
                    { assignmentKey, questionCount: questions.length }
                  );

                  // Clear the invalid cache
                  localStorage.removeItem(`${assignmentKey}_questions`);
                  localStorage.removeItem(`${assignmentKey}_answers`);
                  localStorage.removeItem(`${assignmentKey}_session`);
                  localStorage.removeItem(`${assignmentKey}_grading`);

                  // Don't throw - just skip the cached data and fall through to API fetch below
                } else {
                  // Questions are valid - use cached data
                  console.log('Resuming assignment from new localStorage format', {
                    questionCount: questions.length,
                    hasAnswers: Object.keys(answers).length > 0,
                    hasSession: !!session,
                    teamsAssign: stableRouterData.teamsAssign
                  });

                  setData(normalizeQuestionsFull(questions));
                  setUserAnswers(answers);

                  if (session) {
                    setIsSubmitted(session.isSubmitted || false);
                    if (session.timeLeft !== undefined) {
                      setTimeLeft(session.timeLeft);
                    }
                  }

                  setRouterData({
                    ...stableRouterData,
                    eventName: session?.eventName || 'Assignment',
                    timeLimit: session?.timeLimit || '60',
                    assignmentMode: true
                  });

                  setIsLoading(false);
                  fetchCompletedRef.current = true;
                  return;
                }
              } catch (error) {
                console.error('Failed to parse stored assignment data:', error);
                // Continue to load from API
              }
            }
          }
          
          // Reset test state when loading assignment via notifications
          console.log('Resetting test state for assignment loading...');
          setIsSubmitted(false);
          setUserAnswers({});
          setGradingResults({});
          // Don't reset data and routerData here - let assignment loading set them
          
          // Clear localStorage test state
          localStorage.removeItem('testSubmitted');
          localStorage.removeItem('testUserAnswers');
          localStorage.removeItem('testQuestions');
          localStorage.removeItem('testParams');
          localStorage.removeItem('testGradingResults');
          localStorage.removeItem('currentTestSession');
          
          const response = await fetch(`/api/assignments/${assignmentId}`);
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
            
            // Store assignment data in localStorage with assignment-specific keys
            console.log('💾 STORING ASSIGNMENT QUESTIONS TO LOCALSTORAGE:');
            console.log('Assignment key:', assignmentKey);
            console.log('Questions to store:', normalized);
            console.log('First question answers field:', normalized[0]?.answers);
            localStorage.setItem(`${assignmentKey}_questions`, JSON.stringify(normalized));
            localStorage.setItem(`${assignmentKey}_session`, JSON.stringify({
              eventName: assignment.title,
              timeLimit: '60',
              assignmentMode: true,
              isSubmitted: false,
              timeLeft: 60 * 60 // 60 minutes in seconds
            }));
            
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
          // Don't clear data on error - keep any existing data
          return;
        }
      };
      
      loadAssignment();
      return;
    }

    // Prefer locally stored questions over SSR on reload to resume tests
    if (!ssrAppliedRef.current) {
      try {
        // Only clear practice data when starting a new assignment (not when switching back to practice)
        const currentAssignmentId = localStorage.getItem('currentAssignmentId');
        const isAssignmentMode = !!stableRouterData.assignmentId;
        const newAssignmentId = stableRouterData.assignmentId;
        
        if (isAssignmentMode && newAssignmentId && newAssignmentId !== currentAssignmentId) {
          // Starting a new assignment - clear practice data and previous assignment data
          localStorage.removeItem('testQuestions');
          localStorage.removeItem('testUserAnswers');
          localStorage.removeItem('testGradingResults');
          localStorage.removeItem('testParams');
          
          // Clear previous assignment data if switching to a different assignment
          if (currentAssignmentId) {
            const oldAssignmentKey = `assignment_${currentAssignmentId}`;
            localStorage.removeItem(`${oldAssignmentKey}_questions`);
            localStorage.removeItem(`${oldAssignmentKey}_answers`);
            localStorage.removeItem(`${oldAssignmentKey}_grading`);
            localStorage.removeItem(`${oldAssignmentKey}_session`);
          }
          
          // Update current assignment ID
          localStorage.setItem('currentAssignmentId', newAssignmentId);
        }
        
        const stored = localStorage.getItem('testQuestions');
        if (stored && !isAssignmentMode) {
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
              // Load answers using appropriate localStorage key based on assignment mode
              const isAssignmentMode = !!(routerData.assignmentId || (routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1);
              const answersKey = isAssignmentMode && routerData.assignmentId 
                ? `assignment_${routerData.assignmentId}_answers` 
                : 'testUserAnswers';
              const gradesKey = isAssignmentMode && routerData.assignmentId 
                ? `assignment_${routerData.assignmentId}_grading` 
                : 'testGradingResults';
              
              console.log('DEBUG: Loading answers from localStorage', {
                routerData,
                isAssignmentMode,
                assignmentId: routerData.assignmentId,
                answersKey,
                gradesKey
              });
              
              const storedAnswers = localStorage.getItem(answersKey);
              console.log('DEBUG: Found stored answers?', !!storedAnswers, answersKey);
              if (storedAnswers) {
                try { 
                  const parsed = JSON.parse(storedAnswers);
                  console.log('DEBUG: Parsed answers', Object.keys(parsed).length, 'questions');
                  setUserAnswers(parsed); 
                } catch (e) {
                  console.error('DEBUG: Failed to parse answers', e);
                }
              }
              const storedGrades = localStorage.getItem(gradesKey);
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
      // Only restore from generic localStorage if we're not in assignment mode
      const isAssignmentMode = !!(routerData.assignmentId || (routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1);
      
      if (!isAssignmentMode) {
        const restored = restoreStoredState();
        if (restored.userAnswers) setUserAnswers(restored.userAnswers);
        if (restored.gradingResults) setGradingResults(restored.gradingResults);
      } else {
        console.log('DEBUG: Skipping restoreStoredState for assignment mode');
      }
    }).catch(() => {});
  }, [initialData, initialRouterData, routerData]);

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
    // Skip initLoad if we're in assignment mode - assignment loading is handled separately
    if (stableRouterData.assignmentId) return;
    
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
      
      // Use assignment-specific localStorage keys if in assignment mode
      // Check if we're in assignment mode (has assignmentId or teamsAssign=1)
      const isAssignmentMode = !!(routerData.assignmentId || (routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1);
      
      if (isAssignmentMode && routerData.assignmentId) {
        // Assignment mode with specific assignmentId
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_answers`, JSON.stringify(updatedAnswers));
      } else {
        // General practice mode
        localStorage.setItem('testUserAnswers', JSON.stringify(updatedAnswers));
      }
      
      return updatedAnswers;
    });
  };


  useEffect(() => {
    try { 
      // Use assignment-specific localStorage keys if in assignment mode
      // Check if we're in assignment mode (has assignmentId or teamsAssign=1)
      const isAssignmentMode = !!(routerData.assignmentId || (routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1);
      
      if (isAssignmentMode && routerData.assignmentId) {
        // Assignment mode with specific assignmentId
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_grading`, JSON.stringify(gradingResults));
      } else {
        // General practice mode
        localStorage.setItem('testGradingResults', JSON.stringify(gradingResults));
      }
    } catch {}
  }, [gradingResults, routerData]);

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
    const { mcqTotal, mcqScore, frqsToGrade, newGrading } = computeMcqTotals(data, userAnswers, gradingResults, !!(routerData as any).assignmentMode);
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
      
      // Use assignment-specific localStorage keys if in assignment mode
      // Check if we're in assignment mode (has assignmentId OR has teamsAssign=1 AND currentAssignmentId in localStorage)
      const hasCurrentAssignmentId = !!localStorage.getItem('currentAssignmentId');
      const isAssignmentMode = !!(routerData.assignmentId || ((routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1) && hasCurrentAssignmentId);
      
      if (isAssignmentMode && routerData.assignmentId) {
        // Assignment mode with specific assignmentId
        const assignmentKey = `assignment_${routerData.assignmentId}`;
        localStorage.setItem(`${assignmentKey}_grading`, JSON.stringify(gradingResults));
        localStorage.setItem(`${assignmentKey}_session`, JSON.stringify({
          ...JSON.parse(localStorage.getItem(`${assignmentKey}_session`) || '{}'),
          isSubmitted: true
        }));
      } else {
        // General practice mode
        localStorage.setItem('testGradingResults', JSON.stringify(gradingResults));
      }

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
      // Handle legacy assignment submission - only if we're actually in assignment mode
      const isLegacyAssignmentMode = (routerData as any).teamsAssign === '1' || (routerData as any).teamsAssign === 1;
      if (isLegacyAssignmentMode) {
        try {
          const assignmentIdStr = localStorage.getItem('currentAssignmentId');
          if (assignmentIdStr) {
          const assignmentId = Number(assignmentIdStr);
          if (!assignmentId || Number.isNaN(assignmentId)) {
            // Clear invalid assignment ID and show a more helpful error message
            localStorage.removeItem('currentAssignmentId');
            try { (await import('react-toastify')).toast.error('Invalid assignment ID detected. Test submitted as practice mode.'); } catch {}
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
