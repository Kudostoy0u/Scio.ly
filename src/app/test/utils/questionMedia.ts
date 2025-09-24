import { Question } from '@/app/utils/geminiService';

export const buildAbsoluteUrl = (src?: string, origin?: string): string | undefined => {
  if (!src) return undefined;
  try {
    if (/^https?:\/\//i.test(src)) return src;
    if (origin && src.startsWith('/')) return `${origin}${src}`;
    if (typeof window !== 'undefined' && src.startsWith('/')) return `${window.location.origin}${src}`;
    return src;
  } catch {
    return src;
  }
};

export const normalizeQuestionMedia = (qs: Question[], origin?: string): Question[] => {
  return qs.map((q: any) => {
    const out: any = { ...q };
    let candidate: string | undefined = out.imageData || out.imageUrl;
    if (!candidate && Array.isArray(out.images) && out.images.length > 0) {
      const pick = out.images[Math.floor(Math.random() * out.images.length)];
      if (typeof pick === 'string') candidate = pick;
    }
    const abs = buildAbsoluteUrl(candidate, origin);
    if (abs) {
      out.imageData = abs;
      if (!out.imageUrl) out.imageUrl = abs;
    }
    return out as Question;
  });
};
