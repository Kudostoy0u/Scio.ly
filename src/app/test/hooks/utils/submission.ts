import type { Question } from "@/app/utils/geminiService";
import type { GradingResults } from "@/app/utils/questionUtils";
import { calculateMCQScore } from "@/app/utils/questionUtils";

export function computeMcqTotals(
	data: Question[],
	userAnswers: Record<number, (string | null)[] | null>,
	gradingResults: GradingResults,
	isAssignmentMode = false,
): {
	mcqTotal: number;
	mcqScore: number;
	frqsToGrade: Array<{
		index: number;
		question: string;
		correctAnswers: (string | number)[];
		studentAnswer: string;
	}>;
	newGrading: GradingResults;
} {
	// Use the passed assignment mode parameter

	let mcqScore = 0;
	let mcqTotal = 0;
	const frqsToGrade: Array<{
		index: number;
		question: string;
		correctAnswers: (string | number)[];
		studentAnswer: string;
	}> = [];
	const newGrading: GradingResults = { ...gradingResults };

	for (let i = 0; i < data.length; i++) {
		const question = data[i];
		const answer = userAnswers[i] || [];

		// If already graded, use existing score
		if (typeof newGrading[i] === "number") {
			const scoreVal = newGrading[i] as number;
			mcqTotal += 1; // Count all questions in assignment mode
			mcqScore += Math.max(0, Math.min(1, scoreVal));
			continue;
		}

		// Handle unanswered questions
		if (!(answer.length > 0 && answer[0])) {
			if (isAssignmentMode) {
				newGrading[i] = 0;
				mcqTotal += 1; // Count all questions in assignment mode
				mcqScore += 0;
			} else {
				continue;
			}
			continue;
		}

		// Process MCQ questions
		if (!question) {
			continue;
		}
		if (question.options && question.options.length > 0) {
			mcqTotal += 1; // Count all answered questions
			const frac = calculateMCQScore(question, answer);
			mcqScore += Math.max(0, Math.min(1, frac));
			newGrading[i] = frac;
		} else if (answer[0] !== null) {
			const hasValidFrqAnswers =
				question.answers &&
				question.answers.length > 0 &&
				question.answers[0] !== "" &&
				question.answers[0] !== null;
			if (hasValidFrqAnswers) {
				frqsToGrade.push({
					index: i,
					question: question.question,
					correctAnswers: question.answers,
					studentAnswer: answer[0] as string,
				});
			} else {
				newGrading[i] = 0.5;
				mcqTotal += 1;
				mcqScore += 0.5;
			}
		}
	}

	return { mcqTotal, mcqScore, frqsToGrade, newGrading };
}
