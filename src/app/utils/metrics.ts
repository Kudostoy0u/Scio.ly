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
  const localStats = localStorage.getItem(`metrics_${today}`);
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
  localStorage.setItem(`metrics_${today}`, JSON.stringify(metrics));
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
    const { data, error } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting metrics:', error);
      return defaultMetrics;
    }

    if (data) {
      return {
        questionsAttempted: data.questions_attempted,
        correctAnswers: data.correct_answers,
        eventsPracticed: data.events_practiced || [],
        eventQuestions: data.event_questions || {},
        gamePoints: data.game_points
      };
    }

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
    const { data, error } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', weekAgoString);

    if (error) {
      console.error('Error getting weekly metrics:', error);
      return null;
    }

    // Aggregate the weekly data
    const aggregated = data.reduce((acc, day) => ({
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
      eventsPracticed: [],
      eventQuestions: {},
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
    const { data, error } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', monthAgoString);

    if (error) {
      console.error('Error getting monthly metrics:', error);
      return null;
    }

    // Aggregate the monthly data
    const aggregated = data.reduce((acc, day) => ({
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
      eventsPracticed: [],
      eventQuestions: {},
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
  if (!userId) {
    const currentStats = getLocalMetrics();
    const updatedStats: DailyMetrics = {
      ...currentStats,
      questionsAttempted: currentStats.questionsAttempted + (updates.questionsAttempted || 0),
      correctAnswers: currentStats.correctAnswers + (updates.correctAnswers || 0),
      eventsPracticed: updates.eventName && !currentStats.eventsPracticed.includes(updates.eventName)
        ? [...currentStats.eventsPracticed, updates.eventName]
        : currentStats.eventsPracticed,
      eventQuestions: {
        ...currentStats.eventQuestions,
        ...(updates.eventName && updates.questionsAttempted ? {
          [updates.eventName]: (currentStats.eventQuestions?.[updates.eventName] || 0) + updates.questionsAttempted
        } : {})
      }
    };
    saveLocalMetrics(updatedStats);
    return updatedStats;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get current stats for today
    const { data: currentData, error: fetchError } = await (supabase as any)
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

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

    if (currentData && !fetchError) {
      currentStats = currentData;
    }

    const updatedEventsPracticed = updates.eventName && !currentStats.events_practiced.includes(updates.eventName)
      ? [...currentStats.events_practiced, updates.eventName]
      : currentStats.events_practiced;

    const updatedEventQuestions = {
      ...currentStats.event_questions,
      ...(updates.eventName && updates.questionsAttempted ? {
        [updates.eventName]: (currentStats.event_questions?.[updates.eventName] || 0) + updates.questionsAttempted
      } : {})
    };

    const updatedStats = {
      user_id: userId,
      date: today,
      questions_attempted: currentStats.questions_attempted + (updates.questionsAttempted || 0),
      correct_answers: currentStats.correct_answers + (updates.correctAnswers || 0),
      events_practiced: updatedEventsPracticed,
      event_questions: updatedEventQuestions,
      game_points: currentStats.game_points
    };

    const { data, error } = await (supabase as any)
      .from('user_stats')
      .upsert(updatedStats as any, { 
        onConflict: 'user_id,date' 
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating metrics:', error);
      return null;
    }

    // Also update leaderboard stats
    if (updates.questionsAttempted || updates.correctAnswers) {
      try {
        await updateLeaderboardStats(
          updates.questionsAttempted || 0,
          updates.correctAnswers || 0
        );
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