import type { QuoteData } from "../../types";
import type { GradingResult } from "../gradingUtils";

export const gradeKeywordOnly = (
	quote: QuoteData,
	questionPointValue: number,
): GradingResult => {
	const keyStr = (quote.key || "").toUpperCase();
	const userStr = (quote.keywordSolution || "").toUpperCase();
	const totalInputs = keyStr.length;
	let correctInputs = 0;
	let filledInputs = 0;

	for (let i = 0; i < totalInputs; i++) {
		const expected = keyStr[i] || "";
		const provided = userStr[i] || "";
		if (provided && provided.trim().length > 0) {
			filledInputs++;
			if (provided === expected) {
				correctInputs++;
			}
		}
	}

	const attemptedScore =
		totalInputs > 0 ? (filledInputs / totalInputs) * questionPointValue : 0;
	const score =
		filledInputs > 0 ? (correctInputs / filledInputs) * attemptedScore : 0;

	return {
		totalInputs,
		correctInputs,
		filledInputs,
		score,
		maxScore: questionPointValue,
		attemptedScore,
	};
};
