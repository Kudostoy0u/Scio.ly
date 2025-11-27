import {
  getCurrentTestSession,
  pauseTestSession,
  resumeFromPause,
  setupVisibilityHandling,
  updateTimeLeft,
} from "@/app/utils/timeManagement";
import { useCallback, useEffect } from "react";
import { toast } from "react-toastify";

interface UseTimerManagementProps {
  timeLeft: number | null;
  setTimeLeft: (time: number) => void;
  isTestSubmitted: boolean;
  onTimeExpired: () => void;
}

export function useTimerManagement({
  timeLeft,
  setTimeLeft,
  isTestSubmitted,
  onTimeExpired,
}: UseTimerManagementProps) {
  const showTimeWarnings = useCallback((time: number) => {
    if (time === 300) {
      toast.warning("Warning: Five minutes left");
    } else if (time === 60) {
      toast.warning("Warning: One minute left");
    } else if (time === 30) {
      toast.warning("Warning: Thirty seconds left");
    }
  }, []);

  const updateTimer = useCallback(() => {
    const session = getCurrentTestSession();
    if (!session) {
      return;
    }
    if (
      session.timeState.isTimeSynchronized &&
      session.timeState.syncTimestamp &&
      session.timeState.originalTimeAtSync
    ) {
      const now = Date.now();
      const elapsedMs = now - session.timeState.syncTimestamp;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const newTimeLeft = Math.max(0, session.timeState.originalTimeAtSync - elapsedSeconds);
      setTimeLeft(newTimeLeft);
      updateTimeLeft(newTimeLeft);
    } else if (!session.timeState.isPaused) {
      const newTimeLeft = Math.max(0, (session.timeState.timeLeft || 0) - 1);
      setTimeLeft(newTimeLeft);
      updateTimeLeft(newTimeLeft);
    }
  }, [setTimeLeft]);

  useEffect(() => {
    const cleanup = setupVisibilityHandling();
    try {
      resumeFromPause();
    } catch {
      // Ignore errors when resuming from pause
    }
    return () => {
      cleanup();
      try {
        pauseTestSession();
      } catch {
        // Ignore errors when pausing session on unmount
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft === null || isTestSubmitted) {
      return;
    }
    if (timeLeft === 0) {
      onTimeExpired();
      return;
    }
    showTimeWarnings(timeLeft);
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTestSubmitted, onTimeExpired, showTimeWarnings, updateTimer]);
}
