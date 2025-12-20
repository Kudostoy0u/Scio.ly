import type { QuoteData } from "@/app/codebusters/types";
import { useMemo } from "react";

export const useProgressCalculation = (quotes: QuoteData[]) => {
	const progressData = useMemo(() => {
		let totalProgress = 0;

		if (quotes.length === 0) {
			return { totalProgress: 0, calculateQuoteProgress: () => 0 };
		}

		for (const quote of quotes) {
			const quoteProgress = calculateQuoteProgress(quote);
			totalProgress += quoteProgress;
		}

		const averageProgress = totalProgress / quotes.length;

		return {
			totalProgress: averageProgress,
			calculateQuoteProgress,
		};
	}, [quotes]);

	return progressData;
};

// Helper function to calculate progress for substitution ciphers
const calculateSubstitutionProgress = (quote: QuoteData): number => {
	const totalLetters = [...new Set(quote.encrypted.match(/[A-Z]/g) || [])]
		.length;
	const filledLetters = quote.solution
		? Object.values(quote.solution).filter(
				(value) => value && value.trim() !== "",
			).length
		: 0;
	return totalLetters > 0 ? (filledLetters / totalLetters) * 100 : 0;
};

// Helper function to calculate progress for Hill 2x2
const calculateHill2x2Progress = (quote: QuoteData): number => {
	const matrixSize = 4; // 2x2 = 4 cells
	const matrixProgress =
		quote.hillSolution?.matrix.reduce(
			(acc, row) => acc + row.filter((cell) => cell !== "").length,
			0,
		) || 0;
	const plaintextProgress =
		Object.values(quote.hillSolution?.plaintext || {}).filter(
			(value) => value && value.trim() !== "",
		).length / (quote.encrypted.match(/[A-Z]/g)?.length || 1);
	return (matrixProgress / matrixSize) * 50 + plaintextProgress * 50;
};

// Helper function to calculate progress for Hill 3x3
const calculateHill3x3Progress = (quote: QuoteData): number => {
	const plaintextProgress =
		Object.values(quote.hillSolution?.plaintext || {}).filter(
			(value) => value && value.trim() !== "",
		).length / (quote.encrypted.match(/[A-Z]/g)?.length || 1);
	return plaintextProgress * 100;
};

// Helper function to calculate progress for position-based ciphers
const calculatePositionBasedProgress = (
	totalPositions: number,
	filledPositions: number,
): number => {
	return totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
};

// Helper function to calculate progress for Complete Columnar
const calculateColumnarProgress = (quote: QuoteData): number => {
	const originalLength = quote.quote
		.toUpperCase()
		.replace(/[^A-Z]/g, "").length;
	const decryptedLength = quote.solution?.decryptedText?.length || 0;
	return originalLength > 0 ? (decryptedLength / originalLength) * 100 : 0;
};

// Helper function to calculate progress for Nihilist
const calculateNihilistProgress = (quote: QuoteData): number => {
	const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
	const filledPositions = quote.nihilistSolution
		? Object.values(quote.nihilistSolution).filter(
				(value) => value && value.trim() !== "",
			).length
		: 0;
	return calculatePositionBasedProgress(totalPositions, filledPositions);
};

// Helper function to calculate progress for Checkerboard
const calculateCheckerboardProgress = (quote: QuoteData): number => {
	const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
	const filledPositions = quote.checkerboardSolution
		? Object.values(quote.checkerboardSolution).filter(
				(value) => value && value.trim() !== "",
			).length
		: 0;
	return calculatePositionBasedProgress(totalPositions, filledPositions);
};

// Helper function to calculate progress for Fractionated Morse
const calculateFractionatedMorseProgress = (quote: QuoteData): number => {
	const totalPositions = quote.encrypted.match(/[A-Z]/g)?.length || 0;
	const filledPositions = quote.fractionatedSolution
		? Object.values(quote.fractionatedSolution).filter(
				(value) => value && value.trim() !== "",
			).length
		: 0;
	return calculatePositionBasedProgress(totalPositions, filledPositions);
};

// Helper function to calculate progress for Cryptarithm
const calculateCryptarithmProgress = (quote: QuoteData): number => {
	if (!quote.cryptarithmData?.digitGroups || !quote.cryptarithmData.equation) {
		return 0;
	}

	// Identify equation words to exclude from "Values to decode for solution"
	const EQUATION_SPLIT_REGEX = /\s*[+\-=]\s*/;
	const equationWordsSet = new Set<string>();
	const parts = quote.cryptarithmData.equation
		.split(EQUATION_SPLIT_REGEX)
		.filter(Boolean);
	if (parts.length === 3) {
		const [w1, w2, w3] = parts;
		if (w1 && w2 && w3) {
			equationWordsSet.add(w1.toUpperCase());
			equationWordsSet.add(w2.toUpperCase());
			equationWordsSet.add(w3.toUpperCase());
		}
	}

	// Filter out equation words from digitGroups to get only solution words
	const solutionGroups = quote.cryptarithmData.digitGroups.filter((group) => {
		const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
		return !equationWordsSet.has(wordUpper);
	});

	// Count total input boxes in solution words (not equation words)
	let totalPositions = 0;
	for (const group of solutionGroups) {
		const digits = group.digits.split(" ").filter(Boolean);
		totalPositions += digits.length;
	}

	// Count filled positions in solution words only
	// First, calculate the offset (number of positions in equation words)
	let positionOffset = 0;
	for (const group of quote.cryptarithmData.digitGroups) {
		const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
		if (equationWordsSet.has(wordUpper)) {
			const digits = group.digits.split(" ").filter(Boolean);
			positionOffset += digits.length;
		} else {
			// Once we hit a solution word, stop counting
			break;
		}
	}

	// Count filled positions that are in solution words (starting from positionOffset)
	let filledPositions = 0;
	if (quote.cryptarithmSolution) {
		// Count filled positions starting from positionOffset
		for (let i = positionOffset; i < positionOffset + totalPositions; i++) {
			const value = quote.cryptarithmSolution[i];
			if (value && value.trim() !== "") {
				filledPositions++;
			}
		}
	}

	return calculatePositionBasedProgress(totalPositions, filledPositions);
};

const calculateQuoteProgress = (quote: QuoteData): number => {
	const substitutionCipherTypes = [
		"K1 Aristocrat",
		"K2 Aristocrat",
		"K3 Aristocrat",
		"K1 Patristocrat",
		"K2 Patristocrat",
		"K3 Patristocrat",
		"Random Aristocrat",
		"Random Patristocrat",
		"Caesar",
		"Atbash",
		"Affine",
		"Nihilist",
		"Fractionated Morse",
		"Xenocrypt",
	];

	if (substitutionCipherTypes.includes(quote.cipherType)) {
		return calculateSubstitutionProgress(quote);
	}

	if (quote.cipherType === "Hill 2x2") {
		return calculateHill2x2Progress(quote);
	}

	if (quote.cipherType === "Hill 3x3") {
		return calculateHill3x3Progress(quote);
	}

	if (quote.cipherType === "Complete Columnar") {
		return calculateColumnarProgress(quote);
	}

	if (quote.cipherType === "Nihilist") {
		return calculateNihilistProgress(quote);
	}

	if (quote.cipherType === "Checkerboard") {
		return calculateCheckerboardProgress(quote);
	}

	if (quote.cipherType === "Fractionated Morse") {
		return calculateFractionatedMorseProgress(quote);
	}

	if (quote.cipherType === "Cryptarithm") {
		return calculateCryptarithmProgress(quote);
	}

	return 0;
};
