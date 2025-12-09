"use client";
import logger from "@/lib/utils/logging/logger";

// import { supabase } from '@/lib/supabase';
import {
	type DashboardData,
	type HistoryRecord,
	getInitialDashboardData,
	coalescedSyncDashboardData as syncDashboardData,
	updateDashboardMetrics,
} from "@/app/utils/dashboardData";
import type { DailyMetrics } from "@/app/utils/metrics";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dashboard data management hook for Science Olympiad platform
 * Provides comprehensive dashboard data management including metrics, history, and user progress
 */

/**
 * Return interface for useDashboardData hook
 * Contains all dashboard data and control functions
 */
export interface UseDashboardDataReturn {
	/** Daily metrics and statistics */
	metrics: DailyMetrics;
	/** Historical data records */
	historyData: Record<string, HistoryRecord>;
	/** User's greeting name */
	greetingName: string;

	/** Loading state indicator */
	isLoading: boolean;
	/** Error message if data loading fails */
	error: string | null;

	/** Function to refresh all dashboard data */
	refreshData: () => Promise<void>;
	/** Function to update user metrics */
	updateMetrics: (updates: {
		questionsAttempted?: number;
		correctAnswers?: number;
		eventName?: string;
	}) => Promise<void>;
}

/**
 * Dashboard data management hook
 * Manages user dashboard data including metrics, history, and progress tracking
 *
 * @param {User | null} user - Current authenticated user
 * @returns {UseDashboardDataReturn} Dashboard data and control functions
 * @example
 * ```typescript
 * const {
 *   metrics,
 *   historyData,
 *   isLoading,
 *   refreshData,
 *   updateMetrics
 * } = useDashboardData(user);
 * ```
 */
export function useDashboardData(user: User | null): UseDashboardDataReturn {
	const [data, setData] = useState<DashboardData>(() =>
		getInitialDashboardData(),
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lastSyncedUserId = useRef<string | null>(null);
	const dataRef = useRef(data);

	const refreshData = useCallback(async () => {
		logger.log("refreshData called with user:", user);
		if (!user?.id) {
			logger.log("No user or user.id, returning early");
			return;
		}

		if (typeof user.id !== "string" || user.id.trim() === "") {
			logger.warn("Invalid user.id:", user.id);
			return;
		}

		if (lastSyncedUserId.current === user.id) {
			logger.log("Already synced for this user ID, skipping:", user.id);
			return;
		}

		const hasData =
			data.metrics.questionsAttempted > 0 ||
			data.metrics.correctAnswers > 0 ||
			Object.keys(data.historyData).length > 0;
		if (!hasData) {
			setIsLoading(true);
		}
		setError(null);

		try {
			logger.log("Calling syncDashboardData with userId:", user.id);
			const newData = await syncDashboardData(user.id);
			setData(newData);
			lastSyncedUserId.current = user.id;
		} catch (err) {
			logger.error("Error refreshing dashboard data:", err);
			setError("Failed to refresh data");
		} finally {
			setIsLoading(false);
		}
	}, [
		user,
		data.metrics.questionsAttempted,
		data.metrics.correctAnswers,
		data.historyData,
	]);

	useEffect(() => {
		dataRef.current = data;
	}, [data]);

	const updateMetrics = useCallback(
		async (updates: {
			questionsAttempted?: number;
			correctAnswers?: number;
			eventName?: string;
		}) => {
			const userId = user?.id || null;

			try {
				const updatedMetrics = await updateDashboardMetrics(userId, updates);
				if (updatedMetrics) {
					setData((prev) => ({
						...prev,
						metrics: updatedMetrics,
					}));
				}
			} catch (err) {
				logger.error("Error updating metrics:", err);
				setError("Failed to update metrics");
			}
		},
		[user],
	);

	useEffect(() => {
		logger.log("Initial data load effect triggered with user:", user);
		if (!user) {
			logger.log("No user, using local data only");
			setData(getInitialDashboardData());
			lastSyncedUserId.current = null;
			return;
		}

		if (!user.id || typeof user.id !== "string" || user.id.trim() === "") {
			logger.log("Invalid user ID, using local data only");
			setData(getInitialDashboardData());
			lastSyncedUserId.current = null;
			return;
		}

		if (lastSyncedUserId.current === user.id) {
			logger.log(
				"Already synced for this user ID, skipping initial sync:",
				user.id,
			);
			return;
		}

		logger.log("Initial load with valid user, syncing with server");

		const syncData = async () => {
			const hasData =
				dataRef.current.metrics.questionsAttempted > 0 ||
				dataRef.current.metrics.correctAnswers > 0 ||
				Object.keys(dataRef.current.historyData).length > 0;
			if (!hasData) {
				setIsLoading(true);
			}
			setError(null);

			try {
				logger.log("Calling syncDashboardData with userId:", user.id);
				const newData = await syncDashboardData(user.id);
				setData(newData);
				lastSyncedUserId.current = user.id;
			} catch (err) {
				logger.error("Error refreshing dashboard data:", err);
				setError("Failed to refresh data");
			} finally {
				setIsLoading(false);
			}
		};

		syncData();
	}, [user]);

	// Auth state handling moved to AuthContext; no additional auth listeners here

	return {
		metrics: data.metrics,
		historyData: data.historyData,
		greetingName: data.greetingName,
		isLoading,
		error,
		refreshData,
		updateMetrics,
	};
}
