import { useEffect } from 'react';
import { setupVisibilityHandling, pauseTestSession, resumeFromPause } from '@/app/utils/timeManagement';

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


