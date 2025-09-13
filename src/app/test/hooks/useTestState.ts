'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { normalizeTestText, normalizeQuestionText } from '../utils/normalizeTestText';

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
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});
  const [submittedReports, setSubmittedReports] = useState<Record<number, boolean>>({});
  const [submittedEdits, setSubmittedEdits] = useState<Record<number, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [gradingFRQs, setGradingFRQs] = useState<Record<number, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);


  const routerDataKey = JSON.stringify(initialRouterData);
  const stableRouterData = useMemo(() => {
    return initialRouterData || {};
  }, [routerDataKey]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    setIsMounted(true);
    if (localStorage.getItem("loaded")) {
      localStorage.removeItem('testUserAnswers')
      localStorage.removeItem('testGradingResults')

      localStorage.removeItem("loaded");
    }
    
    const storedUserAnswers = localStorage.getItem('testUserAnswers');
    if (storedUserAnswers) {
      setUserAnswers(JSON.parse(storedUserAnswers));
    }

    const storedGrading = localStorage.getItem('testGradingResults');
    if (storedGrading) {
      try { setGradingResults(JSON.parse(storedGrading)); } catch {}
    }
  }, []);


  useEffect(() => {
    

    localStorage.removeItem('testFromBookmarks');
    

    if (fetchStartedRef.current || fetchCompletedRef.current || data.length > 0 || isLoading === false) {
      return;
    }
    
    fetchStartedRef.current = true;


    const storedParams = localStorage.getItem('testParams');
    const routerParams = stableRouterData || (storedParams ? JSON.parse(storedParams) : {});
    if (!routerParams || Object.keys(routerParams).length === 0) {
      router.push('/');
      return;
    }
    setRouterData(routerParams);
  
    const eventName = routerParams.eventName || 'Unknown Event';
    const timeLimit = parseInt(routerParams.timeLimit || '30');
    

    try {
      const existingSession = getCurrentTestSession();
      if (
        existingSession && (
          (existingSession.eventName && existingSession.eventName !== eventName) ||
          (existingSession.timeLimit && existingSession.timeLimit !== timeLimit)
        )
      ) {
        resetTestSession(eventName, timeLimit);
        localStorage.removeItem('testQuestions');
        localStorage.removeItem('testUserAnswers');
        localStorage.removeItem('testGradingResults');
      }
    } catch {}
    
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

      if (session.isSubmitted) {
        const storedGrading = localStorage.getItem('testGradingResults');
        if (storedGrading) {
          try { setGradingResults(JSON.parse(storedGrading)); } catch {}
        }
      }
    }

    const storedQuestions = localStorage.getItem('testQuestions');
    const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
    
    if (Array.isArray(initialData) && initialData.length > 0) {
      setData(initialData as Question[]);
      setIsLoading(false);
      fetchCompletedRef.current = true;
      return;
    }

    if (storedQuestions) {
      const parsedQuestions = JSON.parse(storedQuestions);
      setData(parsedQuestions);
      setIsLoading(false);
      fetchCompletedRef.current = true;
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

            localStorage.setItem('testQuestions', JSON.stringify(questions));
          } else {
            setFetchError('No bookmarked questions found for this event.');
          }
        } catch (error) {
          console.error('Error loading bookmarked questions:', error);
          setFetchError('Failed to load bookmarked questions.');
        } finally {
          setIsLoading(false);
          fetchCompletedRef.current = true;
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
        const supportsId = routerParams.eventName === 'Rocks and Minerals' || 
                          routerParams.eventName === 'Entomology' ||
                          routerParams.eventName === 'Anatomy - Nervous' ||
                          routerParams.eventName === 'Anatomy - Endocrine' ||
                          routerParams.eventName === 'Anatomy - Sense Organs' ||
                          routerParams.eventName === 'Dynamic Planet - Oceanography' ||
                          routerParams.eventName === 'Water Quality - Freshwater' ||
                          routerParams.eventName === 'Remote Sensing' ||
                          routerParams.eventName === 'Circuit Lab' ||
                          routerParams.eventName === 'Astronomy';
        const requestedIdCount = Math.round((idPct / 100) * total);
        const idCount = supportsId ? requestedIdCount : 0;
        const baseCount = Math.max(0, total - idCount);
        

        let selectedQuestions: Question[] = [];

        // 1) base (non-id) questions from regular endpoint
        if (baseCount > 0) {
          const requestCount = Math.max(baseCount, 50);
          const params = buildApiParams({ ...routerParams }, requestCount);
          const apiUrl = `${api.questions}?${params}`;
          
          let apiResponse: any = null;
          

          const isOffline = !navigator.onLine;
          if (isOffline) {

            const evt = routerParams.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {

                const typesSel = (routerParams.types as string) || 'multiple-choice';
                const filtered = typesSel === 'multiple-choice'
                  ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                  : typesSel === 'free-response'
                    ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                    : cached;
                apiResponse = { success: true, data: filtered };
              }
            }
            if (!apiResponse) throw new Error('No offline data available for this event. Please download it first.');
          } else {

            let response: Response | null = null;
            try { response = await fetch(apiUrl); } catch { response = null; }
            
            if (response && response.ok) {
              apiResponse = await response.json();
            } else {

              const evt = routerParams.eventName as string | undefined;
              if (evt) {
                const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const cached = await getEventOfflineQuestions(slug);
                if (Array.isArray(cached) && cached.length > 0) {

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
          }
          
          const allQuestions = apiResponse.data || [];
          const questions: Question[] = allQuestions;
          console.log(`Question filtering: ${allQuestions.length} total questions, ${questions.length} questions after filtering (quality filtering removed)`);
          selectedQuestions = shuffleArray(questions).slice(0, baseCount);
        }

        // 2) id questions from new endpoint for supported events
        if (idCount > 0) {
          const isOffline = !navigator.onLine;
          let source: any[] = [];
          
          if (isOffline) {

            console.log('ID questions not available in offline mode');
          } else {

            try {
              const params = new URLSearchParams();
              params.set('event', routerParams.eventName);
              params.set('limit', String(Math.max(idCount * 3, 50)));
              

              if (routerParams.subtopics && routerParams.subtopics.length > 0) {
                params.set('subtopics', routerParams.subtopics.join(','));
              }
              
              const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
              const json = await resp.json();
              source = Array.isArray(json?.data) ? json.data : [];
            } catch {
              console.log('Failed to fetch ID questions, continuing without them');
            }
          }
          

          const typesSel = (routerParams.types as string) || 'multiple-choice';
          const filtered = source.filter((row: any) => {
            const isMcq = Array.isArray(row.options) && row.options.length > 0;
            if (typesSel === 'multiple-choice') return isMcq;
            if (typesSel === 'free-response') return !isMcq;
            return true; // both
          });
          const idQuestions: Question[] = filtered.map((row: any) => ({
            id: row.id,
            question: row.question,
            options: row.options || [],
            answers: row.answers || [],
            difficulty: row.difficulty ?? 0.5,
            event: row.event,
            subtopics: row.subtopics || [],
            imageData: Array.isArray(row.images) && row.images.length ? row.images[Math.floor(Math.random()*row.images.length)] : undefined,
          }));

          const pickedId = shuffleArray(idQuestions).slice(0, idCount);

          selectedQuestions = selectedQuestions.concat(pickedId);
        }


        if (selectedQuestions.length < total && baseCount > 0) {
          const need = total - selectedQuestions.length;
          const isOffline = !navigator.onLine;
          
          if (isOffline) {

            console.log(`Offline mode: only ${selectedQuestions.length} questions available, need ${total}`);
          } else {

            try {
              const requestCount = Math.max(need, 50);
              const params2 = buildApiParams({ ...routerParams }, requestCount);
              const apiUrl2 = `${api.questions}?${params2}`;
              const r2 = await fetch(apiUrl2).catch(() => null);
              const j2 = r2 && r2.ok ? await r2.json() : null;
              const extras: Question[] = (j2?.data || []);
              selectedQuestions = selectedQuestions.concat(shuffleArray(extras).slice(0, need));
            } catch {
              console.log('Failed to fetch additional questions for top-up');
            }
          }
        }


        const shuffledFinal = shuffleArray(selectedQuestions).slice(0, total);
        console.log(`Final questions after slicing to ${total}: ${shuffledFinal.length} questions`);
        const questionsWithIndex = shuffledFinal.map((q, idx) => ({ ...q, originalIndex: idx }));
        
        // ========================================



        // ========================================
        questionsWithIndex.forEach(question => {

          if (question.question) {
            question.question = normalizeQuestionText(question.question);
          }
          

          if (Array.isArray(question.options)) {
            question.options = question.options.map(option => 
              typeof option === 'string' ? normalizeTestText(option) : option
            );
          }
          

          if (Array.isArray(question.answers)) {
            question.answers = question.answers.map(answer => 
              typeof answer === 'string' ? normalizeTestText(answer) : answer
            );
          }
        });
        // ========================================

        // ========================================
        

        localStorage.setItem('testQuestions', JSON.stringify(questionsWithIndex));
        setData(questionsWithIndex);
      } catch {
        
        setFetchError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
        fetchCompletedRef.current = true;
      }
    };
  
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialData, stableRouterData]);


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


  useEffect(() => {
    const cleanup = setupVisibilityHandling();
    return cleanup;
  }, []);


  useEffect(() => {
    if (!isSubmitted || data.length === 0) return;

    const missing: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (typeof gradingResults[i] === 'undefined') missing.push(i);
    }
    if (missing.length === 0) return;

    const newResults: GradingResults = {};


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
    const fuzzyGrade = (student: string, corrects: (string | number)[]): number => {
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

    missing.forEach((i) => {
      const q = data[i];
      const ans = userAnswers[i] || [];
      if (q?.options && q.options.length > 0) {
        const frac = calculateMCQScore(q, ans);
        newResults[i] = frac;
      } else {
        const val = ans[0];
        if (val && Array.isArray(q?.answers) && q.answers.length > 0) {
          newResults[i] = fuzzyGrade(String(val), q.answers);
        } else {
          newResults[i] = 0;
        }
      }
    });

    if (Object.keys(newResults).length > 0) {
      setGradingResults(prev => ({ ...prev, ...newResults }));
    }
  }, [isSubmitted, data, userAnswers, gradingResults, setGradingResults]);


  useEffect(() => {
    return () => {
      try { pauseTestSession(); } catch {}
    };
  }, []);


  useEffect(() => {
    try { resumeFromPause(); } catch {}
  }, []);


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


  useEffect(() => {
    try { localStorage.setItem('testGradingResults', JSON.stringify(gradingResults)); } catch {}
  }, [gradingResults]);

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
        

        if (answer.length > 0 && answer[0] !== null) {
          mcqTotal += 1;
        }
        

        const frac = calculateMCQScore(question, answer);
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

      frqsToGrade.forEach(item => {
        setGradingFRQs(prev => ({ ...prev, [item.index]: true }));
      });
      

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

    try {
      const assignmentIdStr = localStorage.getItem('currentAssignmentId');
      if (assignmentIdStr) {
        const assignmentId = Number(assignmentIdStr);
        const name = (user?.user_metadata?.name || user?.email || '').toString();
        await fetch('/api/assignments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId, userId: user?.id || null, name, eventName: routerData.eventName, score: mcqScore, detail: { total: mcqTotal } })
        });
        localStorage.removeItem('currentAssignmentId');
      }
    } catch {}
  }, [data, userAnswers, gradingResults, routerData]);

  const reloadQuestions = async () => {
    setIsResetting(true);
    setFetchError(null);
    
    try {
      const total = parseInt(routerData.questionCount || '10');
      const idPctRaw = (routerData as any).idPercentage;
      const idPct = typeof idPctRaw !== 'undefined' ? Math.max(0, Math.min(100, parseInt(idPctRaw))) : 0;
      const supportsId = routerData.eventName === 'Rocks and Minerals' || 
                        routerData.eventName === 'Entomology' ||
                        routerData.eventName === 'Anatomy - Nervous' ||
                        routerData.eventName === 'Anatomy - Endocrine' ||
                        routerData.eventName === 'Anatomy - Sense Organs' ||
                        routerData.eventName === 'Dynamic Planet - Oceanography' ||
                        routerData.eventName === 'Remote Sensing' ||
                        routerData.eventName === 'Circuit Lab' ||
                        routerData.eventName === 'Astronomy';
      const requestedIdCount = Math.round((idPct / 100) * total);
      const idCount = supportsId ? requestedIdCount : 0;
      const baseCount = Math.max(0, total - idCount);

      let selectedQuestions: Question[] = [];

      // 1) base (non-id) questions from regular endpoint
      if (baseCount > 0) {
        const requestCount = Math.max(baseCount, 50);
        const params = buildApiParams({ ...routerData }, requestCount);
        const apiUrl = `${api.questions}?${params}`;
        
        let apiResponse: any = null;
        

        const isOffline = !navigator.onLine;
        if (isOffline) {

          const evt = routerData.eventName as string | undefined;
          if (evt) {
            const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const cached = await getEventOfflineQuestions(slug);
            if (Array.isArray(cached) && cached.length > 0) {

              const typesSel = (routerData.types as string) || 'multiple-choice';
              const filtered = typesSel === 'multiple-choice'
                ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                : typesSel === 'free-response'
                  ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                  : cached;
              apiResponse = { success: true, data: filtered };
            }
          }
          if (!apiResponse) throw new Error('No offline data available for this event. Please download it first.');
        } else {

          let response: Response | null = null;
          try { response = await fetch(apiUrl); } catch { response = null; }
          
          if (response && response.ok) {
            apiResponse = await response.json();
          } else {

            const evt = routerData.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {

                const typesSel = (routerData.types as string) || 'multiple-choice';
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
        }
        
        const allQuestions = apiResponse.data || [];
        const questions: Question[] = allQuestions;
        selectedQuestions = shuffleArray(questions).slice(0, baseCount);
      }

      // 2) id questions from new endpoint for supported events
      if (idCount > 0) {
        const isOffline = !navigator.onLine;
        let source: any[] = [];
        
        if (isOffline) {

          console.log('ID questions not available in offline mode');
        } else {

          try {
            const params = new URLSearchParams();
            params.set('event', routerData.eventName || '');
            params.set('limit', String(Math.max(idCount * 3, 50)));
            

            if (routerData.subtopics && routerData.subtopics.length > 0) {
              params.set('subtopics', routerData.subtopics.join(','));
            }
            
            const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
            const json = await resp.json();
            source = Array.isArray(json?.data) ? json.data : [];
          } catch {
            console.log('Failed to fetch ID questions, continuing without them');
          }
        }
        

        const typesSel = (routerData.types as string) || 'multiple-choice';
        const filtered = source.filter((row: any) => {
          const isMcq = Array.isArray(row.options) && row.options.length > 0;
          if (typesSel === 'multiple-choice') return isMcq;
          if (typesSel === 'free-response') return !isMcq;
          return true; // both
        });
        const idQuestions: Question[] = filtered.map((row: any) => ({
          id: row.id,
          question: row.question,
          options: row.options || [],
          answers: row.answers || [],
          difficulty: row.difficulty ?? 0.5,
          event: row.event,
          subtopics: row.subtopics || [],
          imageData: Array.isArray(row.images) && row.images.length ? row.images[Math.floor(Math.random()*row.images.length)] : undefined,
        }));

        const pickedId = shuffleArray(idQuestions).slice(0, idCount);

        selectedQuestions = selectedQuestions.concat(pickedId);
      }


      if (selectedQuestions.length < total && baseCount > 0) {
        const need = total - selectedQuestions.length;
        const isOffline = !navigator.onLine;
        
        if (isOffline) {

          console.log(`Offline mode: only ${selectedQuestions.length} questions available, need ${total}`);
        } else {

          try {
            const requestCount = Math.max(need, 50);
            const params2 = buildApiParams({ ...routerData }, requestCount);
            const apiUrl2 = `${api.questions}?${params2}`;
            const r2 = await fetch(apiUrl2).catch(() => null);
            const j2 = r2 && r2.ok ? await r2.json() : null;
            const extras: Question[] = (j2?.data || []);
            selectedQuestions = selectedQuestions.concat(shuffleArray(extras).slice(0, need));
          } catch {
            console.log('Failed to fetch additional questions for top-up');
          }
        }
      }


      const finalQuestions = shuffleArray(selectedQuestions).slice(0, total);
      
      // ========================================



      // ========================================
      finalQuestions.forEach(question => {

        if (question.question) {
          question.question = normalizeQuestionText(question.question);
        }
        

        if (Array.isArray(question.options)) {
          question.options = question.options.map(option => 
            typeof option === 'string' ? normalizeTestText(option) : option
          );
        }
        

        if (Array.isArray(question.answers)) {
          question.answers = question.answers.map(answer => 
            typeof answer === 'string' ? normalizeTestText(answer) : answer
          );
        }
      });
      // ========================================

      // ========================================
      
      setData(finalQuestions);
      localStorage.setItem('testQuestions', JSON.stringify(finalQuestions));
      
    } catch (error) {
      console.error('Error reloading questions:', error);
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
    const fetchReplacement = async (): Promise<Question | null> => {
      try {
        const typesSel = (routerData.types as string) || 'multiple-choice';
        const requestCount = 50;
        const params = buildApiParams({ ...routerData }, requestCount);
        const apiUrl = `${api.questions}?${params}`;

        const existingQuestions = data.map(q => q.question);
        const isOffline = !navigator.onLine;
        let pool: Question[] = [];

        if (isOffline) {
          const evt = routerData.eventName as string | undefined;
          if (evt) {
            const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const cached = await getEventOfflineQuestions(slug);
            if (Array.isArray(cached) && cached.length > 0) {
              const filtered = typesSel === 'multiple-choice'
                ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                : typesSel === 'free-response'
                  ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                  : cached;
              pool = filtered;
            }
          }
        } else {
          let response: Response | null = null;
          try { response = await fetch(apiUrl); } catch { response = null; }
          if (response && response.ok) {
            const j = await response.json();
            pool = (j?.data || []) as Question[];
          } else {
            const evt = routerData.eventName as string | undefined;
            if (evt) {
              const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const cached = await getEventOfflineQuestions(slug);
              if (Array.isArray(cached) && cached.length > 0) {
                const filtered = typesSel === 'multiple-choice'
                  ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                  : typesSel === 'free-response'
                    ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                    : cached;
                pool = filtered;
              }
            }
          }
        }

        const candidates = (pool as Question[]).filter(q => !existingQuestions.includes(q.question));
        if (candidates.length === 0) return null;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return pick;
      } catch {
        return null;
      }
    };

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
        // fallback to original removal behavior
        setData(prevData => {
          const newData = prevData.filter((_, index) => index !== questionIndex);
          setTimeout(() => {
            localStorage.setItem('testQuestions', JSON.stringify(newData));
          }, 0);
          return newData;
        });

        setUserAnswers(prevAnswers => {
          const newAnswers: Record<number, (string | null)[] | null> = {};
          Object.keys(prevAnswers).forEach(key => {
            const index = parseInt(key);
            if (index < questionIndex) newAnswers[index] = prevAnswers[index];
            else if (index > questionIndex) newAnswers[index - 1] = prevAnswers[index];
          });
          setTimeout(() => {
            localStorage.setItem('testUserAnswers', JSON.stringify(newAnswers));
          }, 0);
          return newAnswers;
        });

        setGradingResults(prevResults => {
          const newResults: GradingResults = {};
          Object.keys(prevResults).forEach(key => {
            const index = parseInt(key);
            if (index < questionIndex) newResults[index] = prevResults[index];
            else if (index > questionIndex) newResults[index - 1] = prevResults[index];
          });
          return newResults;
        });

        setExplanations(prevExplanations => {
          const newExplanations: Explanations = {};
          Object.keys(prevExplanations).forEach(key => {
            const index = parseInt(key);
            if (index < questionIndex) newExplanations[index] = prevExplanations[index];
            else if (index > questionIndex) newExplanations[index - 1] = prevExplanations[index];
          });
          return newExplanations;
        });

        setLoadingExplanation(prevLoading => {
          const newLoading: LoadingExplanation = {};
          Object.keys(prevLoading).forEach(key => {
            const index = parseInt(key);
            if (index < questionIndex) newLoading[index] = prevLoading[index];
            else if (index > questionIndex) newLoading[index - 1] = prevLoading[index];
          });
          return newLoading;
        });
      }
    })();
  };

  const handleEditOpen = (question: Question) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (editedQuestion: Question, reason: string, originalQuestion: Question, aiBypass?: boolean, aiSuggestion?: { question: string; options?: string[]; answers: string[]; answerIndices?: number[] }): Promise<{ success: boolean; message: string; reason: string; }> => {
    try {
      console.log('🔍 [TEST] Edit submit with aiBypass:', aiBypass, 'aiSuggestion:', aiSuggestion);
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
