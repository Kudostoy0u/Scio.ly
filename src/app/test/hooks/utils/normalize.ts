import { Question } from '@/app/utils/geminiService';
import { normalizeQuestionText, normalizeTestText, normalizeOptionAnswerLabels } from '../../utils/normalizeTestText';
import { normalizeQuestionMedia } from '../../utils/questionMedia';

export function normalizeQuestionsFull(questions: Question[]): Question[] {
  const mediaNormalized = normalizeQuestionMedia(questions);
  return mediaNormalized.map((q) => {
    const out: any = { ...q };
    if (out.question) out.question = normalizeQuestionText(out.question);
    if (Array.isArray(out.options)) {
      out.options = out.options.map((opt: any) => (typeof opt === 'string' ? normalizeTestText(opt) : opt));
      const normalized = normalizeOptionAnswerLabels(out.options as string[], Array.isArray(out.answers) ? out.answers : []);
      out.options = normalized.options as any;
      if (Array.isArray(out.answers)) out.answers = normalized.answers as any;
    }
    if (Array.isArray(out.answers)) {
      out.answers = out.answers.map((ans: any) => (typeof ans === 'string' ? normalizeTestText(ans) : ans));
    }
    return out as Question;
  });
}


