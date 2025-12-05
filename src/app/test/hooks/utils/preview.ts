import type { Question } from "@/app/utils/geminiService";
import type { GradingResults } from "@/app/utils/questionUtils";

// Helper function to extract answer picks from multiple choice questions
function extractAnswerPicks(question: Question): string[] {
	const answerList = Array.isArray(question.answers)
		? question.answers
		: [question.answers];
	const picks: string[] = [];

	for (const ans of answerList) {
		if (typeof ans === "string") {
			if (ans) {
				picks.push(ans);
			}
		} else if (
			typeof ans === "number" &&
			question.options &&
			ans >= 0 &&
			ans < question.options.length
		) {
			const val = question.options[ans] as string;
			if (val) {
				picks.push(val);
			}
		}
	}

	return picks;
}

// Helper function to get fallback answer for multiple choice questions
function getFallbackAnswer(question: Question, answerList: unknown[]): string {
	const first =
		typeof answerList[0] === "number" && question.options
			? (question.options[answerList[0] as number] as string)
			: String(answerList[0] ?? "");
	return first;
}

// Helper function to process multiple choice questions
function processMultipleChoiceQuestion(
	question: Question,
	index: number,
	filled: Record<number, (string | null)[] | null>,
	grades: GradingResults,
): void {
	const picks = extractAnswerPicks(question);

	if (picks.length === 0) {
		const answerList = Array.isArray(question.answers)
			? question.answers
			: [question.answers];
		filled[index] = [getFallbackAnswer(question, answerList)];
	} else {
		filled[index] = picks;
	}
	grades[index] = 3;
}

// Helper function to process free response questions
function processFreeResponseQuestion(
	question: Question,
	index: number,
	filled: Record<number, (string | null)[] | null>,
	grades: GradingResults,
): void {
	const corrects = Array.isArray(question.answers)
		? question.answers
		: [question.answers];
	const first = corrects.length > 0 ? String(corrects[0] ?? "") : "";
	filled[index] = [first];
	grades[index] = 1;
}

export function buildPreviewAutofill(data: Question[]): {
	filled: Record<number, (string | null)[] | null>;
	grades: GradingResults;
} {
	const filled: Record<number, (string | null)[] | null> = {};
	const grades: GradingResults = {};

	for (const [i, q] of data.entries()) {
		if (Array.isArray(q.options) && q.options.length > 0) {
			processMultipleChoiceQuestion(q, i, filled, grades);
		} else {
			processFreeResponseQuestion(q, i, filled, grades);
		}
	}

	return { filled, grades };
}
