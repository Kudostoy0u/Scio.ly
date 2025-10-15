import { Question } from '@/app/utils/geminiService';
import { GradingResults } from '@/app/utils/questionUtils';
import { calculateMCQScore } from '@/app/utils/questionUtils';

export function computeMcqTotals(
  data: Question[],
  userAnswers: Record<number, (string | null)[] | null>,
  gradingResults: GradingResults,
  isAssignmentMode: boolean = false,
): { mcqTotal: number; mcqScore: number; frqsToGrade: Array<{ index: number; question: string; correctAnswers: (string | number)[]; studentAnswer: string }>; newGrading: GradingResults } {
  console.log('📊 computeMcqTotals DEBUG:');
  console.log('Data length:', data.length);
  console.log('User answers:', userAnswers);
  console.log('Grading results:', gradingResults);
  
  // Use the passed assignment mode parameter
  
  let mcqScore = 0;
  let mcqTotal = 0;
  const frqsToGrade: Array<{ index: number; question: string; correctAnswers: (string | number)[]; studentAnswer: string }> = [];
  const newGrading: GradingResults = { ...gradingResults };

  for (let i = 0; i < data.length; i++) {
    const question = data[i];
    const answer = userAnswers[i] || [];

    console.log(`\n🔍 Processing question ${i}:`);
    console.log('Question:', {
      question: question.question,
      hasAnswers: !!question.answers,
      answers: question.answers,
      hasOptions: !!question.options,
      options: question.options
    });
    console.log('User answer:', answer);
    console.log('Assignment mode:', isAssignmentMode);

    // If already graded, use existing score
    if (typeof newGrading[i] === 'number') {
      const scoreVal = newGrading[i] as number;
      console.log('Already graded with score:', scoreVal);
      mcqTotal += 1; // Count all questions in assignment mode
      mcqScore += Math.max(0, Math.min(1, scoreVal));
      continue;
    }

    // Handle unanswered questions
    if (!answer.length || !answer[0]) {
      console.log('No answer provided');
      if (isAssignmentMode) {
        // In assignment mode, unanswered questions are marked as wrong (0 points)
        console.log('Assignment mode: marking as wrong (0 points)');
        newGrading[i] = 0;
        mcqTotal += 1; // Count all questions in assignment mode
        mcqScore += 0;
      } else {
        // In practice mode, skip unanswered questions
        console.log('Practice mode: skipping unanswered question');
        continue;
      }
      continue;
    }

    // Process MCQ questions
    if (question.options && question.options.length) {
      console.log('Processing as MCQ');
      mcqTotal += 1; // Count all answered questions
      const frac = calculateMCQScore(question, answer);
      console.log('Calculated score:', frac);
      mcqScore += Math.max(0, Math.min(1, frac));
      newGrading[i] = frac;
      console.log('Updated mcqScore:', mcqScore, 'newGrading[' + i + ']:', frac);
    } else {
      // Process FRQ questions
      console.log('Processing as FRQ');
      if (answer[0] !== null) {
        const hasValidFRQAnswers = question.answers && question.answers.length > 0 && question.answers[0] !== '' && question.answers[0] !== null;
        if (hasValidFRQAnswers) {
          console.log('Adding to FRQs to grade');
          frqsToGrade.push({ index: i, question: question.question, correctAnswers: question.answers, studentAnswer: answer[0] as string });
        } else {
          console.log('No valid FRQ answers, setting score to 0.5');
          newGrading[i] = 0.5;
          mcqTotal += 1;
          mcqScore += 0.5;
        }
      }
    }
  }

  console.log('\n📊 Final results:');
  console.log('mcqTotal:', mcqTotal);
  console.log('mcqScore:', mcqScore);
  console.log('frqsToGrade:', frqsToGrade);
  console.log('newGrading:', newGrading);
  console.log('Assignment mode:', isAssignmentMode);

  return { mcqTotal, mcqScore, frqsToGrade, newGrading };
}


