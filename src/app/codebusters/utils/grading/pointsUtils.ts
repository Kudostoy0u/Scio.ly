import type { QuoteData } from "../../types";

// Compute a suggested default point value purely from cipher type/length.
export function getSuggestedPoints(quote: QuoteData): number {
	const cipherMultipliers: { [key: string]: number } = {
		Atbash: 1.0,
		Caesar: 1.0,
		Baconian: 1.2,

		Affine: 1.8,
		Porta: 1.6,
		Checkerboard: 1.7,

		"K1 Aristocrat": 2.2,
		"K1 Patristocrat": 2.8,
		"K1 Xenocrypt": 2.5,
		"Hill 2x2": 2.8,
		Nihilist: 2.3,

		"K2 Aristocrat": 3.2,
		"K2 Patristocrat": 3.8,
		"K2 Xenocrypt": 3.5,
		"Hill 3x3": 3.8,
		"Fractionated Morse": 3.6,
		"Complete Columnar": 3.4,

		"K3 Aristocrat": 4.2,
		"K3 Patristocrat": 4.8,
		"K3 Xenocrypt": 4.5,
		"Random Aristocrat": 4.0,
		"Random Patristocrat": 4.2,
		"Random Xenocrypt": 4.8,
		Cryptarithm: 4.5,
	};

	const baseMultiplier = cipherMultipliers[quote.cipherType] || 2.0;

	let baconianMultiplier = baseMultiplier;
	if (quote.cipherType === "Baconian" && quote.baconianBinaryType) {
		const binaryType = quote.baconianBinaryType;

		if (binaryType === "A/B") {
			baconianMultiplier = 1.0;
		} else if (
			binaryType === "Vowels/Consonants" ||
			binaryType === "Odd/Even"
		) {
			baconianMultiplier = 1.3;
		} else if (binaryType.includes(" vs ")) {
			baconianMultiplier = 1.4;
		} else {
			baconianMultiplier = 1.8;
		}
	}

	const quoteLength = quote.quote.replace(/[^A-Za-z]/g, "").length;
	let lengthMultiplier = 1.0;

	if (quoteLength < 50) {
		lengthMultiplier = 0.8;
	} else if (quoteLength < 100) {
		lengthMultiplier = 1.0;
	} else if (quoteLength < 200) {
		lengthMultiplier = 1.2;
	} else {
		lengthMultiplier = 1.4;
	}

	const finalPoints = Math.round(50 * baconianMultiplier * lengthMultiplier);

	return Math.max(2.5, Math.min(20, Number((finalPoints / 7).toFixed(1))));
}

/**
 * Resolve the authoritative point value for a question.
 * Priority order:
 * 1) Per-test override in questionPoints map
 * 2) Embedded `quote.points` computed when questions are generated/loaded
 * 3) Heuristic fallback based on cipher type/length (getSuggestedPoints)
 */
export function resolveQuestionPoints(
	quote: QuoteData,
	quoteIndex: number,
	questionPoints: { [key: number]: number } = {},
): number {
	const questionPoint = questionPoints[quoteIndex];
	if (typeof questionPoint === "number" && questionPoint > 0) {
		return questionPoint;
	}
	if (typeof quote.points === "number" && quote.points > 0) {
		return quote.points;
	}
	return getSuggestedPoints(quote);
}
