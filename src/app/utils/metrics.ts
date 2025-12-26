import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types/database";
import { withAuthRetry } from "@/lib/utils/auth/supabaseRetry";
import logger from "@/lib/utils/logging/logger";
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

		// Use upsert with conflict handling - if it fails, retry with fresh data
		let data: Database["public"]["Tables"]["user_stats"]["Row"] | null = null;
		let error: Error | null = null;

		try {
			const result = await withAuthRetry(async () => {
				const query = (await supabase
					.from("user_stats")
					.upsert([updatedStats] as unknown as never[], {
						onConflict: "user_id,date",
					})
					.select()
					.single()) as {
					data: Database["public"]["Tables"]["user_stats"]["Row"] | null;
					error: unknown;
				};
				return query;
			}, "updateMetrics");

			data = result.data;
			error = result.error
				? result.error instanceof Error
					? result.error
					: new Error(String(result.error))
				: null;
		} catch (upsertError: unknown) {
			// If upsert fails with duplicate key error, fetch fresh data and retry once
			if (
				upsertError &&
				typeof upsertError === "object" &&
				"code" in upsertError &&
				upsertError.code === "23505"
			) {
				// Fetch the current data again (might have been updated by another request)
				const freshData = await fetchDailyUserStatsRow(userId, today);
				if (freshData) {
					// Recalculate with fresh data
					const freshUpdatedStats = {
						user_id: userId,
						date: today,
						questions_attempted: freshData.questions_attempted + attemptedDelta,
						correct_answers: freshData.correct_answers + correctDelta,
						events_practiced:
							updates.eventName &&
							!freshData.events_practiced.includes(updates.eventName)
								? [...freshData.events_practiced, updates.eventName]
								: freshData.events_practiced,
						event_questions: {
							...freshData.event_questions,
							...(updates.eventName && attemptedDelta
								? {
										[updates.eventName]:
											(freshData.event_questions?.[updates.eventName] || 0) +
											attemptedDelta,
									}
								: {}),
						},
						game_points: freshData.game_points,
					};

					const retryResult = await withAuthRetry(async () => {
						const query = (await supabase
							.from("user_stats")
							.upsert([freshUpdatedStats] as unknown as never[], {
								onConflict: "user_id,date",
							})
							.select()
							.single()) as {
							data: Database["public"]["Tables"]["user_stats"]["Row"] | null;
							error: unknown;
						};
						return query;
					}, "updateMetrics");

					data = retryResult.data;
					error = retryResult.error
						? retryResult.error instanceof Error
							? retryResult.error
							: new Error(String(retryResult.error))
						: null;
				} else {
					error =
						upsertError instanceof Error
							? upsertError
							: new Error(String(upsertError));
				}
			} else {
				error =
					upsertError instanceof Error
						? upsertError
						: new Error(String(upsertError));
			}
		}

		if (error || !data) {
			logger.error("updateMetrics error:", error);
			return null;
		}

		saveLocalMetrics({
			questionsAttempted: data.questions_attempted,

			correctAnswers: data.correct_answers,
			eventsPracticed: data.events_practiced || [],
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
