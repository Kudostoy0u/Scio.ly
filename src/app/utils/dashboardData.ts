"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { withAuthRetryData } from "@/lib/utils/auth/supabaseRetry";
import logger from "@/lib/utils/logging/logger";

import { supabase } from "@/lib/supabase";
import { getCachedUserProfile } from "@/app/utils/userProfileCache";
import type { Database } from "@/lib/types/database";
import type { DailyMetrics } from "./metrics";

/**
 * Dashboard data management utilities for Science Olympiad platform
 * Provides comprehensive dashboard data synchronization, metrics tracking, and user statistics
 */

/**
 * Historical record interface for dashboard data
 */
export interface HistoryRecord {
	/** Number of questions attempted */
	questionsAttempted: number;
	/** Number of correct answers */
	correctAnswers: number;
	/** List of events practiced */
	eventsPracticed: string[];
}

/**
 * Dashboard data interface
 */
export interface DashboardData {
	/** Daily metrics for current day */
	metrics: DailyMetrics;
	/** Historical data records */
	historyData: Record<string, HistoryRecord>;
	/** User's greeting name */
	greetingName: string;
}

/**
 * User stats insert type from database schema
 */
type UserStatsInsert = Database["public"]["Tables"]["user_stats"]["Insert"];

/** LocalStorage key prefix for metrics data */
const METRICS_PREFIX = "metrics_";
/** LocalStorage key for greeting name */
const GREETING_NAME_KEY = "scio_display_name";

/**
 * Gets today's date as a string key
 *
 * @returns {string} Today's date in YYYY-MM-DD format
 */
const getTodayKey = (): string => {
	return new Date().toISOString().split("T")[0] || "";
};

/**
 * Retrieves greeting name from localStorage
 *
 * @returns {string} User's greeting name or empty string
 */
const getLocalGreetingName = (): string => {
	try {
		return SyncLocalStorage.getItem(GREETING_NAME_KEY) || "";
	} catch {
		return "";
	}
};

/**
 * Sets greeting name in localStorage
 *
 * @param {string} name - Greeting name to store
 */
const setLocalGreetingName = (name: string): void => {
	try {
		SyncLocalStorage.setItem(GREETING_NAME_KEY, name);
	} catch {
		// Ignore localStorage errors
	}
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
		const raw = SyncLocalStorage.getItem(`${METRICS_PREFIX}${today}`);
		return raw ? { ...defaultMetrics, ...JSON.parse(raw) } : defaultMetrics;
	} catch {
		return defaultMetrics;
	}
};

const setLocalDailyMetrics = (metrics: DailyMetrics): void => {
	const today = getTodayKey();
	try {
		SyncLocalStorage.setItem(
			`${METRICS_PREFIX}${today}`,
			JSON.stringify(metrics),
		);
	} catch {
		// Ignore localStorage errors
	}
};

const getLocalHistory = (): Record<string, HistoryRecord> => {
	const historyData: Record<string, HistoryRecord> = {};
	try {
		for (let i = 0; i < SyncLocalStorage.getLength(); i++) {
			const key = SyncLocalStorage.key(i) || "";
			if (!key.startsWith(METRICS_PREFIX)) {
				continue;
			}

			const date = key.replace(METRICS_PREFIX, "");
			const raw = SyncLocalStorage.getItem(key);
			if (!raw) {
				continue;
			}

			try {
				const parsed = JSON.parse(raw) as DailyMetrics;
				historyData[date] = {
					questionsAttempted: parsed.questionsAttempted || 0,
					correctAnswers: parsed.correctAnswers || 0,
					eventsPracticed: parsed.eventsPracticed || [],
				};
			} catch {
				// Ignore JSON parse errors
			}
		}
	} catch {
		// Ignore localStorage errors
	}

	return historyData;
};

const fetchUserStatsSince = async (
	userId: string,
	fromDate: string,
): Promise<unknown[]> => {
	const result = await withAuthRetryData(async () => {
		const query = supabase
			.from("user_stats")
			.select("*")
			.eq("user_id", userId)
			.gte("date", fromDate);
		return await query;
	}, "fetchUserStatsSince");

	return result || [];
};

const fetchDailyUserStatsRow = async (
	userId: string,
	date: string,
): Promise<unknown | null> => {
	const result = await withAuthRetryData(async () => {
		const query = supabase
			.from("user_stats")
			.select("*")
			.eq("user_id", userId)
			.eq("date", date)
			.maybeSingle();
		return await query;
	}, "fetchDailyUserStatsRow");

	return result;
};

/**
 * Synchronizes dashboard data between Supabase and localStorage
 * Fetches user statistics from database and syncs with local storage
 *
 * @param {string | null} userId - User ID to sync data for, null for guest users
 * @returns {Promise<DashboardData>} Synchronized dashboard data
 * @throws {Error} When database sync fails
 * @example
 * ```typescript
 * const dashboardData = await syncDashboardData('user-123');
 * console.log(dashboardData.metrics); // Daily metrics
 * console.log(dashboardData.historyData); // Historical data
 * ```
 */
const parseDailyMetricsFromRow = (
	rowRecord: Record<string, unknown>,
): DailyMetrics => {
	return {
		questionsAttempted:
			typeof rowRecord.questions_attempted === "number"
				? rowRecord.questions_attempted
				: 0,
		correctAnswers:
			typeof rowRecord.correct_answers === "number"
				? rowRecord.correct_answers
				: 0,
		eventsPracticed: Array.isArray(rowRecord.events_practiced)
			? (rowRecord.events_practiced as string[])
			: [],
		eventQuestions:
			typeof rowRecord.event_questions === "object" &&
			rowRecord.event_questions !== null &&
			!Array.isArray(rowRecord.event_questions)
				? (rowRecord.event_questions as Record<string, number>)
				: {},
		gamePoints:
			typeof rowRecord.game_points === "number" ? rowRecord.game_points : 0,
	};
};

const syncHistoricalData = async (userId: string): Promise<void> => {
	const allRows = await fetchUserStatsSince(userId, "1970-01-01");
	if (!Array.isArray(allRows)) {
		return;
	}

	for (const row of allRows) {
		const rowRecord = row as Record<string, unknown>;
		try {
			const key = `${METRICS_PREFIX}${rowRecord.date}`;
			const payload = parseDailyMetricsFromRow(rowRecord);
			SyncLocalStorage.setItem(key, JSON.stringify(payload));
		} catch {
			// Ignore localStorage errors
		}
	}
};

const syncTodayData = async (userId: string): Promise<void> => {
	const today = getTodayKey();
	const todayRow = await fetchDailyUserStatsRow(userId, today);
	if (!todayRow) {
		return;
	}

	const todayRowRecord = todayRow as Record<string, unknown>;
	const payload = parseDailyMetricsFromRow(todayRowRecord);
	setLocalDailyMetrics(payload);
};

const syncGreetingName = async (userId: string): Promise<void> => {
	try {
		if (!userId || typeof userId !== "string" || userId.trim() === "") {
			logger.warn("Invalid userId for greeting name sync:", userId);
			return;
		}

		const cachedGreeting = getLocalGreetingName();
		if (cachedGreeting) {
			return;
		}

		logger.log("Fetching user profile for greeting name, userId:", userId);
		const profile = await getCachedUserProfile(userId.trim());
		const displayName = profile?.display_name ?? null;
		const chosen = displayName?.trim() ? displayName.trim().split(" ")[0] : "";

		if (chosen) {
			setLocalGreetingName(chosen);
		}
	} catch {
		// Ignore localStorage errors
	}
};

const parseCurrentStatsFromRow = (
	currentDataRecord: Record<string, unknown> | null,
): DailyMetrics => {
	if (!currentDataRecord) {
		return {
			questionsAttempted: 0,
			correctAnswers: 0,
			eventsPracticed: [],
			eventQuestions: {},
			gamePoints: 0,
		};
	}

	return {
		questionsAttempted:
			typeof currentDataRecord.questions_attempted === "number"
				? currentDataRecord.questions_attempted
				: 0,
		correctAnswers:
			typeof currentDataRecord.correct_answers === "number"
				? currentDataRecord.correct_answers
				: 0,
		eventsPracticed: Array.isArray(currentDataRecord.events_practiced)
			? (currentDataRecord.events_practiced as string[])
			: [],
		eventQuestions:
			typeof currentDataRecord.event_questions === "object" &&
			currentDataRecord.event_questions !== null &&
			!Array.isArray(currentDataRecord.event_questions)
				? (currentDataRecord.event_questions as Record<string, number>)
				: {},
		gamePoints:
			typeof currentDataRecord.game_points === "number"
				? currentDataRecord.game_points
				: 0,
	};
};

const buildUpdatedStats = (
	userId: string,
	today: string,
	currentStats: DailyMetrics,
	updates: {
		questionsAttempted?: number;
		correctAnswers?: number;
		eventName?: string;
	},
	attemptedDelta: number,
): UserStatsInsert => {
	return {
		user_id: userId,
		date: today,
		questions_attempted: currentStats.questionsAttempted + attemptedDelta,
		correct_answers:
			currentStats.correctAnswers + (updates.correctAnswers || 0),
		events_practiced:
			updates.eventName &&
			!currentStats.eventsPracticed.includes(updates.eventName)
				? [...currentStats.eventsPracticed, updates.eventName]
				: currentStats.eventsPracticed,
		event_questions: {
			...currentStats.eventQuestions,
			...(updates.eventName && attemptedDelta
				? {
						[updates.eventName]:
							(currentStats.eventQuestions?.[updates.eventName] || 0) +
							attemptedDelta,
					}
				: {}),
		},
		game_points: currentStats.gamePoints,
	};
};

const handleUpsertError = async (
	error: unknown,
	updatedStats: UserStatsInsert,
) => {
	if (
		error &&
		typeof error === "object" &&
		"status" in error &&
		typeof error.status === "number" &&
		[401, 403].includes(error.status)
	) {
		try {
			await supabase.auth.refreshSession();
		} catch {
			// Ignore refresh session errors
		}
		const retry = (await supabase
			.from("user_stats")
			// @ts-expect-error - Supabase type inference issue with upsert
			.upsert([updatedStats])
			.select()
			.single()) as {
			data: Database["public"]["Tables"]["user_stats"]["Row"] | null;
			error: Error | null;
		};
		if (retry.error) {
			logger.error("Error updating metrics after refresh:", retry.error);
			return null;
		}
		return retry.data;
	}

	logger.error("Error updating metrics:", error);
	return null;
};

const getDashboardData = (): DashboardData => {
	return {
		metrics: getLocalDailyMetrics(),
		historyData: getLocalHistory(),
		greetingName: getLocalGreetingName(),
	};
};

export const syncDashboardData = async (
	userId: string | null,
): Promise<DashboardData> => {
	if (!userId) {
		return getDashboardData();
	}

	try {
		await syncHistoricalData(userId);
		await syncTodayData(userId);
		await syncGreetingName(userId);
		return getDashboardData();
	} catch (error) {
		logger.error("Error syncing dashboard data:", error);
		return getDashboardData();
	}
};

// Coalesce multiple concurrent sync requests per user into a single in-flight Promise
const userIdToInFlightSync: Record<string, Promise<DashboardData> | undefined> =
	{};

/**
 * Coalesces multiple concurrent sync requests per user into a single in-flight Promise
 * Prevents duplicate API calls when multiple components request sync simultaneously
 *
 * @param {string | null} userId - User ID to sync data for
 * @returns {Promise<DashboardData>} Synchronized dashboard data
 * @example
 * ```typescript
 * // Multiple calls to this function with same userId will share the same Promise
 * const data1 = coalescedSyncDashboardData('user-123');
 * const data2 = coalescedSyncDashboardData('user-123');
 * // Both will resolve to the same result
 * ```
 */
export const coalescedSyncDashboardData = async (
	userId: string | null,
): Promise<DashboardData> => {
	if (!userId) {
		return syncDashboardData(userId);
	}
	if (userIdToInFlightSync[userId]) {
		return userIdToInFlightSync[userId] as Promise<DashboardData>;
	}
	const p = syncDashboardData(userId)
		.catch((e) => {
			throw e;
		})
		.finally(() => {
			userIdToInFlightSync[userId] = undefined;
		});
	userIdToInFlightSync[userId] = p;
	return p;
};

/**
 * Gets initial dashboard data from localStorage
 * Returns cached data without making API calls
 *
 * @returns {DashboardData} Initial dashboard data from localStorage
 * @example
 * ```typescript
 * const initialData = getInitialDashboardData();
 * console.log(initialData.metrics); // Cached daily metrics
 * ```
 */
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

/**
 * Updates dashboard metrics for a user
 * Updates both local storage and database with new metrics
 *
 * @param {string | null} userId - User ID to update metrics for
 * @param {Object} updates - Metrics updates to apply
 * @param {number} [updates.questionsAttempted] - Number of questions attempted
 * @param {number} [updates.correctAnswers] - Number of correct answers
 * @param {string} [updates.eventName] - Event name for tracking
 * @returns {Promise<DailyMetrics | null>} Updated daily metrics or null if update fails
 * @example
 * ```typescript
 * const updatedMetrics = await updateDashboardMetrics('user-123', {
 *   questionsAttempted: 5,
 *   correctAnswers: 4,
 *   eventName: 'Anatomy & Physiology'
 * });
 * ```
 */
export const updateDashboardMetrics = async (
	userId: string | null,
	updates: {
		questionsAttempted?: number;
		correctAnswers?: number;
		eventName?: string;
	},
): Promise<DailyMetrics | null> => {
	const attemptedDelta = Math.round(updates.questionsAttempted || 0);

	if (!userId) {
		const currentStats = getLocalDailyMetrics();
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
		setLocalDailyMetrics(updatedStats);
		return updatedStats;
	}

	const today = getTodayKey();

	try {
		const currentData = await fetchDailyUserStatsRow(userId, today);
		const currentDataRecord = currentData as Record<string, unknown> | null;
		const currentStats = parseCurrentStatsFromRow(currentDataRecord);
		const updatedStats = buildUpdatedStats(
			userId,
			today,
			currentStats,
			updates,
			attemptedDelta,
		);

		const { data: initialData, error } = (await supabase
			.from("user_stats")
			.upsert([updatedStats] as unknown as never[])
			.select()
			.single()) as {
			data: Database["public"]["Tables"]["user_stats"]["Row"] | null;
			error: Error | null;
		};

		let data = initialData;
		if (error) {
			data = await handleUpsertError(error, updatedStats);
			if (!data) {
				return null;
			}
		}

		if (!data) {
			logger.error("No data returned from upsert");
			return null;
		}

		const dataTyped = data as {
			questions_attempted: number;
			correct_answers: number;
			events_practiced: string[] | null;
			event_questions: Record<string, number> | null;
			game_points: number;
		};

		const localMetrics: DailyMetrics = {
			questionsAttempted: dataTyped.questions_attempted,
			correctAnswers: dataTyped.correct_answers,
			eventsPracticed: dataTyped.events_practiced || [],
			eventQuestions: dataTyped.event_questions || {},
			gamePoints: dataTyped.game_points,
		};
		setLocalDailyMetrics(localMetrics);

		return localMetrics;
	} catch (error) {
		logger.error("Error updating metrics:", error);
		return null;
	}
};

/**
 * Resets all localStorage data except theme settings
 * Clears all user data while preserving theme preferences
 *
 * @example
 * ```typescript
 * resetAllLocalStorageExceptTheme();
 * // All user data cleared, theme preserved
 * ```
 */
export function resetAllLocalStorageExceptTheme(): void {
	try {
		const preservedTheme = SyncLocalStorage.getItem("theme");
		SyncLocalStorage.clear();
		if (preservedTheme !== null) {
			SyncLocalStorage.setItem("theme", preservedTheme);
		}

		try {
			SyncLocalStorage.removeItem(GREETING_NAME_KEY);
		} catch {
			// Ignore localStorage errors
		}
		try {
			SyncLocalStorage.removeItem("scio_chart_type");
		} catch {
			// Ignore localStorage errors
		}

		try {
			window.dispatchEvent(
				new CustomEvent("scio-display-name-updated", { detail: "" }),
			);
		} catch {
			// Ignore event dispatch errors
		}
	} catch {
		// Ignore localStorage errors
	}
}
