import { Question } from '@/app/utils/geminiService';
import { GradingResults } from '@/app/utils/questionUtils';
import { calculateMCQScore } from '@/app/utils/questionUtils';

export function computeMcqTotals(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
): { mcqTotal: number; mcqScore: number; frqsToGrade: Array<{ index: number; question: string; correctAnswers: (string | number)[]; studentAnswer: string }>; newGrading: GradingResults } {
  let mcqScore = 0;
  let mcqTotal = 0;
  const frqsToGrade: Array<{ index: number; question: string; correctAnswers: (string | number)[]; studentAnswer: string }> = [];
  const newGrading: GradingResults = { ...gradingResults };

  for (let i = 0; i < data.length; i++) {
    const question = data[i];
    const answer = userAnswers[i] || [];

    if (typeof newGrading[i] === 'number') {
      const scoreVal = newGrading[i] as number;
      if (scoreVal > 0) {
        mcqTotal += 1;
        mcqScore += Math.max(0, Math.min(1, scoreVal));
      }
      continue;
    }

    if (!answer.length || !answer[0]) continue;

    if (question.options && question.options.length) {
      if (answer.length > 0 && answer[0] !== null) {
        mcqTotal += 1;
      }
      const frac = calculateMCQScore(question, answer);
      mcqScore += Math.max(0, Math.min(1, frac));
      newGrading[i] = frac;
    } else {
      if (answer[0] !== null) {
        const hasValidFRQAnswers = question.answers && question.answers.length > 0 && question.answers[0] !== '' && question.answers[0] !== null;
        if (hasValidFRQAnswers) {
          frqsToGrade.push({ index: i, question: question.question, correctAnswers: question.answers, studentAnswer: answer[0] as string });
        } else {
          newGrading[i] = 0.5;
        }
      }
    }
  }

  return { mcqTotal, mcqScore, frqsToGrade, newGrading };
}


