import type { QuoteData } from "@/app/codebusters/types";
import { calculateCipherGrade } from "@/app/codebusters/utils/gradingUtils";
import { useMemo } from "react";

/**
 * Calculate progress based on points attempted, matching the grading system
 * used in the summary. This gives a more accurate representation than
 * input completion percentage.
 */
export const usePointsProgress = (
	quotes: QuoteData[],
	hintedLetters: {
		[questionIndex: number]: { [letter: string]: boolean };
	} = {},
	questionPoints: { [key: number]: number } = {},
): number => {
	const progressPercentage = useMemo(() => {
		if (quotes.length === 0) {
			return 0;
		}

		let totalPointsAttempted = 0;
		let totalMaxPoints = 0;

		quotes.forEach((quote, quoteIndex) => {
			const gradeResult = calculateCipherGrade(
				quote,
				quoteIndex,
				hintedLetters,
				questionPoints,
			);

			totalPointsAttempted += gradeResult.attemptedScore;
			totalMaxPoints += gradeResult.maxScore;
		});

		if (totalMaxPoints === 0) {
			return 0;
		}

		return (totalPointsAttempted / totalMaxPoints) * 100;
	}, [quotes, hintedLetters, questionPoints]);

	return progressPercentage;
};
