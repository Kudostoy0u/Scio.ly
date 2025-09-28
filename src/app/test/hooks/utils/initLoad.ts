import logger from '@/lib/utils/logger';
import { Question } from '@/app/utils/geminiService';
import { normalizeQuestionMedia } from '../../utils/questionMedia';
import { supabase } from '@/lib/supabase';
import { loadBookmarksFromSupabase } from '@/app/utils/bookmarks';
import {
  getCurrentTestSession,
  initializeTestSession,
  resumeTestSession,
  resetTestSession,
  migrateFromLegacyStorage,
} from '@/app/utils/timeManagement';
import { fetchQuestionsForParams } from './fetchQuestions';

type SetState<T> = (value: T) => void;

export async function initLoad({
  initialData,
  stableRouterData,
  setRouterData,
  setFetchError,
  setIsLoading,
  setData,
  setTimeLeft,
  fetchCompletedRef,
}: {
  initialData?: any[];
  stableRouterData: Record<string, any>;
  setRouterData: SetState<Record<string, any>>;
  setFetchError: SetState<string | null>;
  setIsLoading: SetState<boolean>;
  setData: SetState<Question[]>;
  setTimeLeft: SetState<number | null>;
  fetchCompletedRef: { current: boolean };
}): Promise<void> {
  localStorage.removeItem('testFromBookmarks');

  if (fetchCompletedRef.current) return;

  const storedParams = localStorage.getItem('testParams');
  const hasInitial = stableRouterData && Object.keys(stableRouterData).length > 0;
  const routerParams = hasInitial ? stableRouterData : (storedParams ? JSON.parse(storedParams) : {});
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
      // Reset and adopt new session
      const newSession = resetTestSession(eventName, timeLimit);
      try { setTimeLeft(newSession.timeState.timeLeft); } catch {}
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

  // Ensure timer is visible immediately
  try { if (session) setTimeLeft(session.timeState.timeLeft); } catch {}

  if (session?.isSubmitted) {
    const storedGrading = localStorage.getItem('testGradingResults');
    if (storedGrading) {
      try { /* touch parse to validate */ JSON.parse(storedGrading); } catch {}
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

  const storedQuestions = localStorage.getItem('testQuestions');
  const isFromBookmarks = localStorage.getItem('testFromBookmarks') === 'true';
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
    await loadBookmarkedQuestionsFromSupabase();
    return;
  }

  // Fallback to API fetch
  try {
    const total = parseInt(routerParams.questionCount || '10');
    const questions = await fetchQuestionsForParams(routerParams, total);
    localStorage.setItem('testQuestions', JSON.stringify(questions));
    setData(questions);
  } catch (error) {
    logger.error('Failed to load questions:', error);
    const errorMessage = routerParams.eventName === 'Anatomy & Physiology'
      ? 'Failed to load Anatomy & Physiology questions. Check console for details.'
      : 'Failed to load questions. Please try again later.';
    setFetchError(errorMessage);
  } finally {
    setIsLoading(false);
    fetchCompletedRef.current = true;
  }
}


