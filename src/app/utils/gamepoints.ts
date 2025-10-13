import { supabase } from '@/lib/supabase';
import { getDailyMetrics, DailyMetrics } from './metrics';

/**
 * Game points management utilities for Science Olympiad platform
 * Provides comprehensive game points tracking, updates, and analytics
 */

/**
 * Saves daily metrics to localStorage
 * 
 * @param {DailyMetrics} metrics - Daily metrics to save
 */
const saveLocalMetrics = (metrics: DailyMetrics) => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`metrics_${today}`, JSON.stringify(metrics));
};

/**
 * Updates the game points for the current day
 * Handles both authenticated and anonymous users
 * 
 * @param {string | null} userId - The user's ID, or null for anonymous users
 * @param {number} pointsChange - The amount to change the game points by (e.g., 1, -1, 0)
 * @returns {Promise<DailyMetrics | null>} The updated DailyMetrics or null if an error occurs
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const updatedMetrics = await updateGamePoints('user-123', 10);
 * console.log(updatedMetrics?.gamePoints); // Updated game points
 * ```
 */
export const updateGamePoints = async (
  userId: string | null,
  pointsChange: number
): Promise<DailyMetrics | null> => {

  const currentMetrics = await getDailyMetrics(userId);


  if (!currentMetrics) {
    console.error('Could not fetch current metrics to update game points.');
    return null;
  }

  const updatedMetrics: DailyMetrics = {
    ...currentMetrics,
    gamePoints: (currentMetrics.gamePoints || 0) + pointsChange,
  };


  if (!userId) {

    saveLocalMetrics(updatedMetrics);
    return updatedMetrics;
  } else {

    const today = new Date().toISOString().split('T')[0];
    try {

    const { error } = await (supabase as any)
        .from('user_stats')
        .upsert({
          user_id: userId,
          date: today,
          questions_attempted: updatedMetrics.questionsAttempted,
          correct_answers: updatedMetrics.correctAnswers,
          events_practiced: updatedMetrics.eventsPracticed,
          event_questions: updatedMetrics.eventQuestions,
          game_points: updatedMetrics.gamePoints
        } as any, { 
        onConflict: 'user_id,date' 
        })
        .select()
        .single();

      if (error) {
        if ((error as any).status && [401, 403].includes((error as any).status)) {
          try { await supabase.auth.refreshSession(); } catch {}
          const retry = await (supabase as any)
            .from('user_stats')
            .upsert({
              user_id: userId,
              date: today,
              questions_attempted: updatedMetrics.questionsAttempted,
              correct_answers: updatedMetrics.correctAnswers,
              events_practiced: updatedMetrics.eventsPracticed,
              event_questions: updatedMetrics.eventQuestions,
              game_points: updatedMetrics.gamePoints
            } as any, { onConflict: 'user_id,date' })
            .select()
            .single();
          if (retry.error) {
            console.error('Error updating game points in Supabase after refresh:', retry.error);
            return null;
          }
        } else {
          console.error('Error updating game points in Supabase:', error);
          return null;
        }
      }


      await (supabase as any)
        .from('game_points')
        .insert({
          user_id: userId,
          points: pointsChange,
          source: 'game_activity',
          description: `Game points ${pointsChange > 0 ? 'earned' : 'spent'}: ${Math.abs(pointsChange)} points`
        });

      return updatedMetrics;
    } catch (error) {
      console.error('Error updating game points in Supabase:', error);
      return null;
    }
  }
};

/**
 * Sets the game points for a specific user for the current day directly
 * Intended for admin use and direct score management
 * 
 * @param {string} userId - The user's ID
 * @param {number} newScore - The new integer score to set
 * @returns {Promise<boolean>} Boolean indicating success or failure
 * @throws {Error} When user ID is invalid or database operation fails
 * @example
 * ```typescript
 * const success = await setGamePoints('user-123', 100);
 * console.log(success); // true or false
 * ```
 */
export const setGamePoints = async (
  userId: string,
  newScore: number
): Promise<boolean> => {
  if (!userId) {
    console.error('[setGamePoints] User ID is required.');
    return false;
  }
  if (typeof newScore !== 'number' || !Number.isInteger(newScore)) {
      console.error('[setGamePoints] New score must be an integer.');
      return false;
  }

  const today = new Date().toISOString().split('T')[0];

  try {

    const currentMetrics = await getDailyMetrics(userId);
    
    if (!currentMetrics) {
      console.error('[setGamePoints] Could not fetch current metrics.');
      return false;
    }


    const pointsDifference = newScore - currentMetrics.gamePoints;


    const { error: updateError } = await (supabase as any)
      .from('user_stats')
      .upsert({
        user_id: userId,
        date: today,
        questions_attempted: currentMetrics.questionsAttempted,
        correct_answers: currentMetrics.correctAnswers,
        events_practiced: currentMetrics.eventsPracticed,
        event_questions: currentMetrics.eventQuestions,
        game_points: newScore
      } as any, { 
        onConflict: 'user_id,date' 
      });

    if (updateError) {
      console.error('[setGamePoints] Error updating user stats:', updateError);
      return false;
    }


    if (pointsDifference !== 0) {
      await (supabase as any)
        .from('game_points')
        .insert({
          user_id: userId,
          points: pointsDifference,
          source: 'admin_adjustment',
          description: `Admin set game points to ${newScore} (change: ${pointsDifference})`
        });
    }

    console.log(`[setGamePoints] Successfully set gamePoints for user ${userId} on ${today} to ${newScore}`);
    return true;
  } catch (error) {
    console.error(`[setGamePoints] Error setting game points for user ${userId}:`, error);
    return false;
  }
};

/**
 * Gets the total game points for a user across all time
 * Calculates cumulative game points from all transactions
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} Total game points or 0 if error
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const totalPoints = await getTotalGamePoints('user-123');
 * console.log(totalPoints); // Total accumulated points
 * ```
 */
export const getTotalGamePoints = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  try {
    const { data, error } = await (supabase as any)
      .from('game_points')
      .select('points')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting total game points:', error);
      return 0;
    }

    return data.reduce((total, record) => total + record.points, 0);
  } catch (error) {
    console.error('Error getting total game points:', error);
    return 0;
  }
};

/**
 * Gets the game point transaction history for a user
 * Retrieves chronological list of all game point transactions
 * 
 * @param {string} userId - The user's ID
 * @param {number} [limit=50] - Number of transactions to return (default: 50)
 * @returns {Promise<Array<{id: string; user_id: string; points: number; source: string; description: string | null; created_at: string}>>} Array of game point transactions
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const history = await getGamePointHistory('user-123', 20);
 * console.log(history); // Array of transaction records
 * ```
 */
export const getGamePointHistory = async (userId: string, limit: number = 50): Promise<Array<{
  id: string;
  user_id: string;
  points: number;
  source: string;
  description: string | null;
  created_at: string;
}>> => {
  if (!userId) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('game_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting game point history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting game point history:', error);
    return [];
  }
};