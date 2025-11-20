"use client";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";
import { withAuthRetryData } from "@/lib/utils/supabaseRetry";

import { supabase } from "@/lib/supabase";
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

/** LocalStorage key prefix for metrics data */
const METRICS_PREFIX = "metrics_";
/** LocalStorage key for greeting name */
const GREETING_NAME_KEY = "scio_display_name";

/**
 * Gets today's date as a string key
 *
 * @returns {string} Today's date in YYYY-MM-DD format
 */
const getTodayKey = (): string => new Date().toISOString().split("T")[0];

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
    const raw = SyncLocalStorage.getItem(`${METRICS_PREFIX}${today}`);
    return raw ? { ...defaultMetrics, ...JSON.parse(raw) } : defaultMetrics;
  } catch {
    return defaultMetrics;
  }
};

const setLocalDailyMetrics = (metrics: DailyMetrics): void => {
  const today = getTodayKey();
  try {
    SyncLocalStorage.setItem(`${METRICS_PREFIX}${today}`, JSON.stringify(metrics));
  } catch {}
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
      } catch {}
    }
  } catch {}

  return historyData;
};

const fetchUserStatsSince = async (userId: string, fromDate: string): Promise<any[]> => {
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

const fetchDailyUserStatsRow = async (userId: string, date: string): Promise<any | null> => {
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
    const allRows = await fetchUserStatsSince(userId, "1970-01-01");
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
          SyncLocalStorage.setItem(key, JSON.stringify(payload));
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
        logger.warn("No userId provided for greeting name sync");
      } else if (typeof userId !== "string" || userId.trim() === "") {
        logger.warn("Invalid userId for greeting name sync:", userId);
      } else {
        logger.log("Fetching user profile for greeting name, userId:", userId);
        const { data: profile } = await supabase
          .from("users")
          .select("first_name, display_name")
          .eq("id", userId.trim())
          .maybeSingle();

        const firstName = profile?.first_name;
        const displayName = profile?.display_name;
        const chosen = firstName?.trim()
          ? firstName.trim()
          : displayName?.trim()
            ? displayName.trim().split(" ")[0]
            : "";

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
    logger.error("Error syncing dashboard data:", error);

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
export const coalescedSyncDashboardData = async (userId: string | null): Promise<DashboardData> => {
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
  }
): Promise<DailyMetrics | null> => {
  const attemptedDelta = Math.round(updates.questionsAttempted || 0);

  if (!userId) {
    const currentStats = getLocalDailyMetrics();
    const updatedStats: DailyMetrics = {
      ...currentStats,
      questionsAttempted: currentStats.questionsAttempted + attemptedDelta,
      correctAnswers: currentStats.correctAnswers + (updates.correctAnswers || 0),
      eventsPracticed:
        updates.eventName && !currentStats.eventsPracticed.includes(updates.eventName)
          ? [...currentStats.eventsPracticed, updates.eventName]
          : currentStats.eventsPracticed,
      eventQuestions: {
        ...currentStats.eventQuestions,
        ...(updates.eventName && attemptedDelta
          ? {
              [updates.eventName]:
                (currentStats.eventQuestions?.[updates.eventName] || 0) + attemptedDelta,
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
    const currentStats = currentData
      ? {
          questionsAttempted: currentData.questions_attempted || 0,
          correctAnswers: currentData.correct_answers || 0,
          eventsPracticed: currentData.events_practiced || [],
          eventQuestions: currentData.event_questions || {},
          gamePoints: currentData.game_points || 0,
        }
      : {
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
      events_practiced:
        updates.eventName && !currentStats.eventsPracticed.includes(updates.eventName)
          ? [...currentStats.eventsPracticed, updates.eventName]
          : currentStats.eventsPracticed,
      event_questions: {
        ...currentStats.eventQuestions,
        ...(updates.eventName && attemptedDelta
          ? {
              [updates.eventName]:
                (currentStats.eventQuestions?.[updates.eventName] || 0) + attemptedDelta,
            }
          : {}),
      },
      game_points: currentStats.gamePoints,
    };

    let { data, error } = await supabase
      .from("user_stats")
      .upsert(updatedStats, { onConflict: "user_id,date" })
      .select()
      .single();

    if (error) {
      if (error && typeof error === "object" && "status" in error && 
          typeof error.status === "number" && [401, 403].includes(error.status)) {
        try {
          await supabase.auth.refreshSession();
        } catch {}
        const retry = await supabase
          .from("user_stats")
          .upsert(updatedStats, { onConflict: "user_id,date" })
          .select()
          .single();
        if (retry.error) {
          logger.error("Error updating metrics after refresh:", retry.error);
          return null;
        }
        data = retry.data;
        error = retry.error;
      } else {
        logger.error("Error updating metrics:", error);
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
    } catch {}
    try {
      SyncLocalStorage.removeItem("scio_chart_type");
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("scio-display-name-updated", { detail: "" }));
    } catch {}
  } catch {}
}
