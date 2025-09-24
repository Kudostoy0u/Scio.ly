import type { GradingResults } from '@/app/utils/questionUtils';

export function parseJSONSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function restoreStoredState(): {
  userAnswers: Record<number, (string | null)[] | null>;
  gradingResults: GradingResults;
} {
  const storedUserAnswers = typeof localStorage !== 'undefined' ? localStorage.getItem('testUserAnswers') : null;
  const storedGrading = typeof localStorage !== 'undefined' ? localStorage.getItem('testGradingResults') : null;
  const userAnswers = parseJSONSafe<Record<number, (string | null)[] | null>>(storedUserAnswers, {});
  const gradingResults = parseJSONSafe<GradingResults>(storedGrading, {} as GradingResults);
  return { userAnswers, gradingResults };
}


