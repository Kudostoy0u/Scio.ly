'use client';
import logger from '@/lib/utils/logger';


import { supabase } from '@/lib/supabase';
import type { DailyMetrics } from './metrics';


export interface HistoryRecord {
  questionsAttempted: number;
  correctAnswers: number;
  eventsPracticed: string[];
}

export interface DashboardData {
  metrics: DailyMetrics;
  historyData: Record<string, HistoryRecord>;
  greetingName: string;
}


const METRICS_PREFIX = 'metrics_';
const GREETING_NAME_KEY = 'scio_display_name';


const getTodayKey = (): string => new Date().toISOString().split('T')[0];


const getLocalGreetingName = (): string => {
  try {
    return localStorage.getItem(GREETING_NAME_KEY) || '';
  } catch {
    return '';
  }
};

const setLocalGreetingName = (name: string): void => {
  try {
    localStorage.setItem(GREETING_NAME_KEY, name);
  } catch {}
};

const getLocalDailyMetrics = (): DailyMetrics => {
  const today = getTodayKey();
  const defaultMetrics: DailyMetrics = {
    questionsAttempted: 0,
    correctAnswers: 0,
    eventsPracticed: [],
    eventQuestions: {},
    gamePoints: 0,
  };
  try {
    const raw = localStorage.getItem(`${METRICS_PREFIX}${today}`);
    return raw ? { ...defaultMetrics, ...JSON.parse(raw) } : defaultMetrics;
  } catch {
    return defaultMetrics;
  }
};

const setLocalDailyMetrics = (metrics: DailyMetrics): void => {
  const today = getTodayKey();
  try {
    localStorage.setItem(`${METRICS_PREFIX}${today}`, JSON.stringify(metrics));
  } catch {}
};

const getLocalHistory = (): Record<string, HistoryRecord> => {
  const historyData: Record<string, HistoryRecord> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (!key.startsWith(METRICS_PREFIX)) continue;
      
      const date = key.replace(METRICS_PREFIX, '');
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      
      try {
        const parsed = JSON.parse(raw) as DailyMetrics;
        historyData[date] = {
          questionsAttempted: parsed.questionsAttempted || 0,
          correctAnswers: parsed.correctAnswers || 0,
          eventsPracticed: parsed.eventsPracticed || [],
        };
      } catch {}
    }
  } catch {}
  
  return historyData;
};


const fetchUserStatsSince = async (userId: string, fromDate: string): Promise<any[]> => {
  const exec = async () => (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate);

  let { data, error } = await exec();
  if (error && (error as any).status && [401, 403].includes((error as any).status)) {
    try { 
      await supabase.auth.refreshSession(); 
    } catch {

      if (typeof window !== 'undefined') {
        const supabaseCookieNames = [
          'sb-access-token', 'sb-refresh-token', 'supabase-auth-token',
          'supabase-auth-refresh-token', 'supabase-auth-token-expires',
          'supabase-auth-refresh-token-expires', 'supabase-auth-token-type',
          'supabase-auth-token-user-id', 'supabase-auth-token-session-id',
          'supabase-auth-token-provider-token', 'supabase-auth-token-provider-refresh-token'
        ];
        
        supabaseCookieNames.forEach(cookieName => {
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname + ';';
        });
      }
    }
    const retry = await exec();
    data = retry.data; error = retry.error;
  }
  if (error) {
    logger.error('Error fetching user_stats since date:', error);
    return [];
  }
  return data || [];
};

const fetchDailyUserStatsRow = async (userId: string, date: string): Promise<any | null> => {
  const exec = async () => (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  let { data, error } = await exec();
  if (error && (error as any).status && [401, 403].includes((error as any).status)) {
    try { 
      await supabase.auth.refreshSession(); 
    } catch {

      if (typeof window !== 'undefined') {
        const supabaseCookieNames = [
          'sb-access-token', 'sb-refresh-token', 'supabase-auth-token',
          'supabase-auth-refresh-token', 'supabase-auth-token-expires',
          'supabase-auth-refresh-token-expires', 'supabase-auth-token-type',
          'supabase-auth-token-user-id', 'supabase-auth-token-session-id',
          'supabase-auth-token-provider-token', 'supabase-auth-token-provider-refresh-token'
        ];
        
        supabaseCookieNames.forEach(cookieName => {
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname + ';';
        });
      }
    }
    const retry = await exec();
    data = retry.data; error = retry.error;
  }
  if (error && (error as any).code !== 'PGRST116') {
    logger.error('Error fetching daily user_stats row:', error);
    return null;
  }
  return data || null;
};


export const syncDashboardData = async (userId: string | null): Promise<DashboardData> => {
  if (!userId) {

    const metrics = getLocalDailyMetrics();
    const historyData = getLocalHistory();
    const greetingName = getLocalGreetingName();
    
    return {
      metrics,
      historyData,
      greetingName,
    };
  }

  try {
    // 1. sync all historical data from supabase to localstorage
    const allRows = await fetchUserStatsSince(userId, '1970-01-01');
    if (Array.isArray(allRows)) {
      allRows.forEach((row: any) => {
        try {
          const key = `${METRICS_PREFIX}${row.date}`;
          const payload: DailyMetrics = {
            questionsAttempted: row.questions_attempted || 0,
            correctAnswers: row.correct_answers || 0,
            eventsPracticed: row.events_practiced || [],
            eventQuestions: row.event_questions || {},
            gamePoints: row.game_points || 0,
          };
          localStorage.setItem(key, JSON.stringify(payload));
        } catch {}
      });
    }

    // 2. ensure today's data is up to date
    const today = getTodayKey();
    const todayRow = await fetchDailyUserStatsRow(userId, today);
    if (todayRow) {
      const payload: DailyMetrics = {
        questionsAttempted: todayRow.questions_attempted || 0,
        correctAnswers: todayRow.correct_answers || 0,
        eventsPracticed: todayRow.events_practiced || [],
        eventQuestions: todayRow.event_questions || {},
        gamePoints: todayRow.game_points || 0,
      };
      setLocalDailyMetrics(payload);
    }

    // 3. sync greeting name
    try {
      if (!userId) {
        logger.warn('No userId provided for greeting name sync');
      } else if (typeof userId !== 'string' || userId.trim() === '') {
        logger.warn('Invalid userId for greeting name sync:', userId);
      } else {
        logger.log('Fetching user profile for greeting name, userId:', userId);
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, display_name')
          .eq('id', userId.trim())
          .maybeSingle();
        
        const firstName = (profile as any)?.first_name as string | undefined;
        const displayName = (profile as any)?.display_name as string | undefined;
        const chosen = (firstName && firstName.trim())
          ? firstName.trim()
          : (displayName && displayName.trim())
            ? displayName.trim().split(' ')[0]
            : '';
        
        if (chosen) {
          setLocalGreetingName(chosen);
        }
      }
    } catch {}

    // 4. return the synced data
    const metrics = getLocalDailyMetrics();
    const historyData = getLocalHistory();
    const greetingName = getLocalGreetingName();

    return {
      metrics,
      historyData,
      greetingName,
    };
  } catch (error) {
    logger.error('Error syncing dashboard data:', error);
    

    const metrics = getLocalDailyMetrics();
    const historyData = getLocalHistory();
    const greetingName = getLocalGreetingName();
    
    return {
      metrics,
      historyData,
      greetingName,
    };
  }
};

// Coalesce multiple concurrent sync requests per user into a single in-flight Promise
const userIdToInFlightSync: Record<string, Promise<DashboardData> | undefined> = {};
export const coalescedSyncDashboardData = async (userId: string | null): Promise<DashboardData> => {
  if (!userId) return syncDashboardData(userId);
  if (userIdToInFlightSync[userId]) return userIdToInFlightSync[userId] as Promise<DashboardData>;
  const p = syncDashboardData(userId)
    .catch((e) => { throw e; })
    .finally(() => { userIdToInFlightSync[userId] = undefined; });
  userIdToInFlightSync[userId] = p;
  return p;
};


export const getInitialDashboardData = (): DashboardData => {
  const metrics = getLocalDailyMetrics();
  const historyData = getLocalHistory();
  const greetingName = getLocalGreetingName();
  
  return {
    metrics,
    historyData,
    greetingName,
  };
};


export const updateDashboardMetrics = async (
  userId: string | null,
  updates: {
    questionsAttempted?: number;
    correctAnswers?: number;
    eventName?: string;
  }
): Promise<DailyMetrics | null> => {
  const attemptedDelta = Math.round(updates.questionsAttempted || 0);
  
  if (!userId) {

    const currentStats = getLocalDailyMetrics();
    const updatedStats: DailyMetrics = {
      ...currentStats,
      questionsAttempted: currentStats.questionsAttempted + attemptedDelta,
      correctAnswers: currentStats.correctAnswers + (updates.correctAnswers || 0),
      eventsPracticed: updates.eventName && !currentStats.eventsPracticed.includes(updates.eventName)
        ? [...currentStats.eventsPracticed, updates.eventName]
        : currentStats.eventsPracticed,
      eventQuestions: {
        ...currentStats.eventQuestions,
        ...(updates.eventName && attemptedDelta ? {
          [updates.eventName]: (currentStats.eventQuestions?.[updates.eventName] || 0) + attemptedDelta
        } : {})
      }
    };
    setLocalDailyMetrics(updatedStats);
    return updatedStats;
  }
  

  const today = getTodayKey();
  
  try {

    const currentData = await fetchDailyUserStatsRow(userId, today);
    const currentStats = currentData ? {
      questionsAttempted: currentData.questions_attempted || 0,
      correctAnswers: currentData.correct_answers || 0,
      eventsPracticed: currentData.events_practiced || [],
      eventQuestions: currentData.event_questions || {},
      gamePoints: currentData.game_points || 0,
    } : {
      questionsAttempted: 0,
      correctAnswers: 0,
      eventsPracticed: [],
      eventQuestions: {},
      gamePoints: 0,
    };


    const updatedStats = {
      user_id: userId,
      date: today,
      questions_attempted: currentStats.questionsAttempted + attemptedDelta,
      correct_answers: currentStats.correctAnswers + (updates.correctAnswers || 0),
      events_practiced: updates.eventName && !currentStats.eventsPracticed.includes(updates.eventName)
        ? [...currentStats.eventsPracticed, updates.eventName]
        : currentStats.eventsPracticed,
      event_questions: {
        ...currentStats.eventQuestions,
        ...(updates.eventName && attemptedDelta ? {
          [updates.eventName]: (currentStats.eventQuestions?.[updates.eventName] || 0) + attemptedDelta
        } : {})
      },
      game_points: currentStats.gamePoints
    };


    let { data, error } = await (supabase as any)
      .from('user_stats')
      .upsert(updatedStats as any, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      if ((error as any).status && [401, 403].includes((error as any).status)) {
        try { await supabase.auth.refreshSession(); } catch {}
        const retry = await (supabase as any)
          .from('user_stats')
          .upsert(updatedStats as any, { onConflict: 'user_id,date' })
          .select()
          .single();
        if (retry.error) {
          logger.error('Error updating metrics after refresh:', retry.error);
          return null;
        }
        data = retry.data;
        error = retry.error;
      } else {
        logger.error('Error updating metrics:', error);
        return null;
      }
    }


    const localMetrics: DailyMetrics = {
      questionsAttempted: data.questions_attempted,
      correctAnswers: data.correct_answers,
      eventsPracticed: data.events_practiced || [],
      eventQuestions: data.event_questions || {},
      gamePoints: data.game_points,
    };
    setLocalDailyMetrics(localMetrics);

    return localMetrics;
  } catch (error) {
    logger.error('Error updating metrics:', error);
    return null;
  }
};


export function resetAllLocalStorageExceptTheme(): void {
  try {
    const preservedTheme = localStorage.getItem('theme');
    localStorage.clear();
    if (preservedTheme !== null) {
      localStorage.setItem('theme', preservedTheme);
    }

    try { localStorage.removeItem(GREETING_NAME_KEY); } catch {}
    try { localStorage.removeItem('scio_chart_type'); } catch {}

    try { window.dispatchEvent(new CustomEvent('scio-display-name-updated', { detail: '' })); } catch {}
  } catch {}
}
