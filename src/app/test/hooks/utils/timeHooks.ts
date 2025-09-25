import { useEffect } from 'react';
import { setupVisibilityHandling, pauseTestSession, resumeFromPause, getCurrentTestSession, updateTimeLeft } from '@/app/utils/timeManagement';

export function usePauseOnUnmount(): void {
  useEffect(() => {
    return () => {
      try { pauseTestSession(); } catch {}
    };
  }, []);
}

export function useResumeOnMount(): void {
  useEffect(() => {
    try { resumeFromPause(); } catch {}
  }, []);
}

export function useSetupVisibility(): void {
  useEffect(() => {
    try { setupVisibilityHandling(); } catch {}
  }, []);
}

export function useCountdown(timeLeft: number | null, isSubmitted: boolean, setTimeLeft: (n: number) => void, onTimeout: () => void): void {
  useEffect(() => {
    if (timeLeft === null || isSubmitted) return;
    if (timeLeft === 0) {
      onTimeout();
      return;
    }
    const timer = setInterval(() => {
      const session = getCurrentTestSession();
      if (!session) return;
      if (session.timeState.isTimeSynchronized && session.timeState.syncTimestamp && session.timeState.originalTimeAtSync) {
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
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, setTimeLeft, onTimeout]);
}


