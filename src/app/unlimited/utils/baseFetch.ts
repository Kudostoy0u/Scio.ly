import api from '../../api';
import { getEventOfflineQuestions } from '@/app/utils/storage';

export type RouterParamsLike = {
  eventName?: string;
  types?: string;
};

export async function fetchBaseQuestions(routerParams: RouterParamsLike, limit: number): Promise<{ success: boolean; data: any[]; error?: string }>
{
  const params = new URLSearchParams();
  const event = routerParams.eventName ?? '';
  if (event) params.set('event', event);
  params.set('limit', String(limit));

  const apiUrl = `${api.questions}?${params.toString()}`;

  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  let apiResponse: any = null;

  if (isOffline) {
    if (event) {
      const slug = event.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const cached = await getEventOfflineQuestions(slug);
      if (Array.isArray(cached) && cached.length > 0) {
        const typesSel = (routerParams.types as string) || 'multiple-choice';
        const filtered = typesSel === 'multiple-choice'
          ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
          : typesSel === 'free-response'
            ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
            : cached;
        apiResponse = { success: true, data: filtered };
      }
    }
    if (!apiResponse) return { success: false, data: [], error: 'No offline data available for this event. Please download it first.' };
  } else {
    let response: Response | null = null;
    try {
      response = await fetch(apiUrl);
    } catch {
      response = null;
    }
    if (response && response.ok) {
      apiResponse = await response.json();
    } else {
      if (event) {
        const slug = event.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cached = await getEventOfflineQuestions(slug);
        if (Array.isArray(cached) && cached.length > 0) {
          const typesSel = (routerParams.types as string) || 'multiple-choice';
          const filtered = typesSel === 'multiple-choice'
            ? cached.filter((q: any) => Array.isArray(q.options) && q.options.length > 0)
            : typesSel === 'free-response'
              ? cached.filter((q: any) => !Array.isArray(q.options) || q.options.length === 0)
              : cached;
          apiResponse = { success: true, data: filtered };
        }
      }
      if (!apiResponse) return { success: false, data: [], error: 'Failed to fetch data from API' };
    }
  }

  return apiResponse as { success: boolean; data: any[]; error?: string };
}


