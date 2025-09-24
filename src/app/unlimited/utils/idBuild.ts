import { Question } from '@/app/utils/geminiService';
import { shuffleArray } from '@/app/utils/questionUtils';

export function buildIdQuestionFromApiRow(row: any, params: { eventName?: string; types?: string; namePool: string[] }): Question {
  const imgs: string[] = Array.isArray(row.images) ? row.images : [];
  const chosenImg = imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : undefined;

  const types = params.types || 'multiple-choice';

  const isMcqMode = types === 'multiple-choice' || (types === 'both' && Math.random() >= 0.5);

  let frqPrompt = 'Identify the specimen shown in the image.';
  if (params.eventName?.startsWith('Anatomy')) frqPrompt = 'Identify the anatomical structure shown in the image.';

  if (!isMcqMode) {
    return {
      question: frqPrompt,
      answers: row.answers || row.names || [],
      difficulty: row.difficulty ?? 0.5,
      event: params.eventName || 'Unknown Event',
      imageData: chosenImg,
    } as Question;
  }

  const correct = (row.answers && row.answers.length > 0)
    ? row.answers[0]
    : (row.names && row.names.length > 0)
      ? row.names[0]
      : '';
  const distractors = shuffleArray(params.namePool.filter(n => !row.answers?.includes(n) && !row.names?.includes(n))).slice(0, 3);
  const options = shuffleArray([correct, ...distractors]);
  const correctIndex = options.indexOf(correct);
  return {
    question: frqPrompt,
    options,
    answers: [correctIndex],
    difficulty: row.difficulty ?? 0.5,
    event: params.eventName || 'Unknown Event',
    imageData: chosenImg,
  } as Question;
}


