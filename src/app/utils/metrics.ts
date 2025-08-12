import { supabase } from '@/lib/supabase';
import { updateLeaderboardStats } from './leaderboardUtils';

export interface DailyMetrics {
  questionsAttempted: number;
  correctAnswers: number;
  eventsPracticed: string[];
  eventQuestions: Record<string, number>;
  gamePoints: number;
}

const getLocalMetrics = (): DailyMetrics => {
  const today = new Date().toISOString().split('T')[0];
  const localStats = typeof window !== 'undefined' ? localStorage.getItem(`metrics_${today}`) : null;
  const defaultMetrics = {
    questionsAttempted: 0,
    correctAnswers: 0,
    eventsPracticed: [],
    eventQuestions: {},
    gamePoints: 0
  };
  return localStats ? { ...defaultMetrics, ...JSON.parse(localStats) } : defaultMetrics;
};

const saveLocalMetrics = (metrics: DailyMetrics) => {
  const today = new Date().toISOString().split('T')[0];
  if (typeof window !== 'undefined') {
    localStorage.setItem(`metrics_${today}`, JSON.stringify(metrics));
  }
};

export const getDailyMetrics = async (userId: string | null): Promise<DailyMetrics | null> => {
  const defaultMetrics = {
    questionsAttempted: 0,
    correctAnswers: 0,
    eventsPracticed: [],
    eventQuestions: {},
    gamePoints: 0
  };

  if (!userId) {
    return getLocalMetrics();
  }
  
  const today = new Date().toISOString().split('T')[0];

  try {
    const row = await fetchDailyUserStatsRow(userId, today);
    if (row) {
      const synced: DailyMetrics = {
        questionsAttempted: row.questions_attempted,
        correctAnswers: row.correct_answers,
        eventsPracticed: row.events_practiced || [],
        eventQuestions: row.event_questions || {},
        gamePoints: row.game_points,
      };
      saveLocalMetrics(synced);
      return synced;
    }
    saveLocalMetrics(defaultMetrics);
    return defaultMetrics;
  } catch (error) {
    console.error('Error getting metrics:', error);
    return defaultMetrics;
  }
};

export const getWeeklyMetrics = async (userId: string | null): Promise<DailyMetrics | null> => {
  if (!userId) return null;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoString = weekAgo.toISOString().split('T')[0];

  try {
    const data = await fetchUserStatsSince(userId, weekAgoString);
    // Aggregate the weekly data
    const aggregated = data.reduce((acc: DailyMetrics, day) => ({
      questionsAttempted: acc.questionsAttempted + day.questions_attempted,
      correctAnswers: acc.correctAnswers + day.correct_answers,
      eventsPracticed: [...new Set([...acc.eventsPracticed, ...(day.events_practiced || [])])],
      eventQuestions: Object.keys(day.event_questions || {}).reduce((eventAcc, event) => {
        eventAcc[event] = (eventAcc[event] || 0) + (day.event_questions[event] || 0);
        return eventAcc;
      }, acc.eventQuestions),
      gamePoints: acc.gamePoints + day.game_points
    }), {
      questionsAttempted: 0,
      correctAnswers: 0,
      eventsPracticed: [] as string[],
      eventQuestions: {} as Record<string, number>,
      gamePoints: 0
    });

    return aggregated;
  } catch (error) {
    console.error('Error getting weekly metrics:', error);
    return null;
  }
};

export const getMonthlyMetrics = async (userId: string | null): Promise<DailyMetrics | null> => {
  if (!userId) return null;

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAgoString = monthAgo.toISOString().split('T')[0];

  try {
    const data = await fetchUserStatsSince(userId, monthAgoString);
    // Aggregate the monthly data
    const aggregated = data.reduce((acc: DailyMetrics, day) => ({
      questionsAttempted: acc.questionsAttempted + day.questions_attempted,
      correctAnswers: acc.correctAnswers + day.correct_answers,
      eventsPracticed: [...new Set([...acc.eventsPracticed, ...(day.events_practiced || [])])],
      eventQuestions: Object.keys(day.event_questions || {}).reduce((eventAcc, event) => {
        eventAcc[event] = (eventAcc[event] || 0) + (day.event_questions[event] || 0);
        return eventAcc;
      }, acc.eventQuestions),
      gamePoints: acc.gamePoints + day.game_points
    }), {
      questionsAttempted: 0,
      correctAnswers: 0,
      eventsPracticed: [] as string[],
      eventQuestions: {} as Record<string, number>,
      gamePoints: 0
    });

    return aggregated;
  } catch (error) {
    console.error('Error getting monthly metrics:', error);
    return null;
  }
};

export const updateMetrics = async (
  userId: string | null,
  updates: {
    questionsAttempted?: number;
    correctAnswers?: number;
    eventName?: string;
  }
): Promise<DailyMetrics | null> => {
  // Normalize incoming values to integers for storage/leaderboards
  const attemptedDelta = Math.round(updates.questionsAttempted || 0);
  const correctDelta = Math.round(updates.correctAnswers || 0);
  if (!userId) {
    const currentStats = getLocalMetrics();
    const updatedStats: DailyMetrics = {
      ...currentStats,
      questionsAttempted: currentStats.questionsAttempted + attemptedDelta,
      // Preserve fractional credit locally for anonymous users
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
    saveLocalMetrics(updatedStats);
    return updatedStats;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get current stats for today
    const currentData = await fetchDailyUserStatsRow(userId, today);

    let currentStats: {
      questions_attempted: number;
      correct_answers: number;
      events_practiced: string[];
      event_questions: Record<string, number>;
      game_points: number;
    } = {
      questions_attempted: 0,
      correct_answers: 0,
      events_practiced: [],
      event_questions: {},
      game_points: 0
    };

    if (currentData) {
      currentStats = currentData;
    }

    const updatedEventsPracticed = updates.eventName && !currentStats.events_practiced.includes(updates.eventName)
      ? [...currentStats.events_practiced, updates.eventName]
      : currentStats.events_practiced;

    const updatedEventQuestions = {
      ...currentStats.event_questions,
      ...(updates.eventName && attemptedDelta ? {
        [updates.eventName]: (currentStats.event_questions?.[updates.eventName] || 0) + attemptedDelta
      } : {})
    };

    const updatedStats = {
      user_id: userId,
      date: today,
      questions_attempted: currentStats.questions_attempted + attemptedDelta,
      correct_answers: currentStats.correct_answers + correctDelta,
      events_practiced: updatedEventsPracticed,
      event_questions: updatedEventQuestions,
      game_points: currentStats.game_points
    };

    let data;
    {
      const { data: upserted, error } = await (supabase as any)
        .from('user_stats')
        .upsert(updatedStats as any, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error && (error as any).status && [401, 403].includes((error as any).status)) {
        try { await supabase.auth.refreshSession(); } catch {}
        const retry = await (supabase as any)
          .from('user_stats')
          .upsert(updatedStats as any, { onConflict: 'user_id,date' })
          .select()
          .single();
        if (retry.error) {
          console.error('Error updating metrics after refresh:', retry.error);
          return null;
        }
        data = retry.data;
      } else if (error) {
        console.error('Error updating metrics:', error);
        return null;
      } else {
        data = upserted;
      }
    }
    // Mirror to localStorage for identical anonymous experience
    saveLocalMetrics({
      questionsAttempted: updatedStats.questions_attempted,
      // Persist the rounded integer daily for parity with DB
      correctAnswers: updatedStats.correct_answers,
      eventsPracticed: updatedStats.events_practiced,
      eventQuestions: updatedStats.event_questions,
      gamePoints: updatedStats.game_points,
    });

    // Also update leaderboard stats (centralized here)
    if (attemptedDelta || correctDelta) {
      try {
        await updateLeaderboardStats(attemptedDelta, correctDelta);
      } catch (leaderboardError) {
        console.error('Error updating leaderboard stats:', leaderboardError);
        // Don't fail the whole operation if leaderboard update fails
      }
    }

    return {
      questionsAttempted: data.questions_attempted,
      correctAnswers: data.correct_answers,
      eventsPracticed: data.events_practiced || [],
      eventQuestions: data.event_questions || {},
      gamePoints: data.game_points
    };
  } catch (error) {
    console.error('Error updating metrics:', error);
    return null;
  }
};

// ---------- Internal helpers with auth refresh & retry ----------

type UserStatsRow = {
  user_id: string;
  date: string;
  questions_attempted: number;
  correct_answers: number;
  events_practiced: string[];
  event_questions: Record<string, number>;
  game_points: number;
};

export async function fetchDailyUserStatsRow(userId: string, date: string): Promise<UserStatsRow | null> {
  const exec = async () => (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  let { data, error } = await exec();
  if (error && (error as any).status && [401, 403].includes((error as any).status)) {
    try { await supabase.auth.refreshSession(); } catch {}
    const retry = await exec();
    data = retry.data; error = retry.error;
  }
  if (error && (error as any).code !== 'PGRST116') {
    console.error('Error fetching daily user_stats row:', error);
    return null;
  }
  return data || null;
}

export async function fetchUserStatsSince(userId: string, fromDate: string): Promise<UserStatsRow[]> {
  const exec = async () => (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromDate);

  let { data, error } = await exec();
  if (error && (error as any).status && [401, 403].includes((error as any).status)) {
    try { await supabase.auth.refreshSession(); } catch {}
    const retry = await exec();
    data = retry.data; error = retry.error;
  }
  if (error) {
    console.error('Error fetching user_stats since date:', error);
    return [];
  }
  return data || [];
}