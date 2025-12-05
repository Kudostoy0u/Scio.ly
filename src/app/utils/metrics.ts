import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { supabase } from "@/lib/supabase";
import logger from "@/lib/utils/logger";
import { withAuthRetry } from "@/lib/utils/supabaseRetry";
import { updateLeaderboardStats } from "./leaderboardUtils";

/**
 * Metrics management utilities for Science Olympiad platform
 * Provides comprehensive metrics tracking, analytics, and performance monitoring
 */

/**
 * Daily metrics interface for user performance tracking
 */
export interface DailyMetrics {
	/** Number of questions attempted */
	questionsAttempted: number;
	/** Number of correct answers */
	correctAnswers: number;
	/** List of events practiced */
	eventsPracticed: string[];
	/** Questions per event breakdown */
	eventQuestions: Record<string, number>;
	/** Game points earned */
	gamePoints: number;
}

/**
 * Retrieves local metrics from localStorage
 *
 * @returns {DailyMetrics} Local metrics or default metrics
 */
const getLocalMetrics = (): DailyMetrics => {
	const today = new Date().toISOString().split("T")[0];
	const localStats =
		typeof window !== "undefined"
			? SyncLocalStorage.getItem(`metrics_${today}`)
			: null;
	const defaultMetrics = {
		questionsAttempted: 0,
		correctAnswers: 0,
		eventsPracticed: [],
		eventQuestions: {},
		gamePoints: 0,
	};
	return localStats
		? { ...defaultMetrics, ...JSON.parse(localStats) }
		: defaultMetrics;
};

/**
 * Saves metrics to localStorage
 *
 * @param {DailyMetrics} metrics - Metrics to save
 */
const saveLocalMetrics = (metrics: DailyMetrics) => {
	const today = new Date().toISOString().split("T")[0];
	if (typeof window !== "undefined") {
		SyncLocalStorage.setItem(`metrics_${today}`, JSON.stringify(metrics));
	}
};

/**
 * Gets daily metrics for a user
 * Retrieves metrics from database or localStorage for anonymous users
 *
 * @param {string | null} userId - User ID or null for anonymous users
 * @returns {Promise<DailyMetrics | null>} Daily metrics or null if error
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const metrics = await getDailyMetrics('user-123');
 * console.log(metrics?.questionsAttempted); // Daily questions attempted
 * ```
 */
export const getDailyMetrics = async (
	userId: string | null,
): Promise<DailyMetrics | null> => {
	const defaultMetrics = {
		questionsAttempted: 0,
		correctAnswers: 0,
		eventsPracticed: [],
		eventQuestions: {},
		gamePoints: 0,
	};

	if (!userId) {
		return getLocalMetrics();
	}

	const todayParts = new Date().toISOString().split("T");
	const today = todayParts[0];
	if (!today) {
		throw new Error("Failed to get today's date");
	}

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
		logger.error("Error getting metrics:", error);
		return defaultMetrics;
	}
};

/**
 * Gets weekly metrics for a user
 * Aggregates daily metrics over the past 7 days
 *
 * @param {string | null} userId - User ID or null for anonymous users
 * @returns {Promise<DailyMetrics | null>} Weekly aggregated metrics or null if error
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const weeklyMetrics = await getWeeklyMetrics('user-123');
 * console.log(weeklyMetrics?.questionsAttempted); // Weekly questions attempted
 * ```
 */
export const getWeeklyMetrics = async (
	userId: string | null,
): Promise<DailyMetrics | null> => {
	if (!userId) {
		return null;
	}

	const today = new Date();
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const weekAgoParts = weekAgo.toISOString().split("T");
	const weekAgoString = weekAgoParts[0];
	if (!weekAgoString) {
		throw new Error("Failed to get week ago date");
	}

	try {
		const data = await fetchUserStatsSince(userId, weekAgoString);

		const aggregated = data.reduce(
			(acc: DailyMetrics, day) => ({
				questionsAttempted: acc.questionsAttempted + day.questions_attempted,
				correctAnswers: acc.correctAnswers + day.correct_answers,
				eventsPracticed: [
					...new Set([...acc.eventsPracticed, ...(day.events_practiced || [])]),
				],
				eventQuestions: Object.keys(day.event_questions || {}).reduce(
					(eventAcc, event) => {
						eventAcc[event] =
							(eventAcc[event] || 0) + (day.event_questions[event] || 0);
						return eventAcc;
					},
					acc.eventQuestions,
				),
				gamePoints: acc.gamePoints + day.game_points,
			}),
			{
				questionsAttempted: 0,
				correctAnswers: 0,
				eventsPracticed: [] as string[],
				eventQuestions: {} as Record<string, number>,
				gamePoints: 0,
			},
		);

		return aggregated;
	} catch (error) {
		logger.error("Error getting weekly metrics:", error);
		return null;
	}
};

/**
 * Gets monthly metrics for a user
 * Aggregates daily metrics over the past 30 days
 *
 * @param {string | null} userId - User ID or null for anonymous users
 * @returns {Promise<DailyMetrics | null>} Monthly aggregated metrics or null if error
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const monthlyMetrics = await getMonthlyMetrics('user-123');
 * console.log(monthlyMetrics?.questionsAttempted); // Monthly questions attempted
 * ```
 */
export const getMonthlyMetrics = async (
	userId: string | null,
): Promise<DailyMetrics | null> => {
	if (!userId) {
		return null;
	}

	const today = new Date();
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
	const monthAgoParts = monthAgo.toISOString().split("T");
	const monthAgoString = monthAgoParts[0];
	if (!monthAgoString) {
		throw new Error("Failed to get month ago date");
	}

	try {
		const data = await fetchUserStatsSince(userId, monthAgoString);

		const aggregated = data.reduce(
			(acc: DailyMetrics, day) => ({
				questionsAttempted: acc.questionsAttempted + day.questions_attempted,
				correctAnswers: acc.correctAnswers + day.correct_answers,
				eventsPracticed: [
					...new Set([...acc.eventsPracticed, ...(day.events_practiced || [])]),
				],
				eventQuestions: Object.keys(day.event_questions || {}).reduce(
					(eventAcc, event) => {
						eventAcc[event] =
							(eventAcc[event] || 0) + (day.event_questions[event] || 0);
						return eventAcc;
					},
					acc.eventQuestions,
				),
				gamePoints: acc.gamePoints + day.game_points,
			}),
			{
				questionsAttempted: 0,
				correctAnswers: 0,
				eventsPracticed: [] as string[],
				eventQuestions: {} as Record<string, number>,
				gamePoints: 0,
			},
		);

		return aggregated;
	} catch (error) {
		logger.error("Error getting monthly metrics:", error);
		return null;
	}
};

/**
 * Updates user metrics
 * Updates both database and localStorage with new metrics
 *
 * @param {string | null} userId - User ID or null for anonymous users
 * @param {Object} updates - Metrics updates to apply
 * @param {number} [updates.questionsAttempted] - Number of questions attempted
 * @param {number} [updates.correctAnswers] - Number of correct answers
 * @param {string} [updates.eventName] - Event name for tracking
 * @returns {Promise<DailyMetrics | null>} Updated metrics or null if error
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const updatedMetrics = await updateMetrics('user-123', {
 *   questionsAttempted: 5,
 *   correctAnswers: 4,
 *   eventName: 'Anatomy & Physiology'
 * });
 * ```
 */
export const updateMetrics = async (
	userId: string | null,
	updates: {
		questionsAttempted?: number;
		correctAnswers?: number;
		eventName?: string;
	},
): Promise<DailyMetrics | null> => {
	const attemptedDelta = Math.round(updates.questionsAttempted || 0);
	const correctDelta = Math.round(updates.correctAnswers || 0);
	if (!userId) {
		const currentStats = getLocalMetrics();
		const updatedStats: DailyMetrics = {
			...currentStats,
			questionsAttempted: currentStats.questionsAttempted + attemptedDelta,

			correctAnswers:
				currentStats.correctAnswers + (updates.correctAnswers || 0),
			eventsPracticed:
				updates.eventName &&
				!currentStats.eventsPracticed.includes(updates.eventName)
					? [...currentStats.eventsPracticed, updates.eventName]
					: currentStats.eventsPracticed,
			eventQuestions: {
				...currentStats.eventQuestions,
				...(updates.eventName && attemptedDelta
					? {
							[updates.eventName]:
								(currentStats.eventQuestions?.[updates.eventName] || 0) +
								attemptedDelta,
						}
					: {}),
			},
		};
		saveLocalMetrics(updatedStats);
		return updatedStats;
	}

	const todayParts = new Date().toISOString().split("T");
	const today = todayParts[0];
	if (!today) {
		throw new Error("Failed to get today's date");
	}

	try {
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
			game_points: 0,
		};

		if (currentData) {
			currentStats = currentData;
		}

		const updatedEventsPracticed =
			updates.eventName &&
			!currentStats.events_practiced.includes(updates.eventName)
				? [...currentStats.events_practiced, updates.eventName]
				: currentStats.events_practiced;

		const updatedEventQuestions = {
			...currentStats.event_questions,
			...(updates.eventName && attemptedDelta
				? {
						[updates.eventName]:
							(currentStats.event_questions?.[updates.eventName] || 0) +
							attemptedDelta,
					}
				: {}),
		};

		const updatedStats = {
			user_id: userId,
			date: today,
			questions_attempted: currentStats.questions_attempted + attemptedDelta,
			correct_answers: currentStats.correct_answers + correctDelta,
			events_practiced: updatedEventsPracticed,
			event_questions: updatedEventQuestions,
			game_points: currentStats.game_points,
		};

		const { data, error } = await withAuthRetry(async () => {
			const query = supabase
				.from("user_stats")
				.upsert(updatedStats as never, { onConflict: "user_id,date" })
				.select()
				.single();
			return await query;
		}, "updateMetrics");

		if (error || !data) {
			return null;
		}

		saveLocalMetrics({
			questionsAttempted: updatedStats.questions_attempted,

			correctAnswers: updatedStats.correct_answers,
			eventsPracticed: updatedStats.events_practiced,
			eventQuestions: updatedStats.event_questions,
			gamePoints: updatedStats.game_points,
		});

		if (attemptedDelta || correctDelta) {
			try {
				await updateLeaderboardStats(attemptedDelta, correctDelta);
			} catch (leaderboardError) {
				logger.error("Error updating leaderboard stats:", leaderboardError);
			}
		}

		const dataTyped = data as {
			questions_attempted: number;
			correct_answers: number;
			events_practiced: string[] | null;
			event_questions: Record<string, number> | null;
			game_points: number;
		};
		return {
			questionsAttempted: dataTyped.questions_attempted,
			correctAnswers: dataTyped.correct_answers,
			eventsPracticed: dataTyped.events_practiced || [],
			eventQuestions: dataTyped.event_questions || {},
			gamePoints: dataTyped.game_points,
		};
	} catch (error) {
		logger.error("Error updating metrics:", error);
		return null;
	}
};

// ---------- internal helpers with auth refresh & retry ----------

type UserStatsRow = {
	user_id: string;
	date: string;
	questions_attempted: number;
	correct_answers: number;
	events_practiced: string[];
	event_questions: Record<string, number>;
	game_points: number;
};

export async function fetchDailyUserStatsRow(
	userId: string,
	date: string,
): Promise<UserStatsRow | null> {
	const { data } = await withAuthRetry(async () => {
		const query = supabase
			.from("user_stats")
			.select("*")
			.eq("user_id", userId)
			.eq("date", date)
			.maybeSingle();
		return await query;
	}, "fetchDailyUserStatsRow");

	return data || null;
}

export async function fetchUserStatsSince(
	userId: string,
	fromDate: string,
): Promise<UserStatsRow[]> {
	const { data } = await withAuthRetry(async () => {
		const query = supabase
			.from("user_stats")
			.select("*")
			.eq("user_id", userId)
			.gte("date", fromDate);
		return await query;
	}, "fetchUserStatsSince");

	return data || [];
}
