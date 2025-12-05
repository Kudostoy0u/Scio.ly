import type { Question } from "./geminiService";
import { isMultiSelectQuestion } from "./questionUtils";

export interface ExplanationResult {
	explanationText: string;
	updatedQuestion?: Question;
	gradingUpdate?: {
		index: number;
		isCorrect: boolean;
	};
	shouldSubmitEdit?: boolean;
	editReason?: string;
	correctedAnswers?: (string | number)[];
}

export const processMcqExplanation = (
	index: number,
	question: Question,
	explanation: string,
	correctIndices: number[],
	userAnswers: Record<number, (string | null)[] | null> | undefined,
	gradingResults: Record<string, number>,
): ExplanationResult => {
	const explanationText = explanation;
	const result: ExplanationResult = { explanationText };

	const suggestedIndices = correctIndices.filter(
		(n: number) => !Number.isNaN(n),
	);
	if (suggestedIndices.length > 0) {
		const correctedAnswers = suggestedIndices;
		const currentAnswers = question.answers || [];

		const normalizedCurrentAnswers = currentAnswers
			.map((ans) => (typeof ans === "string" ? Number.parseInt(ans) : ans))
			.filter((n) => typeof n === "number" && !Number.isNaN(n));

		const normalizedNewAnswers = correctedAnswers;

		const answersChanged = !(
			normalizedNewAnswers.length === normalizedCurrentAnswers.length &&
			normalizedNewAnswers.every((val: number) =>
				normalizedCurrentAnswers.includes(val),
			) &&
			normalizedCurrentAnswers.every((val: number) =>
				normalizedNewAnswers.includes(val),
			)
		);

		if (answersChanged) {
			result.shouldSubmitEdit = true;
			result.editReason = "Explanation corrected answers";
			result.correctedAnswers = correctedAnswers;
			result.updatedQuestion = { ...question, answers: correctedAnswers };

			if (userAnswers) {
				const currentUserAnswers = userAnswers[index] || [];
				const updatedQuestion = result.updatedQuestion;
				const isMulti = isMultiSelectQuestion(
					updatedQuestion.question,
					correctedAnswers,
				);

				const userNumericAnswers = currentUserAnswers
					.map((ans) => {
						const idx = updatedQuestion.options?.indexOf(ans ?? "");
						return idx !== undefined && idx >= 0 ? idx : -1;
					})
					.filter((idx) => idx >= 0);

				let isNowCorrect = false;
				if (isMulti) {
					isNowCorrect =
						correctedAnswers.every((correctAns: number | string) =>
							userNumericAnswers.includes(correctAns as number),
						) && userNumericAnswers.length === correctedAnswers.length;
				} else {
					isNowCorrect = correctedAnswers.includes(userNumericAnswers[0] ?? -1);
				}

				if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
					result.gradingUpdate = { index, isCorrect: true };
				} else if (!isNowCorrect && gradingResults[index] === 1) {
					result.gradingUpdate = { index, isCorrect: false };
				}
			}
		}
	}
	return result;
};

export const processFrqExplanation = (
	index: number,
	question: Question,
	explanation: string,
	correctedAnswers: (string | number)[],
	userAnswers: Record<number, (string | null)[] | null> | undefined,
	gradingResults: Record<string, number>,
): ExplanationResult => {
	const result: ExplanationResult = { explanationText: explanation };

	if (correctedAnswers && correctedAnswers.length > 0) {
		const currentAnswers = question.answers || [];

		const answersChanged = !(
			correctedAnswers.length === currentAnswers.length &&
			correctedAnswers.every(
				(ans: unknown, idx: number) =>
					String(ans).toLowerCase().trim() ===
					String(currentAnswers[idx]).toLowerCase().trim(),
			)
		);

		if (answersChanged) {
			result.shouldSubmitEdit = true;
			result.editReason = "Explanation corrected answers";
			result.correctedAnswers = correctedAnswers;
			result.updatedQuestion = { ...question, answers: correctedAnswers };

			if (userAnswers) {
				const currentUserAnswers = userAnswers[index] || [];
				const userAnswerText = currentUserAnswers[0] || "";

				let isNowCorrect = false;
				if (userAnswerText.trim()) {
					isNowCorrect = correctedAnswers.some(
						(correctAnswer: number | string) =>
							String(correctAnswer).toLowerCase().trim() ===
							userAnswerText.toLowerCase().trim(),
					);
				}

				if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
					result.gradingUpdate = { index, isCorrect: true };
				} else if (!isNowCorrect && gradingResults[index] === 1) {
					result.gradingUpdate = { index, isCorrect: false };
				}
			}
		}
	}
	return result;
};
