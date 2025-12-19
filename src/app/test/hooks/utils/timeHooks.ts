import { db } from "@/app/utils/db";
import {
	getCurrentTestSession,
	pauseTestSession,
	resumeFromPause,
	setupVisibilityHandling,
	updateTimeLeft,
} from "@/app/utils/timeManagement";
import { useEffect, useRef } from "react";

export function usePauseOnUnmount(): void {
	useEffect(() => {
		return () => {
			try {
				pauseTestSession();
			} catch {
				// Ignore pause errors
			}
		};
	}, []);
}

export function useResumeOnMount(): void {
	useEffect(() => {
		try {
			resumeFromPause();
		} catch {
			// Ignore resume errors
		}
	}, []);
}

export function useSetupVisibility(): void {
	useEffect(() => {
		try {
			setupVisibilityHandling();
		} catch {
			// Ignore setup errors
		}
	}, []);
}

/**
 * Countdown hook that decrements the timer every second.
 * The session's timeState is the source of truth, and we sync it to component state.
 */
export function useCountdown(
	timeLeft: number | null,
	isSubmitted: boolean,
	setTimeLeft: (n: number | null) => void,
	onTimeout: () => void,
	assignmentId?: string | null,
): void {
	const isSubmittedRef = useRef(isSubmitted);
	const assignmentIdRef = useRef(assignmentId);
	const onTimeoutRef = useRef(onTimeout);

	// Update refs when props change
	useEffect(() => {
		isSubmittedRef.current = isSubmitted;
		assignmentIdRef.current = assignmentId;
		onTimeoutRef.current = onTimeout;
	}, [isSubmitted, assignmentId, onTimeout]);

	// Sync component state to session on mount or when timeLeft changes
	useEffect(() => {
		if (timeLeft !== null && !isSubmitted) {
			const session = getCurrentTestSession();
			if (session && session.timeState.timeLeft !== timeLeft) {
				// Sync component state to session if they differ
				updateTimeLeft(timeLeft);
			}
		}
	}, [timeLeft, isSubmitted]);

	// Main countdown interval
	useEffect(() => {
		// Don't start timer if submitted or timeLeft is null
		if (timeLeft === null || isSubmitted) {
			return;
		}

		// Ensure session is initialized with current timeLeft
		const session = getCurrentTestSession();
		if (session && session.timeState.timeLeft !== timeLeft) {
			updateTimeLeft(timeLeft);
		}

		const timer = setInterval(() => {
			// Check if submitted (from ref for latest state)
			if (isSubmittedRef.current) {
				return;
			}

			const currentSession = getCurrentTestSession();
			if (!currentSession) {
				return;
			}

			// Check if paused
			if (currentSession.timeState.isPaused) {
				return;
			}

			// Calculate new time left
			let newTimeLeft: number;

			if (
				currentSession.timeState.isTimeSynchronized &&
				currentSession.timeState.syncTimestamp &&
				currentSession.timeState.originalTimeAtSync !== null
			) {
				// Synchronized time mode - calculate based on elapsed time
				const now = Date.now();
				const elapsedMs = now - currentSession.timeState.syncTimestamp;
				const elapsedSeconds = Math.floor(elapsedMs / 1000);
				newTimeLeft = Math.max(
					0,
					currentSession.timeState.originalTimeAtSync - elapsedSeconds,
				);
			} else {
				// Normal countdown mode - decrement by 1 second
				const currentTime = currentSession.timeState.timeLeft || 0;
				newTimeLeft = Math.max(0, currentTime - 1);
			}

			// Update session state (source of truth)
				updateTimeLeft(newTimeLeft);

			// Update component state to trigger re-render
				setTimeLeft(newTimeLeft);

			// Save to Dexie if this is an assignment
			if (assignmentIdRef.current && newTimeLeft > 0) {
				db.assignmentTime
					.put({
						assignmentId: assignmentIdRef.current,
						timeLeft: newTimeLeft,
						updatedAt: Date.now(),
					})
					.catch(() => {
						// Ignore Dexie errors
					});
			}

			// Check if time is up
			if (newTimeLeft === 0) {
				onTimeoutRef.current();
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [timeLeft, isSubmitted, setTimeLeft]);
}
