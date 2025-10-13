import { Question } from '@/app/utils/geminiService';
import api from '../../api';
import { difficultyRanges } from '@/app/utils/questionUtils';
import { buildAbsoluteUrl, normalizeQuestionMedia } from './questionMedia';

export const fetchIdQuestionsForParams = async (routerParams: any, idCount: number): Promise<Question[]> => {
  if (idCount <= 0) return [];
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  if (isOffline) return [];

  let source: any[] = [];
  try {
    const params = new URLSearchParams();
    params.set('event', routerParams.eventName || '');
    params.set('limit', String(idCount));
    if (routerParams.types === 'multiple-choice') params.set('question_type', 'mcq');
    if (routerParams.types === 'free-response') params.set('question_type', 'frq');
    if (routerParams.difficulties && routerParams.difficulties.length > 0) {
      const allRanges = routerParams.difficulties.map((d: string) => difficultyRanges[d]).filter(Boolean);
      if (allRanges.length > 0) {
        const minValue = Math.min(...allRanges.map((r: any) => r.min));
        const maxValue = Math.max(...allRanges.map((r: any) => r.max));
        params.set('difficulty_min', minValue.toFixed(2));
        params.set('difficulty_max', maxValue.toFixed(2));
      }
    }
    if (routerParams.subtopics && routerParams.subtopics.length > 0) {
      params.set('subtopics', routerParams.subtopics.join(','));
    }
    const resp = await fetch(`${api.idQuestions}?${params.toString()}`);
    const json = await resp.json();
    source = Array.isArray(json?.data) ? json.data : [];
  } catch {
    // Silently fail - offline or network error
  }
  const idQs: Question[] = source.map((row: unknown) => {
    const rowData = row as Record<string, unknown>;
    const images = Array.isArray(rowData.images) ? rowData.images : [];
    return {
      id: rowData.id as string | undefined,
      question: String(rowData.question || ''),
      options: Array.isArray(rowData.options) ? rowData.options : [],
      answers: Array.isArray(rowData.answers) ? rowData.answers : [],
      difficulty: typeof rowData.difficulty === 'number' ? rowData.difficulty : 0.5,
      event: String(rowData.event || ''),
      subtopics: Array.isArray(rowData.subtopics) ? rowData.subtopics : [],
      imageData: buildAbsoluteUrl(images.length ? images[Math.floor(Math.random() * images.length)] : undefined),
    };
  });
  return normalizeQuestionMedia(idQs).slice(0, idCount);
};
