'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import logger from '@/lib/utils/logger';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { Question } from '@/app/utils/geminiService';
import { buildAbsoluteUrl, normalizeQuestionMedia } from '../utils/questionMedia';
import { fetchIdQuestionsForParams } from '../utils/idFetch';
import { updateMetrics } from '@/app/utils/metrics';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import {
  RouterParams,
  GradingResults,
  Explanations,
  LoadingExplanation,
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
} from '@/app/utils/timeManagement';
import { usePauseOnUnmount, useResumeOnMount, useSetupVisibility } from './utils/timeHooks';
import api from '../../api';
import { getEventOfflineQuestions } from '@/app/utils/storage';
import { normalizeTestText, normalizeQuestionText, normalizeOptionAnswerLabels } from '../utils/normalizeTestText';
import { difficultyRanges } from '@/app/utils/questionUtils';

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
    // Prefer locally stored questions over SSR on reload to resume tests
    if (!ssrAppliedRef.current) {
      try {
        const stored = localStorage.getItem('testQuestions');
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasQs = Array.isArray(parsed) && parsed.length > 0;
          if (hasQs) {
            const normalized = normalizeQuestionMedia(parsed as Question[]);
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
      // If the event supports ID questions and types require images, prefetch ID questions to ensure image items present on first load
      const paramsStr = localStorage.getItem('testParams');
      const routerParams = (initialRouterData && Object.keys(initialRouterData).length > 0)
        ? initialRouterData
        : (paramsStr ? JSON.parse(paramsStr) : {});
      const total = parseInt((routerParams?.questionCount as string) || '10');
      const idPctRaw = (routerParams as any)?.idPercentage;
      const idPct = typeof idPctRaw !== 'undefined' ? Math.max(0, Math.min(100, parseInt(idPctRaw))) : 0;
      const requestedIdCount = Math.round((idPct / 100) * total);
      // const baseCount = Math.max(0, total - requestedIdCount);
      const useId = requestedIdCount > 0;

      (async () => {
        // Normalize and tag base
        const baseQs = normalizeQuestionMedia((initialData as Question[]).map((q, idx) => ({ ...q, originalIndex: idx })));
        if (!useId) {
          setData(baseQs);
          try { localStorage.setItem('testQuestions', JSON.stringify(baseQs)); } catch {}
          setIsLoading(false);
          fetchCompletedRef.current = true;
          return;
        }
        try {
          const idQs = await fetchIdQuestionsForParams(routerParams, requestedIdCount);
          const { mergeBaseAndIdQuestions } = await import('./utils/mergeQuestions');
          const merged = mergeBaseAndIdQuestions(baseQs, idQs, total);
          setData(merged);
          localStorage.setItem('testQuestions', JSON.stringify(merged));
        } catch {
          setData(baseQs);
        } finally {
          setIsLoading(false);
          fetchCompletedRef.current = true;
        }
      })();
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
      const filled: Record<number, (string | null)[] | null> = {};
      const grades: GradingResults = {};
      data.forEach((q, i) => {
        if (Array.isArray(q.options) && q.options.length > 0) {
          const answerList = Array.isArray(q.answers) ? q.answers : [q.answers];
          const picks: string[] = [];
          for (const ans of answerList) {
            if (typeof ans === 'string') {
              if (ans) picks.push(ans);
            } else if (typeof ans === 'number' && q.options && ans >= 0 && ans < q.options.length) {
              const val = q.options[ans] as string;
              if (val) picks.push(val);
            }
          }
          // Ensure at least one pick for malformed data
          if (picks.length === 0) {
            const first = typeof answerList[0] === 'number' && q.options
              ? (q.options[answerList[0] as number] as string)
              : String(answerList[0] ?? '');
            filled[i] = [first];
          } else {
            filled[i] = picks;
          }
          grades[i] = 3; // mark as fully correct
        } else {
          const corrects = Array.isArray(q.answers) ? q.answers : [q.answers];
          const first = corrects.length > 0 ? String(corrects[0] ?? '') : '';
          filled[i] = [first];
          grades[i] = 1;
        }
      });
      setUserAnswers(filled);
      setGradingResults(grades);
      setIsSubmitted(true);
      localStorage.setItem('testUserAnswers', JSON.stringify(filled));
      localStorage.setItem('testGradingResults', JSON.stringify(grades));
    } catch {}
  }, [isPreviewMode, data, isSubmitted]);


  useEffect(() => {
    

    localStorage.removeItem('testFromBookmarks');
    

    if (fetchStartedRef.current || fetchCompletedRef.current || data.length > 0 || isLoading === false) {
      return;
    }
    
    fetchStartedRef.current = true;


    const storedParams = localStorage.getItem('testParams');
    const hasInitial = stableRouterData && Object.keys(stableRouterData).length > 0;
    const routerParams = hasInitial
      ? stableRouterData
      : (storedParams ? JSON.parse(storedParams) : {});
    logger.log('init routerParams', { hasInitial, routerParams, hasStoredParams: !!storedParams });
    if (!routerParams || Object.keys(routerParams).length === 0) {
      logger.warn('empty routerParams; staying on page with friendly message');
      setFetchError('No test parameters found. Go to Practice to start a test.');
      setIsLoading(false);
      fetchCompletedRef.current = true;
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
        const storedQuestions = localStorage.getItem('testQuestions');
        if (storedQuestions) {
          try {
            const parsedQuestions = JSON.parse(storedQuestions);
            if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
              setData(normalizeQuestionMedia(parsedQuestions));
              setIsLoading(false);
              fetchCompletedRef.current = true;
              logger.log('resume submitted test from localStorage', { count: parsedQuestions.length });
              return;
            }
          } catch {}
        }
      }
    }

    const storedQuestions = localStorage.getItem('testQuestions');
    const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';

    // Prefer explicitly shared/local stored questions (from share code) over SSR initialData
    if (storedQuestions) {
      try {
      const parsedQuestions = JSON.parse(storedQuestions);
        const hasQuestions = Array.isArray(parsedQuestions) && parsedQuestions.length > 0;
        if (hasQuestions) {
          setData(normalizeQuestionMedia(parsedQuestions));
      setIsLoading(false);
      fetchCompletedRef.current = true;
          logger.log('loaded questions from localStorage', { count: parsedQuestions.length });
      return;
        } else {
          // Ignore empty cache
          logger.warn('ignoring empty testQuestions cache');
          localStorage.removeItem('testQuestions');
        }
      } catch {}
    }

    if (Array.isArray(initialData) && initialData.length > 0) {
      setData(normalizeQuestionMedia(initialData as Question[]));
        setIsLoading(false);
        fetchCompletedRef.current = true;
      logger.log('using initialData from SSR', { count: initialData.length });
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
          logger.error('Error loading bookmarked questions:', error);
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
      logger.log('fetchData start');
      try {
        const total = parseInt(routerParams.questionCount || '10');
        const idPctRaw = (routerParams as any).idPercentage;
        const idPct = typeof idPctRaw !== 'undefined' ? Math.max(0, Math.min(100, parseInt(idPctRaw))) : 0;
        const supportsId = (() => {
          const name = routerParams.eventName;
          const base = typeof name === 'string' ? name.split(' - ')[0] : '';
          
          // Map event names to their supported base names for ID questions
          const supportedEvents = new Set([
            'Rocks and Minerals',
            'Entomology', 
            'Anatomy & Physiology',
            'Dynamic Planet',
            'Water Quality',
            'Remote Sensing',
            'Circuit Lab',
            'Astronomy',
            'Designer Genes',
            'Forensics'
          ]);
          
          // Handle anatomy events specifically (they use "Anatomy - ..." format but map to "Anatomy & Physiology")
          if (base === 'Anatomy') {
            return supportedEvents.has('Anatomy & Physiology');
          }
          
          return supportedEvents.has(name) || supportedEvents.has(base);
        })();
        const requestedIdCount = Math.round((idPct / 100) * total);
        const idCount = supportsId ? requestedIdCount : 0;
        const baseCount = Math.max(0, total - idCount);
        

        let selectedQuestions: Question[] = [];

        // Special handling for Anatomy & Physiology: fetch pools per rotating subtopic
        const isAnatomy = (routerParams.eventName || '') === 'Anatomy & Physiology';
        if (isAnatomy) {
          const countTarget = Math.max(1, baseCount > 0 ? baseCount : total);
          const perThird = Math.max(1, Math.floor(countTarget / 3));
          const extra = Math.max(0, countTarget - 3 * perThird);
          const wants = [perThird + (extra > 0 ? 1 : 0), perThird + (extra > 1 ? 1 : 0), perThird];
          // const wantedTotal = wants.reduce((a, b) => a + b, 0);
          const requestCount = perThird;

          const fetchPoolFor = async (sub: string): Promise<Question[]> => {
            const params = buildApiParams({ ...routerParams, eventName: `Anatomy - ${sub}` }, requestCount);
            const apiUrl = `${api.questions}?${params}`;
            let pool: Question[] = [];
            try {
          logger.log(`Fetching Anatomy & Physiology questions`, { sub });
              const r = await fetch(apiUrl).catch((error) => {
                logger.error(`Failed to fetch questions for ${sub}:`, error);
                return null;
              });
              if (r && r.ok) {
                const j = await r.json();
                const all = (j?.data || []) as Question[];
                const typesSel = (routerParams.types as string) || 'multiple-choice';
                pool = all.filter((row: any) => {
                  const isMcq = Array.isArray(row.options) && row.options.length > 0;
                  if (typesSel === 'multiple-choice') return isMcq;
                  if (typesSel === 'free-response') return !isMcq;
                  return true;
                });
                // Shuffle pool to ensure variety across requests
                pool = shuffleArray(pool);
                logger.log(`Fetched questions for subtopic`, { sub, count: pool.length });
              } else {
                logger.error(`API request failed for subtopic`, { sub, status: r?.status, statusText: r?.statusText });
              }
            } catch (error) {
              logger.error(`Exception fetching questions for subtopic`, { sub, error });
            }
            return pool;
          };

          const [poolEndo, poolNerv, poolSense] = await Promise.all([
            fetchPoolFor('Endocrine'),
            fetchPoolFor('Nervous'),
            fetchPoolFor('Sense Organs'),
          ]);

          logger.log('Anatomy pools', { endocrine: poolEndo.length, nervous: poolNerv.length, sense: poolSense.length, wants });

          const normalizeText = (t: string) => normalizeQuestionText(t).trim().toLowerCase();
          const takenTexts = new Set<string>();
          const takeUniqueByText = (pool: Question[], count: number): Question[] => {
            const out: Question[] = [];
            for (const q of shuffleArray(pool)) {
              if (out.length >= count) break;
              const text = typeof q.question === 'string' ? normalizeText(q.question) : '';
              if (!text || takenTexts.has(text)) continue;
              takenTexts.add(text);
              out.push(q);
            }
            return out;
          };

          const pickedEndo = takeUniqueByText(poolEndo, wants[0]);
          const pickedNerv = takeUniqueByText(poolNerv, wants[1]);
          const pickedSense = takeUniqueByText(poolSense, wants[2]);

          let pickedAll = pickedEndo.concat(pickedNerv).concat(pickedSense);

          if (pickedAll.length < countTarget) {
            const deficit = countTarget - pickedAll.length;
            const leftovers = shuffleArray(poolEndo.concat(poolNerv, poolSense)).filter(q => {
              const text = typeof q.question === 'string' ? normalizeText(q.question) : '';
              return text && !takenTexts.has(text);
            });
            pickedAll = pickedAll.concat(leftovers.slice(0, deficit));
          }

          selectedQuestions = pickedAll.slice(0, countTarget);
          logger.log('Anatomy final picked', { selected: selectedQuestions.length });
        }

        // 1) base (non-id) questions from regular endpoint
        if (baseCount > 0 && !isAnatomy) {
          const requestCount = baseCount;
          const paramsObj = { ...routerParams } as any;
          // Ensure special hyphenated events map correctly to the API by passing base event and subtopics
          if (typeof paramsObj.eventName === 'string' && paramsObj.eventName.includes(' - ')) {
            const [baseName, sub] = paramsObj.eventName.split(' - ');
            paramsObj.eventName = baseName;
            if (sub) {
              paramsObj.subtopics = Array.isArray(paramsObj.subtopics) ? Array.from(new Set([sub, ...paramsObj.subtopics])) : [sub];
            }
          }
          const params = buildApiParams(paramsObj, requestCount);
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
          const questions: Question[] = normalizeQuestionMedia(allQuestions);
          logger.log('Question filtering counts', { total: allQuestions.length, filtered: questions.length });
          selectedQuestions = shuffleArray(questions).slice(0, baseCount);
        }

        // 2) id questions from new endpoint for supported events
        if (idCount > 0) {
          const isOffline = !navigator.onLine;
          let source: any[] = [];
          
          if (isOffline) {

            logger.log('ID questions not available in offline mode');
          } else {

            try {
              const params = new URLSearchParams();
              // Use the full event name for ID questions API
              params.set('event', routerParams.eventName || '');
              params.set('limit', String(idCount));
              
              // Add question type filtering directly to API call
              if (routerParams.types) {
                if (routerParams.types === 'multiple-choice') {
                  params.set('question_type', 'mcq');
                } else if (routerParams.types === 'free-response') {
                  params.set('question_type', 'frq');
                }
              }
              
              // Add difficulty filtering directly to API call
              if (routerParams.difficulties && routerParams.difficulties.length > 0) {
                const allRanges = routerParams.difficulties.map(d => difficultyRanges[d]).filter(Boolean);
                if (allRanges.length > 0) {
                  const minValue = Math.min(...allRanges.map(r => r.min));
                  const maxValue = Math.max(...allRanges.map(r => r.max));
                  params.set('difficulty_min', minValue.toFixed(2));
                  params.set('difficulty_max', maxValue.toFixed(2));
                }
              }
              
              // Add subtopics filtering
              if (routerParams.subtopics && routerParams.subtopics.length > 0) {
                params.set('subtopics', routerParams.subtopics.join(','));
              }
              
              const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
              const json = await resp.json();
              source = Array.isArray(json?.data) ? json.data : [];
              logger.log('ID API ok', { count: source.length, event: routerParams.eventName });
            } catch {
              logger.warn('Failed to fetch ID questions, continuing without them');
            }
          }
          

          // No need for client-side filtering since API now handles it
          logger.log('ID using from API', { count: source.length });
          const idQuestions: Question[] = source.map((row: any) => ({
            id: row.id,
            question: row.question,
            options: row.options || [],
            answers: row.answers || [],
            difficulty: row.difficulty ?? 0.5,
            event: row.event,
            subtopics: row.subtopics || [],
            imageData: buildAbsoluteUrl(Array.isArray(row.images) && row.images.length ? row.images[Math.floor(Math.random()*row.images.length)] : undefined),
          }));

          const pickedId = shuffleArray(idQuestions).slice(0, idCount);
          logger.log('ID selected', { picked: pickedId.length, total: idQuestions.length, requested: idCount });

          selectedQuestions = selectedQuestions.concat(pickedId);
        }


        if (selectedQuestions.length < total && baseCount > 0 && !(routerParams.eventName === 'Anatomy & Physiology')) {
          const need = total - selectedQuestions.length;
          const isOffline = !navigator.onLine;
          
          if (isOffline) {

            logger.log('Offline mode need top-up', { have: selectedQuestions.length, total });
          } else {

            try {
              const requestCount = need;
              const params2 = buildApiParams({ ...routerParams }, requestCount);
              const apiUrl2 = `${api.questions}?${params2}`;
              const r2 = await fetch(apiUrl2).catch(() => null);
              const j2 = r2 && r2.ok ? await r2.json() : null;
              const extras: Question[] = (j2?.data || []);
              selectedQuestions = selectedQuestions.concat(shuffleArray(extras).slice(0, need));
            } catch {
              logger.warn('Failed to fetch additional questions for top-up');
            }
          }
        }


        const dedupeByIdFinal = (arr: Question[]): Question[] => {
          const seen = new Set<string>();
          const out: Question[] = [];
          for (const q of arr) {
            const id = (q as any).id;
            if (id) {
              if (seen.has(id)) continue;
              seen.add(id);
            }
            out.push(q);
          }
          return out;
        };

        // Final dedupe by normalized question text to avoid repeats across pools
        const dedupeByTextFinal = (arr: Question[]): Question[] => {
          const seen = new Set<string>();
          const out: Question[] = [];
          for (const q of arr) {
            const text = typeof q.question === 'string' ? normalizeQuestionText(q.question).trim().toLowerCase() : '';
            if (text) {
              if (seen.has(text)) continue;
              seen.add(text);
            }
            out.push(q);
          }
          return out;
        };
        logger.log('Before deduplication', { count: selectedQuestions.length });
        selectedQuestions = dedupeByTextFinal(dedupeByIdFinal(selectedQuestions));
        logger.log('After deduplication', { count: selectedQuestions.length });
        const shuffledFinal = shuffleArray(selectedQuestions).slice(0, total);
        logger.log('Final slice count', { total, count: shuffledFinal.length });
        const questionsWithIndex = normalizeQuestionMedia(shuffledFinal).map((q, idx) => ({ ...q, originalIndex: idx }));
        
        // Special split for Anatomy & Physiology rotating subtopics across thirds
        try {
          if ((routerParams.eventName || '') === 'Anatomy & Physiology' && selectedQuestions.length === 0) {
            const thirds = Math.max(1, Math.floor(total / 3));
            const extra = total - 3 * thirds;
            const subA = 'Sense Organs';
            const subB = 'Nervous';
            const subC = 'Endocrine';
            const tag = (q: any) => Array.isArray(q.subtopics) && q.subtopics.some((s: string)=>[subA,subB,subC].includes(s));
            const withTags = questionsWithIndex.filter(tag);
            const withoutTags = questionsWithIndex.filter(q => !tag(q));
            const pick = (pool: any[], count: number, sub: string) => {
              const inSub = pool.filter(q => Array.isArray(q.subtopics) && q.subtopics.includes(sub));
              const taken = inSub.slice(0, count);
              return taken.length < count ? taken.concat(withoutTags.slice(0, count - taken.length)) : taken;
            };
            const a = pick(withTags, thirds + (extra>0?1:0), subA);
            const b = pick(withTags.filter(q=>!a.includes(q)), thirds + (extra>1?1:0), subB);
            const c = pick(withTags.filter(q=>!a.includes(q)&&!b.includes(q)), thirds, subC);
            const combined = a.concat(b).concat(c).slice(0, total);
            if (combined.length === total) {
              localStorage.setItem('testQuestions', JSON.stringify(combined));
              setData(combined as any);
              return;
            }
          }
        } catch {}
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
            // Strip leading labels (A./A)) if the whole list is sequential A, B, C ...
            const normalized = normalizeOptionAnswerLabels(
              question.options as string[],
              Array.isArray(question.answers) ? question.answers : []
            );
            question.options = normalized.options as any;
            if (Array.isArray(question.answers)) {
              question.answers = normalized.answers as any;
            }
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
      } catch (error) {
        logger.error('Failed to load questions:', error);
        logger.error('Router params:', routerParams);
        logger.error('Event name:', routerParams.eventName);
        logger.error('Is Anatomy & Physiology:', (routerParams.eventName || '') === 'Anatomy & Physiology');
        
        const errorMessage = routerParams.eventName === 'Anatomy & Physiology' 
          ? 'Failed to load Anatomy & Physiology questions. Check console for details.'
          : 'Failed to load questions. Please try again later.';
        setFetchError(errorMessage);
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
      

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const { gradeFrqBatch } = await import('./utils/grading');
      const scores = await gradeFrqBatch(frqsToGrade as any, online);
      scores.forEach((score, idx) => {
        const questionIndex = frqsToGrade[idx].index;
        setGradingResults(prev => ({ ...prev, [questionIndex]: score }));
        setGradingFRQs(prev => ({ ...prev, [questionIndex]: false }));
        mcqTotal += 1;
        mcqScore += Math.max(0, Math.min(1, score));
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
                        routerData.eventName === 'Astronomy' ||
                        routerData.eventName === 'Designer Genes' ||
                        routerData.eventName === 'Forensics';
      const requestedIdCount = Math.round((idPct / 100) * total);
      const idCount = supportsId ? requestedIdCount : 0;
      const baseCount = Math.max(0, total - idCount);

      let selectedQuestions: Question[] = [];

      // 1) base (non-id) questions from regular endpoint
      if (baseCount > 0) {
        const requestCount = baseCount;
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

          logger.log('ID questions not available in offline mode');
        } else {

          try {
            const params = new URLSearchParams();
            // Use the full event name for ID questions API
            params.set('event', routerData.eventName || '');
            params.set('limit', String(idCount));
            
            // Add question type filtering directly to API call
            if (routerData.types) {
              if (routerData.types === 'multiple-choice') {
                params.set('question_type', 'mcq');
              } else if (routerData.types === 'free-response') {
                params.set('question_type', 'frq');
              }
            }
            
            // Add difficulty filtering directly to API call
            if (routerData.difficulties && routerData.difficulties.length > 0) {
              const allRanges = routerData.difficulties.map(d => difficultyRanges[d]).filter(Boolean);
              if (allRanges.length > 0) {
                const minValue = Math.min(...allRanges.map(r => r.min));
                const maxValue = Math.max(...allRanges.map(r => r.max));
                params.set('difficulty_min', minValue.toFixed(2));
                params.set('difficulty_max', maxValue.toFixed(2));
              }
            }
            
            // Add subtopics filtering
            if (routerData.subtopics && routerData.subtopics.length > 0) {
              params.set('subtopics', routerData.subtopics.join(','));
            }
            
            const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
            const json = await resp.json();
            source = Array.isArray(json?.data) ? json.data : [];
            logger.log(`[ID QUESTIONS DEBUG - RELOAD] API returned ${source.length} questions for ${routerData.eventName} with filtering`);
          } catch {
            logger.log('Failed to fetch ID questions, continuing without them');
          }
        }
        

        // No need for client-side filtering since API now handles it
        logger.log(`[ID QUESTIONS DEBUG - RELOAD] Using all ${source.length} questions from API (filtering done server-side)`);
        const idQuestions: Question[] = source.map((row: any) => ({
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

          logger.log(`Offline mode: only ${selectedQuestions.length} questions available, need ${total}`);
        } else {

          try {
            const requestCount = need;
            const params2 = buildApiParams({ ...routerData }, requestCount);
            const apiUrl2 = `${api.questions}?${params2}`;
            const r2 = await fetch(apiUrl2).catch(() => null);
            const j2 = r2 && r2.ok ? await r2.json() : null;
            const extras: Question[] = (j2?.data || []);
            selectedQuestions = selectedQuestions.concat(shuffleArray(extras).slice(0, need));
          } catch {
            logger.log('Failed to fetch additional questions for top-up');
          }
        }
      }


      const finalQuestions = normalizeQuestionMedia(shuffleArray(selectedQuestions).slice(0, total));
      
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
          // Strip leading labels (A./A)) if the whole list is sequential A, B, C ...
          const normalized = normalizeOptionAnswerLabels(
            question.options as string[],
            Array.isArray(question.answers) ? question.answers : []
          );
          question.options = normalized.options as any;
          if (Array.isArray(question.answers)) {
            question.answers = normalized.answers as any;
          }
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
