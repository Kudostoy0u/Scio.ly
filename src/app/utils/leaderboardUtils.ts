import { supabase } from "@/lib/supabase";

/**
 * Leaderboard utilities for Science Olympiad platform
 * Provides comprehensive leaderboard management, statistics tracking, and team joining functionality
 */

/**
 * Parameters for update_leaderboard_stats RPC call
 */
interface UpdateLeaderboardStatsParams {
	p_user_id: string;
	p_questions_attempted: number;
	p_correct_answers: number;
}

/**
 * Updates leaderboard statistics for a user
 * Updates the user's leaderboard stats with questions attempted and correct answers
 *
 * @param {number} questionsAttempted - Number of questions attempted
 * @param {number} correctAnswers - Number of correct answers
 * @returns {Promise<void>} Promise that resolves when stats are updated
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * await updateLeaderboardStats(5, 4);
 * ```
 */
export async function updateLeaderboardStats(
	questionsAttempted: number,
	correctAnswers: number,
) {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return;
	}

	const params: UpdateLeaderboardStatsParams = {
		p_user_id: user.id,
		p_questions_attempted: questionsAttempted,
		p_correct_answers: correctAnswers,
	};

	await supabase.rpc(
		"update_leaderboard_stats" as never,
		params as unknown as never,
	);
}

/**
 * Checks URL for join code and joins leaderboard
 * Automatically joins a leaderboard if a join code is present in the URL
 *
 * @returns {Promise<void>} Promise that resolves when join process is complete
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * await checkAndJoinFromUrl();
 * ```
 */
