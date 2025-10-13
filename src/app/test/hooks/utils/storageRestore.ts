import type { GradingResults } from '@/app/utils/questionUtils';
import { StorageService, StorageKeys } from '@/lib/utils/storage';

export function restoreStoredState(): {
  userAnswers: Record<number, (string | null)[] | null>;
  gradingResults: GradingResults;
} {
  const userAnswers = StorageService.getWithDefault<Record<number, (string | null)[] | null>>(
    StorageKeys.TEST_USER_ANSWERS,
    {}
  );
  const gradingResults = StorageService.getWithDefault<GradingResults>(
    StorageKeys.TEST_GRADING_RESULTS,
    {} as GradingResults
  );
  return { userAnswers, gradingResults };
}


