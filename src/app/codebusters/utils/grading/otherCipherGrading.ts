import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

export const gradeColumnar = (quote: QuoteData): GradingResult => {
	let totalInputs = 0;
	let correctInputs = 0;
	let filledInputs = 0;

	if (quote.solution?.decryptedText) {
		const decryptedText = quote.solution.decryptedText.trim();
		const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
		const expectedLength = expectedPlaintext.length;
		totalInputs = expectedLength;

		for (let i = 0; i < expectedLength; i++) {
			const userChar = i < decryptedText.length ? decryptedText[i] : "";
			const expectedChar = expectedPlaintext[i];
			if (userChar && userChar.trim().length > 0) {
				filledInputs++;
				if (userChar.trim() === expectedChar) {
					correctInputs++;
				}
			}
		}
	}

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score: 0,
		maxScore: 0,
		attemptedScore: 0,
	};
};

const normalizeNihilist = (s: string): string => {
	return s ? s.toUpperCase().replace(/J/g, "I") : s;
};

const gradeNihilistLetter = (
	userAnswer: string | undefined,
	expectedPlainChar: string | undefined,
): { isFilled: boolean; isCorrect: boolean } => {
	const normalizedAnswer = normalizeNihilist(userAnswer || "");
	const normalizedExpected = normalizeNihilist(expectedPlainChar || "");
	const isFilled = Boolean(
		normalizedAnswer && normalizedAnswer.trim().length > 0,
	);
	const isCorrect = isFilled && normalizedAnswer.trim() === normalizedExpected;
	return { isFilled, isCorrect };
};

const getNihilistHintedCount = (quote: QuoteData): number => {
	const hintedPositions = Object.entries(quote.nihilistHinted || {})
		.filter(([, v]) => v === true)
		.map(([k]) => Number(k));
	return hintedPositions.length;
};

const processNihilistLetters = (
	quote: QuoteData,
	expectedPlaintext: string,
): { filled: number; correct: number } => {
	let filled = 0;
	let correct = 0;
	for (let i = 0; i < expectedPlaintext.length; i++) {
		const isHinted = Boolean(quote.nihilistHinted?.[i]);
		if (isHinted) {
			continue;
		}
		const userAnswer = quote.nihilistSolution?.[i];
		const expectedPlainChar = expectedPlaintext[i];
		if (expectedPlainChar === undefined) {
			continue;
		}
		const { isFilled, isCorrect } = gradeNihilistLetter(
			userAnswer,
			expectedPlainChar,
		);
		if (isFilled) {
			filled++;
		}
		if (isCorrect) {
			correct++;
		}
	}
	return { filled, correct };
};

export const gradeNihilist = (quote: QuoteData): GradingResult => {
	let totalInputs = 0;
	let correctInputs = 0;
	let filledInputs = 0;

	if (
		quote.nihilistSolution &&
		Object.keys(quote.nihilistSolution).length > 0
	) {
		const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
		const hintedCount = getNihilistHintedCount(quote);
		totalInputs = Math.max(0, expectedPlaintext.length - hintedCount);
		const { filled, correct } = processNihilistLetters(
			quote,
			expectedPlaintext,
		);
		filledInputs = filled;
		correctInputs = correct;
	}

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score: 0,
		maxScore: 0,
		attemptedScore: 0,
	};
};

export const gradeBaconian = (quote: QuoteData): GradingResult => {
	let totalInputs = 0;
	let correctInputs = 0;
	let filledInputs = 0;

	if (quote.solution && Object.keys(quote.solution).length > 0) {
		const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
		totalInputs = expectedPlaintext.length;

		for (let i = 0; i < totalInputs; i++) {
			const userAnswer = quote.solution[i];
			if (userAnswer && userAnswer.trim().length > 0) {
				filledInputs++;
				if (userAnswer.trim() === expectedPlaintext[i]) {
					correctInputs++;
				}
			}
		}
	}

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score: 0,
		maxScore: 0,
		attemptedScore: 0,
	};
};
