import { Question } from '@/app/utils/geminiService';
import { buildApiParams } from '@/app/utils/questionUtils';
import api from '../../../api';
import { getEventOfflineQuestions } from '@/app/utils/storage';

export async function fetchReplacementQuestion(
  routerData: Record<string, any>,
  data: Question[],
): Promise<Question | null> {
  try {
    const typesSel = (routerData.types as string) || 'multiple-choice';
    const requestCount = 50;
    const params = buildApiParams({ ...routerData }, requestCount);
    const apiUrl = `${api.questions}?${params}`;

    const existingQuestions = data.map((q) => q.question);
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    let pool: Question[] = [];

    if (isOffline) {
      const evt = routerData.eventName as string | undefined;
      if (evt) {
        const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cached = await getEventOfflineQuestions(slug);
        if (Array.isArray(cached) && cached.length > 0) {
          const filtered =
            typesSel === 'multiple-choice'
              ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
              : typesSel === 'free-response'
              ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
              : cached;
          pool = filtered;
        }
      }
    } else {
      let response: Response | null = null;
      try {
        response = await fetch(apiUrl);
      } catch {
        response = null;
      }
      if (response && response.ok) {
        const j = await response.json();
        pool = (j?.data || []) as Question[];
      } else {
        const evt = routerData.eventName as string | undefined;
        if (evt) {
          const slug = evt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const cached = await getEventOfflineQuestions(slug);
          if (Array.isArray(cached) && cached.length > 0) {
            const filtered =
              typesSel === 'multiple-choice'
                ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
                : typesSel === 'free-response'
                ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
                : cached;
            pool = filtered;
          }
        }
      }
    }

    const candidates = (pool as Question[]).filter((q) => !existingQuestions.includes(q.question));
    if (candidates.length === 0) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick;
  } catch {
    return null;
  }
}


