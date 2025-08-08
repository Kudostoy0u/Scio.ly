import { supabase } from '@/lib/supabase';
import { getDailyMetrics, DailyMetrics } from './metrics';

const saveLocalMetrics = (metrics: DailyMetrics) => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`metrics_${today}`, JSON.stringify(metrics));
};

/**
 * Updates the game points for the current day.
 * @param userId The user's ID, or null for anonymous users.
 * @param pointsChange The amount to change the game points by (e.g., 1, -1, 0).
 * @returns The updated DailyMetrics or null if an error occurs.
 */
export const updateGamePoints = async (
  userId: string | null,
  pointsChange: number
): Promise<DailyMetrics | null> => {

  const currentMetrics = await getDailyMetrics(userId);

  // If metrics couldn't be fetched, we can't update.
  if (!currentMetrics) {
    console.error('Could not fetch current metrics to update game points.');
    return null;
  }

  const updatedMetrics: DailyMetrics = {
    ...currentMetrics,
    gamePoints: (currentMetrics.gamePoints || 0) + pointsChange,
  };

  // Save back to the appropriate storage
  if (!userId) {
    // Anonymous user: save to localStorage
    saveLocalMetrics(updatedMetrics);
    return updatedMetrics;
  } else {
    // Logged-in user: save to Supabase
    const today = new Date().toISOString().split('T')[0];
    try {
      // Update the user_stats table with the new game points
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
        console.error('Error updating game points in Supabase:', error);
        return null;
      }

      // Also record the game point transaction
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
 * Sets the game points for a specific user for the current day directly.
 * Intended for admin use.
 * @param userId The user's ID.
 * @param newScore The new integer score to set.
 * @returns boolean Indicating success or failure.
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
    // Get current stats for the day
    const currentMetrics = await getDailyMetrics(userId);
    
    if (!currentMetrics) {
      console.error('[setGamePoints] Could not fetch current metrics.');
      return false;
    }

    // Calculate the difference for transaction record
    const pointsDifference = newScore - currentMetrics.gamePoints;

    // Update the user_stats table with the new game points
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

    // Record the game point transaction if there's a change
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
 * @param userId The user's ID
 * @returns Total game points or 0 if error
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
 * @param userId The user's ID
 * @param limit Number of transactions to return (default: 50)
 * @returns Array of game point transactions
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