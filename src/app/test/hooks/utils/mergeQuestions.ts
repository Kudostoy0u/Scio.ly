import type { Question } from '@/app/utils/geminiService';
import { shuffleArray } from '@/app/utils/questionUtils';

export function mergeBaseAndIdQuestions(
  base: Question[],
  ids: Question[],
  total: number
): Question[] {
  const desiredId = Math.min(ids.length, total);
  const baseSlots = Math.max(0, total - desiredId);
  const pickedBase = shuffleArray(base).slice(0, baseSlots);
  const pickedId = shuffleArray(ids).slice(0, desiredId);
  return shuffleArray([...pickedBase, ...pickedId]).map((q, idx) => ({ ...q, originalIndex: idx }));
}


