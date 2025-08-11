'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { Question } from '@/app/utils/geminiService';
import { updateMetrics } from '@/app/utils/metrics';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
  isMultiSelectQuestion,
  gradeFreeResponses,
  buildApiParams,
  shuffleArray,
  getExplanation,
  calculateMCQScore
} from '@/app/utils/questionUtils';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  updateTimeLeft,
  markTestSubmitted,
  resetTestSession,
  migrateFromLegacyStorage,
  setupVisibilityHandling
} from '@/app/utils/timeManagement';
import api from '../../api';
import { getEventOfflineQuestions } from '@/app/utils/storage';

export function useTestState({ initialData, initialRouterData }: { initialData?: any[]; initialRouterData?: any } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const fetchStartedRef = useRef(false);
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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [gradingFRQs, setGradingFRQs] = useState<Record<number, boolean>>({});

  // Initialize component
  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem("loaded")) {
      localStorage.removeItem('testUserAnswers')
      toast.success('Shared test loaded successfully!');
      localStorage.removeItem("loaded");
    }
    
    const storedUserAnswers = localStorage.getItem('testUserAnswers');
    if (storedUserAnswers) {
      setUserAnswers(JSON.parse(storedUserAnswers));
    }
    
    return () => {
      if (!localStorage.getItem('testSubmitted')) {
        localStorage.removeItem('testUserAnswers');
      }
    };
  }, []);

  // Load test data
  useEffect(() => {
    console.log('[TEST] useEffect triggered', { 
      fetchStarted: fetchStartedRef.current, 
      dataLength: data.length, 
      isLoading, 
      hasInitialData: !!initialData,
      hasInitialRouterData: !!initialRouterData 
    });
    
    // Clear any existing bookmarked state that might interfere
    localStorage.removeItem('testFromBookmarks');
    
    // Reset fetchStartedRef if we have router data but no data yet
    if (initialRouterData && Object.keys(initialRouterData).length > 0 && data.length === 0) {
      fetchStartedRef.current = false;
    }
    
    if (fetchStartedRef.current || data.length > 0) {
      console.log('[TEST] early return', { reason: fetchStartedRef.current ? 'fetchStarted' : 'dataLength' });
      return;
    }
    
    fetchStartedRef.current = true;

    // Prefer initialRouterData from server. Fallback to localStorage.
    const storedParams = localStorage.getItem('testParams');
    const routerParams = initialRouterData || (storedParams ? JSON.parse(storedParams) : {});
    if (!routerParams || Object.keys(routerParams).length === 0) {
      router.push('/');
      return;
    }
    setRouterData(routerParams);
  
    const eventName = routerParams.eventName || 'Unknown Event';
    const timeLimit = parseInt(routerParams.timeLimit || '30');
    
    let session = migrateFromLegacyStorage(eventName, timeLimit);
    
    if (!session) {
      session = getCurrentTestSession();
      
      if (!session) {
        session = initializeTestSession(eventName, timeLimit, false);
      } else {
        session = resumeTestSession();
      }
    }
    
    if (session) {
      setTimeLeft(session.timeState.timeLeft);
      setIsSubmitted(session.isSubmitted);
    }

    const storedQuestions = localStorage.getItem('testQuestions');
    const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
    
    if (Array.isArray(initialData) && initialData.length > 0) {
      setData(initialData as Question[]);
      setIsLoading(false);
      return;
    }

    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      setIsLoading(false);
      return;
    }

    const loadBookmarkedQuestionsFromSupabase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isFromBookmarks && user) {
        try {
          const bookmarks = await loadBookmarksFromSupabase(user.id);
          const eventBookmarks = bookmarks.filter(b => b.eventName === eventName);
          
          if (eventBookmarks.length > 0) {
            const questions = eventBookmarks.map(b => b.question);
            setData(questions);
            // Strip imageData to avoid quota issues
            const serialized = JSON.stringify(questions, (key, value) => key === 'imageData' ? undefined : value);
            localStorage.setItem('testQuestions', serialized);
          } else {
            setFetchError('No bookmarked questions found for this event.');
          }
        } catch (error) {
          console.error('Error loading bookmarked questions:', error);
          setFetchError('Failed to load bookmarked questions.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    if (isFromBookmarks) {
      loadBookmarkedQuestionsFromSupabase();
      return;
    }
  
    const fetchData = async () => {
      try {
        const total = parseInt(routerParams.questionCount || '10');
        const idPctRaw = (routerParams as any).idPercentage;
        const idPct = typeof idPctRaw !== 'undefined' ? Math.max(0, Math.min(100, parseInt(idPctRaw))) : 0;
        const idCount = Math.round((idPct / 100) * total);
        const baseCount = Math.max(0, total - idCount);
        console.log('[IDGEN][test] start', { event: routerParams.eventName, total, idPct, baseCount, idCount, types: routerParams.types });

        let selectedQuestions: Question[] = [];

        // 1) Base (non-ID) questions from regular endpoint
        if (baseCount > 0) {
          const requestCount = Math.max(baseCount * 3, 50);
          const params = buildApiParams({ ...routerParams }, requestCount);
          const apiUrl = `${api.questions}?${params}`;
          console.log('[IDGEN][test] fetching base questions', { requestCount, apiUrl });

          let response: Response | null = null;
          try { response = await fetch(apiUrl); } catch { response = null; }
          let apiResponse: any = null;
          if (response && response.ok) {
            apiResponse = await response.json();
            console.log('[IDGEN][test] base questions response ok', { count: Array.isArray(apiResponse?.data) ? apiResponse.data.length : 'n/a' });
          } else {
            const evt = routerParams.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {
                apiResponse = { success: true, data: cached };
                console.log('[IDGEN][test] using cached base questions', { count: cached.length });
              }
            }
            if (!apiResponse) throw new Error('Failed to load questions.');
          }
          const questions: Question[] = (apiResponse.data || []).filter((q: any) => q.answers && Array.isArray(q.answers) && q.answers.length > 0);
          selectedQuestions = shuffleArray(questions).slice(0, baseCount);
          console.log('[IDGEN][test] selected base questions', { selected: selectedQuestions.length });
        }

        // 2) ID questions (blind to filters)
        if (idCount > 0 && routerParams.eventName === 'Rocks and Minerals') {
          const preferFRQ = routerParams.types !== 'multiple-choice';
          const idUrl = `${api.rocksRandom}?count=${idCount}`;
          console.log('[IDGEN][test] fetching id questions', { idUrl, preferFRQ });
          const resp = await fetch(idUrl);
          const { success, data, namePool } = await resp.json();
          if (success) {
            console.log('[IDGEN][test] id endpoint success', { rows: Array.isArray(data) ? data.length : 'n/a', namePoolSize: Array.isArray(namePool) ? namePool.length : 'n/a' });
            const idQuestions: Question[] = data.map((item: any) => {
              const imgs: string[] = Array.isArray(item.images) ? item.images : [];
              const chosenImg = imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;
              if (preferFRQ) {
                return {
                  question: 'Identify the mineral shown in the image.',
                  answers: item.names,
                  difficulty: 0.5,
                  event: 'Rocks and Minerals',
                  imageData: chosenImg,
                };
              }
              const correct = item.names[0];
              const distractors = shuffleArray((namePool as string[]).filter(n => !item.names.includes(n))).slice(0, 3);
              const options = shuffleArray([correct, ...distractors]);
              const correctIndex = options.indexOf(correct);
              return {
                question: 'Identify the mineral shown in the image.',
                options,
                answers: [correctIndex],
                difficulty: 0.5,
                event: 'Rocks and Minerals',
                imageData: chosenImg,
              };
            });
            // Combine and shuffle so ID questions are interspersed, not appended at the end
            selectedQuestions = shuffleArray(selectedQuestions.concat(idQuestions));
            console.log('[IDGEN][test] combined & shuffled final questions', { total: selectedQuestions.length });
          } else {
            console.warn('[IDGEN][test] id endpoint returned failure');
          }
        }

        // Final shuffle safeguard in case only base or only ID questions were loaded
        const shuffledFinal = shuffleArray(selectedQuestions);
        const questionsWithIndex = shuffledFinal.map((q, idx) => ({ ...q, originalIndex: idx }));
        // Avoid localStorage quota issues by stripping large image blobs
        const serialized = JSON.stringify(questionsWithIndex, (key, value) => key === 'imageData' ? undefined : value);
        localStorage.setItem('testQuestions', serialized);
        setData(questionsWithIndex);
      } catch (error) {
        console.error('[IDGEN][test] error', error);
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialData, initialRouterData]);

  // Timer logic
  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;

    if (timeLeft === 0) {
      handleSubmit();
      return;
    }
    
    if (timeLeft === 30) {
      toast.warning("Warning: Thirty seconds left");
    }
    if (timeLeft === 60) {
      toast.warning("Warning: One minute left");
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
      } else {
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
  }, [timeLeft, isSubmitted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup visibility handling
  useEffect(() => {
    const cleanup = setupVisibilityHandling();
    return cleanup;
  }, []);

  // Load user bookmarks
  useEffect(() => {
    const loadUserBookmarks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const bookmarks = await loadBookmarksFromSupabase(user.id);
        const bookmarkMap: Record<string, boolean> = {};
        bookmarks.forEach(bookmark => {
          if (bookmark.source === 'test') {
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

  const handleSubmit = useCallback(async () => {
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('🔴 SUBMITTING TEST:');
    console.log('  Total questions:', data.length);
    console.log('  User answers:', userAnswers);
    console.log('  Questions data:', data.map((q, i) => ({
      index: i,
      question: q.question.substring(0, 50) + '...',
      answers: q.answers,
      options: q.options
    })));
    
    interface FRQToGrade {
      index: number;
      question: string;
      correctAnswers: (string | number)[];
      studentAnswer: string;
    }
    
    const frqsToGrade: FRQToGrade[] = [];
    let mcqScore = 0; // fractional correctness sum
    let mcqTotal = 0; // number of attempted questions
    
    for (let i = 0; i < data.length; i++) {
      const question = data[i];
      const answer = userAnswers[i] || [];
      
      if (typeof gradingResults[i] === 'number') {
        const scoreVal = gradingResults[i];
        if (scoreVal > 0) {
          mcqTotal += 1; // attempted
          mcqScore += Math.max(0, Math.min(1, scoreVal)); // fractional correctness
        }
        continue;
      }
      
      if (!answer.length || !answer[0]) continue;
      
      if (question.options && question.options.length) {
        mcqTotal++;
        
        const correct = Array.isArray(question.answers)
          ? question.answers
          : [question.answers];
        

        
        const correctAnswers = correct.map(ans => {
          if (typeof ans === 'string') {
            if (ans === "") return undefined;
            return ans;
          } else if (typeof ans === 'number') {
            return question.options && ans >= 0 && ans < question.options.length 
              ? question.options[ans] 
              : undefined;
          }
          return undefined;
        }).filter((text): text is string => text !== undefined);
        
        if (correctAnswers.length === 0) {
          continue;
        }
        
        // Compute fractional score for MCQ using shared helper
        const frac = calculateMCQScore(question, answer);
        if (frac > 0) {
          mcqTotal += 1; // attempted only if any selection and some credit
        }
        mcqScore += Math.max(0, Math.min(1, frac));
        setGradingResults(prev => ({ ...prev, [i]: frac }));
      } else {
        if (answer[0] !== null) {
          const hasValidFRQAnswers = question.answers && 
            question.answers.length > 0 && 
            question.answers[0] !== "" && 
            question.answers[0] !== null;
          
          if (hasValidFRQAnswers) {
            frqsToGrade.push({
              index: i,
              question: question.question,
              correctAnswers: question.answers,
              studentAnswer: answer[0] as string
            });
          } else {
            setGradingResults(prev => ({ ...prev, [i]: 0.5 }));
          }
        }
      }
    }
    
    if (frqsToGrade.length > 0) {
      // Set loading state for FRQ questions
      frqsToGrade.forEach(item => {
        setGradingFRQs(prev => ({ ...prev, [item.index]: true }));
      });
      
      try {
        const scores = await gradeFreeResponses(
          frqsToGrade.map(item => ({
            question: item.question,
            correctAnswers: item.correctAnswers,
            studentAnswer: item.studentAnswer
          }))
        );
        
        scores.forEach((score, idx) => {
          const questionIndex = frqsToGrade[idx].index;
          setGradingResults(prev => ({ ...prev, [questionIndex]: score }));
          setGradingFRQs(prev => ({ ...prev, [questionIndex]: false }));
          
          // Attempted if answered; add fractional correctness
          mcqTotal += 1;
          mcqScore += Math.max(0, Math.min(1, score));
        });
      } catch (error) {
        console.error("Error grading FRQs:", error);
        frqsToGrade.forEach(item => {
          setGradingResults(prev => ({ ...prev, [item.index]: 0 }));
          setGradingFRQs(prev => ({ ...prev, [item.index]: false }));
        });
      }
    }
    
    markTestSubmitted();
    localStorage.removeItem('testUserAnswers');
    localStorage.removeItem('testFromBookmarks');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (routerData.eventName) {
      updateMetrics(user?.id || null, {
        questionsAttempted: mcqTotal,
        correctAnswers: Math.round(mcqScore),
        eventName: routerData.eventName
      });
    }
  }, [data, userAnswers, gradingResults, routerData]);

  const handleResetTest = () => {
    setIsSubmitted(false);
    setUserAnswers({});
    setGradingResults({});
    setExplanations({});
    
    localStorage.removeItem('testQuestions');
    localStorage.removeItem('testUserAnswers');
    localStorage.removeItem('contestedQuestions');
    localStorage.removeItem('testFromBookmarks');
    
    const timeLimit = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.timeLimit || "30";
    const eventName = JSON.parse(localStorage.getItem("testParams") ?? "{}")?.eventName || "Unknown Event";
    const newSession = resetTestSession(eventName, parseInt(timeLimit));
    
    setTimeLeft(newSession.timeState.timeLeft);
    
    window.location.reload();
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
      RATE_LIMIT_DELAY,
      true
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
    setData(prevData => {
      const newData = prevData.filter((_, index) => index !== questionIndex);
      localStorage.setItem('testQuestions', JSON.stringify(newData));
      return newData;
    });

    setUserAnswers(prevAnswers => {
      const newAnswers: Record<number, (string | null)[] | null> = {};
      
      Object.keys(prevAnswers).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newAnswers[index] = prevAnswers[index];
        } else if (index > questionIndex) {
          newAnswers[index - 1] = prevAnswers[index];
        }
      });
      
      localStorage.setItem('testUserAnswers', JSON.stringify(newAnswers));
      return newAnswers;
    });

    setGradingResults(prevResults => {
      const newResults: GradingResults = {};
      
      Object.keys(prevResults).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newResults[index] = prevResults[index];
        } else if (index > questionIndex) {
          newResults[index - 1] = prevResults[index];
        }
      });
      
      return newResults;
    });

    setExplanations(prevExplanations => {
      const newExplanations: Explanations = {};
      
      Object.keys(prevExplanations).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newExplanations[index] = prevExplanations[index];
        } else if (index > questionIndex) {
          newExplanations[index - 1] = prevExplanations[index];
        }
      });
      
      return newExplanations;
    });

    setLoadingExplanation(prevLoading => {
      const newLoading: LoadingExplanation = {};
      
      Object.keys(prevLoading).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newLoading[index] = prevLoading[index];
        } else if (index > questionIndex) {
          newLoading[index - 1] = prevLoading[index];
        }
      });
      
      return newLoading;
    });

    setSubmittedReports(prevReports => {
      const newReports: Record<number, boolean> = {};
      
      Object.keys(prevReports).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newReports[index] = prevReports[index];
        } else if (index > questionIndex) {
          newReports[index - 1] = prevReports[index];
        }
      });
      
      return newReports;
    });

    setSubmittedEdits(prevEdits => {
      const newEdits: Record<number, boolean> = {};
      
      Object.keys(prevEdits).forEach(key => {
        const index = parseInt(key);
        if (index < questionIndex) {
          newEdits[index] = prevEdits[index];
        } else if (index > questionIndex) {
          newEdits[index - 1] = prevEdits[index];
        }
      });
      
      return newEdits;
    });
  };

  const handleEditOpen = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (editedQuestion: Question, reason: string, originalQuestion: Question): Promise<{ success: boolean; message: string; reason: string; }> => {
    try {
      const response = await fetch(api.reportEdit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: originalQuestion,
          editedQuestion: editedQuestion,
          reason: reason,
          event: routerData.eventName,
          bypass: false
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
        return { success: true, message: result.reason || 'Edit submitted successfully!', reason: result.reason || 'Edit submitted successfully!' };
      } else {
        return { success: false, message: result.reason || 'Failed to submit edit', reason: result.reason || 'Failed to submit edit' };
      }
    } catch (error) {
      console.error('Error submitting edit:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.', reason: 'An unexpected error occurred. Please try again.' };
    }
  };

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  const handleBackToMain = () => {
    router.push('/practice');
  };

  const getBookmarkKey = (q: Question): string => (q as any).imageData ? `id:${(q as any).imageData}` : q.question;
  const isQuestionBookmarked = (question: Question): boolean => {
    return bookmarkedQuestions[getBookmarkKey(question)] || false;
  };

  return {
    // State
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
    
    // Handlers
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
