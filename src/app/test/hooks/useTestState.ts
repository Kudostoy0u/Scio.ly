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
    setupVisibilityHandling,
    pauseTestSession,
    resumeFromPause
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
      // Do not toast on resume/share-load; keep UX quiet
      localStorage.removeItem("loaded");
    }
    
    const storedUserAnswers = localStorage.getItem('testUserAnswers');
    if (storedUserAnswers) {
      setUserAnswers(JSON.parse(storedUserAnswers));
    }
  }, []);

  // Load test data
  useEffect(() => {
    
    // Clear any existing bookmarked state that might interfere
    localStorage.removeItem('testFromBookmarks');
    
    // Reset fetchStartedRef if we have router data but no data yet
    if (initialRouterData && Object.keys(initialRouterData).length > 0 && data.length === 0) {
      fetchStartedRef.current = false;
    }
    
    if (fetchStartedRef.current || data.length > 0) {
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
            // Store questions with imageData intact (CDN URLs are small)
            localStorage.setItem('testQuestions', JSON.stringify(questions));
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
        const supportsId = routerParams.eventName === 'Rocks and Minerals' || routerParams.eventName === 'Entomology';
        const requestedIdCount = Math.round((idPct / 100) * total);
        const idCount = supportsId ? requestedIdCount : 0;
        const baseCount = Math.max(0, total - idCount);
        

        let selectedQuestions: Question[] = [];

        // 1) Base (non-ID) questions from regular endpoint
        if (baseCount > 0) {
          const requestCount = Math.max(baseCount * 3, 50);
          const params = buildApiParams({ ...routerParams }, requestCount);
          const apiUrl = `${api.questions}?${params}`;
          

          let response: Response | null = null;
          try { response = await fetch(apiUrl); } catch { response = null; }
          let apiResponse: any = null;
          if (response && response.ok) {
            apiResponse = await response.json();
            
          } else {
            const evt = routerParams.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {
                // Respect question type selection when offline
                const typesSel = (routerParams.types as string) || 'multiple-choice';
                const filtered = typesSel === 'multiple-choice'
                  ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                  : typesSel === 'free-response'
                    ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                    : cached;
                apiResponse = { success: true, data: filtered };
                
              }
            }
            if (!apiResponse) throw new Error('Failed to load questions.');
          }
          const questions: Question[] = (apiResponse.data || []).filter((q: any) => q.answers && Array.isArray(q.answers) && q.answers.length > 0);
          selectedQuestions = shuffleArray(questions).slice(0, baseCount);
          
        }

        // 2) ID questions (blind to filters)
        if (idCount > 0) {
          const preferFRQ = routerParams.types !== 'multiple-choice';
          const idEndpoint =
            routerParams.eventName === 'Rocks and Minerals' ? api.rocksRandom :
            routerParams.eventName === 'Entomology' ? api.entomologyRandom :
            null;
          if (!idEndpoint) {
            console.warn('[IDGEN][test] no id endpoint for event (ignored)', routerParams.eventName);
          }
          const idUrl = `${idEndpoint}?count=${idCount}`;
          console.log('[IDGEN][test] fetching id questions', { idUrl, preferFRQ });
          const resp = await fetch(idUrl);
          const { success, data, namePool } = await resp.json();
          if (success) {
            
            const idQuestions: Question[] = data.map((item: any) => {
              const imgs: string[] = Array.isArray(item.images) ? item.images : [];
              const chosenImg = imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;
              const isEnt = routerParams.eventName === 'Entomology';
              const frqPrompt = isEnt ? 'Identify the scientific name of the insect.' : 'Identify the mineral shown in the image.';
              const mcqPrompt = frqPrompt;

              const typesSel = (routerParams.types as string) || 'multiple-choice';
              const isFRQ = typesSel === 'free-response' || (typesSel === 'both' && Math.random() < 0.5);

              if (isFRQ) {
                return {
                  question: frqPrompt,
                  answers: item.names,
                  difficulty: 0.5,
                  event: routerParams.eventName || 'Rocks and Minerals',
                  imageData: chosenImg,
                };
              }
              const correct = item.names[0];
              const distractors = shuffleArray((namePool as string[]).filter(n => !item.names.includes(n))).slice(0, 3);
              const options = shuffleArray([correct, ...distractors]);
              const correctIndex = options.indexOf(correct);
              return {
                question: mcqPrompt,
                options,
                answers: [correctIndex],
                difficulty: 0.5,
                event: routerParams.eventName || 'Rocks and Minerals',
                imageData: chosenImg,
              };
            });
            // Combine and shuffle so ID questions are interspersed, not appended at the end
            selectedQuestions = shuffleArray(selectedQuestions.concat(idQuestions));
            console.log('[IDGEN][test] combined & shuffled final questions', { total: selectedQuestions.length });
          } else {
            
          }
        }

        // Final shuffle safeguard in case only base or only ID questions were loaded
        const shuffledFinal = shuffleArray(selectedQuestions);
        const questionsWithIndex = shuffledFinal.map((q, idx) => ({ ...q, originalIndex: idx }));
        // Store questions with imageData intact (CDN URLs are small)
        localStorage.setItem('testQuestions', JSON.stringify(questionsWithIndex));
        setData(questionsWithIndex);
      } catch {
        
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialData, initialRouterData]);

  // Timer logic (for non-shared tests, decrement from stored timeLeft only while mounted)
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
      } else if (!session.timeState.isPaused) {
        const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
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

  // Pause timer when leaving the page/component
  useEffect(() => {
    return () => {
      try { pauseTestSession(); } catch {}
    };
  }, []);

  // On mount, ensure we clear paused state so ticking resumes
  useEffect(() => {
    try { resumeFromPause(); } catch {}
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
      
      // Fuzzy grading fallback for offline or API failure
      const fuzzyGrade = (student: string, corrects: (string | number)[]): number => {
        const normalize = (s: string) => s
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const levenshtein = (a: string, b: string): number => {
          const m = a.length, n = b.length;
          if (m === 0) return n;
          if (n === 0) return m;
          const prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
          for (let i = 1; i <= m; i++) {
            let lastDiag = i - 1;
            prev[0] = i;
            for (let j = 1; j <= n; j++) {
              const temp = prev[j];
              const cost = a[i - 1] === b[j - 1] ? 0 : 1;
              prev[j] = Math.min(
                prev[j] + 1,
                prev[j - 1] + 1,
                lastDiag + cost
              );
              lastDiag = temp;
            }
          }
          return prev[n];
        };
        const s = normalize(student);
        if (!s) return 0;
        let best = 0;
        for (const ans of corrects) {
          const a = normalize(String(ans));
          if (!a) continue;
          if (s === a) return 1;
          if (a.includes(s) || s.includes(a)) best = Math.max(best, 0.85);
          const dist = levenshtein(s, a);
          const maxLen = Math.max(s.length, a.length);
          if (maxLen > 0) {
            const sim = 1 - dist / maxLen;
            best = Math.max(best, sim);
          }
        }
        if (best >= 0.9) return 1;
        if (best >= 0.75) return 0.75;
        if (best >= 0.6) return 0.5;
        if (best >= 0.45) return 0.25;
        return 0;
      };

      const gradeViaApi = async () => {
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
          mcqTotal += 1;
          mcqScore += Math.max(0, Math.min(1, score));
        });
      };

      const gradeViaFuzzy = async () => {
        frqsToGrade.forEach(item => {
          const score = fuzzyGrade(item.studentAnswer, item.correctAnswers);
          setGradingResults(prev => ({ ...prev, [item.index]: score }));
          setGradingFRQs(prev => ({ ...prev, [item.index]: false }));
          mcqTotal += 1;
          mcqScore += Math.max(0, Math.min(1, score));
        });
      };

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online) {
        await gradeViaFuzzy();
      } else {
        try {
          await gradeViaApi();
        } catch {
          await gradeViaFuzzy();
        }
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
        return { success: true, message: result.message || 'Edit submitted successfully!', reason: result.message || 'Edit submitted successfully!' };
      } else {
        return { success: false, message: result.message || 'Failed to submit edit', reason: result.message || 'Failed to submit edit' };
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
    try { pauseTestSession(); } catch {}
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
