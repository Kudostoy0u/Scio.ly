import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

export const gradeFractionatedMorse = (
	quote: QuoteData,
	quoteIndex: number,
	hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } },
): GradingResult => {
	let totalInputs = 0;
	let correctInputs = 0;
	let filledInputs = 0;

	if (quote.solution && Object.keys(quote.solution).length > 0) {
		const allUnique = [...new Set(quote.encrypted.replace(/[^A-Z]/g, ""))];
		const nonHinted = allUnique.filter((c) => !hintedLetters[quoteIndex]?.[c]);
		totalInputs = nonHinted.length;

		for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
			if (
				nonHinted.includes(cipherLetter) &&
				triplet &&
				triplet.trim().length === 3
			) {
				filledInputs++;
				if (
					quote.fractionationTable &&
					quote.fractionationTable[triplet] === cipherLetter
				) {
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
