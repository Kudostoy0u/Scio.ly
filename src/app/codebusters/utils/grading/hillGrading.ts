import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

const gradeHillMatrixCell = (
	userAnswer: string,
	expected: string,
): { isFilled: boolean; isCorrect: boolean } => {
	const isFilled = Boolean(userAnswer && userAnswer.trim().length > 0);
	const isCorrect = isFilled && userAnswer.trim() === expected;
	return { isFilled, isCorrect };
};

export const gradeHillMatrix = (
	quote: QuoteData,
): { inputs: number; filled: number; correct: number } => {
	let inputs = 0;
	let filled = 0;
	let correct = 0;
	const expectedMatrix = quote.matrix;
	if (!expectedMatrix) {
		return { inputs, filled, correct };
	}
	for (let i = 0; i < expectedMatrix.length; i++) {
		const expectedRow = expectedMatrix[i];
		if (!expectedRow) {
			continue;
		}
		for (let j = 0; j < expectedRow.length; j++) {
			inputs++;
			const userAnswer = quote.hillSolution?.matrix[i]?.[j] || "";
			const expected = expectedRow[j]?.toString() || "";
			const { isFilled, isCorrect } = gradeHillMatrixCell(userAnswer, expected);
			if (isFilled) {
				filled++;
			}
			if (isCorrect) {
				correct++;
			}
		}
	}
	return { inputs, filled, correct };
};

export const gradeHillPlaintext = (
	quote: QuoteData,
	matrixSize: number,
): { inputs: number; filled: number; correct: number } => {
	let inputs = 0;
	let filled = 0;
	let correct = 0;
	const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
	const cleanPlainLength = expectedPlaintext.length;
	const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
	const paddingCount = requiredLength - cleanPlainLength;
	const actualPlaintextSlots = requiredLength - paddingCount;

	for (let i = 0; i < actualPlaintextSlots; i++) {
		inputs++;
		const userAnswer = quote.hillSolution?.plaintext[i] || "";
		const expected = expectedPlaintext[i] || "";
		if (userAnswer && userAnswer.trim().length > 0) {
			filled++;
			if (userAnswer.trim() === expected) {
				correct++;
			}
		}
	}
	return { inputs, filled, correct };
};

const calculateHillScore = (
	matrixStats: { inputs: number; filled: number; correct: number },
	plaintextStats: { inputs: number; filled: number; correct: number },
	questionPointValue: number,
	matrixWeight: number,
	plaintextWeight: number,
): { score: number; attemptedScore: number } => {
	const matrixAttemptedScore =
		matrixStats.inputs > 0
			? (matrixStats.filled / matrixStats.inputs) *
				questionPointValue *
				matrixWeight
			: 0;
	const plaintextAttemptedScore =
		plaintextStats.inputs > 0
			? (plaintextStats.filled / plaintextStats.inputs) *
				questionPointValue *
				plaintextWeight
			: 0;
	const hillAttemptedScore = matrixAttemptedScore + plaintextAttemptedScore;

	const matrixFinalScore =
		matrixStats.filled > 0
			? (matrixStats.correct / matrixStats.filled) * matrixAttemptedScore
			: 0;
	const plaintextFinalScore =
		plaintextStats.filled > 0
			? (plaintextStats.correct / plaintextStats.filled) *
				plaintextAttemptedScore
			: 0;
	const hillScore = matrixFinalScore + plaintextFinalScore;

	return { score: hillScore, attemptedScore: hillAttemptedScore };
};

export const gradeHill2x2 = (
	quote: QuoteData,
	questionPointValue: number,
): GradingResult => {
	const matrixWeight = 0.5;
	const plaintextWeight = 0.5;
	const matrixStats = gradeHillMatrix(quote);
	const plaintextStats = gradeHillPlaintext(quote, 2);
	const totalInputs = matrixStats.inputs + plaintextStats.inputs;
	const filledInputs = matrixStats.filled + plaintextStats.filled;
	const correctInputs = matrixStats.correct + plaintextStats.correct;
	const { score, attemptedScore } = calculateHillScore(
		matrixStats,
		plaintextStats,
		questionPointValue,
		matrixWeight,
		plaintextWeight,
	);

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score,
		maxScore: questionPointValue,
		attemptedScore,
		unitLabel: "matrix cells + plaintext letters",
	};
};

export const gradeHill3x3 = (
	quote: QuoteData,
	questionPointValue: number,
): GradingResult => {
	const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
	let plaintextInputs = 0;
	let plaintextFilled = 0;
	let plaintextCorrect = 0;
	const cleanPlainLength = expectedPlaintext.length;
	const requiredLength = Math.ceil(cleanPlainLength / 3) * 3;
	const paddingCount = requiredLength - cleanPlainLength;
	const actualPlaintextSlots = requiredLength - paddingCount;

	for (let i = 0; i < actualPlaintextSlots; i++) {
		plaintextInputs++;
		const userAnswer = quote.hillSolution?.plaintext[i] || "";
		const expected = expectedPlaintext[i] || "";
		if (userAnswer && userAnswer.trim().length > 0) {
			plaintextFilled++;
			if (userAnswer.trim() === expected) {
				plaintextCorrect++;
			}
		}
	}

	const attemptedScore =
		plaintextInputs > 0
			? (plaintextFilled / plaintextInputs) * questionPointValue
			: 0;
	const score =
		plaintextFilled > 0
			? (plaintextCorrect / plaintextFilled) * attemptedScore
			: 0;

	return {
		totalInputs: plaintextInputs,
		correctInputs: plaintextCorrect,
		filledInputs: plaintextFilled,
		score,
		maxScore: questionPointValue,
		attemptedScore,
		unitLabel: "plaintext letters",
	};
};
