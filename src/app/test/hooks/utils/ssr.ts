import { Question } from '@/app/utils/geminiService';
import { normalizeQuestionMedia } from '../../utils/questionMedia';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

export function resolveRouterParams(initialRouterData: any, storedParamsStr: string | null) {
  const parsed = storedParamsStr ? JSON.parse(storedParamsStr) : {};
  return (initialRouterData && Object.keys(initialRouterData).length > 0) ? initialRouterData : parsed;
}

export function applySsrInitialData(
  initialData: Question[],
  routerParams: any,
  setData: (q: Question[]) => void,
  setIsLoading: (b: boolean) => void,
  fetchCompletedRef: { current: boolean },
) {
  const baseQs = normalizeQuestionMedia((initialData as Question[]).map((q, idx) => ({ ...q, originalIndex: idx })));
  const total = parseInt((routerParams?.questionCount as string) || '10');
  const idPctRaw = (routerParams as any)?.idPercentage;
  const idPct = typeof idPctRaw !== 'undefined' ? Math.max(0, Math.min(100, parseInt(idPctRaw))) : 0;
  const requestedIdCount = Math.round((idPct / 100) * total);
  const useId = requestedIdCount > 0;
  setData(baseQs);
  setIsLoading(false);
  fetchCompletedRef.current = true;
  if (!useId) {
    try { SyncLocalStorage.setItem('testQuestions', JSON.stringify(baseQs)); } catch {}
  }
}


