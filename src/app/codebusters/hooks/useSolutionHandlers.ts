import type { QuoteData } from "@/app/codebusters/types";
import { type Dispatch, type SetStateAction, useCallback } from "react";

// Top-level regex patterns
const TRIPLE_OR_MORE_SPACES_REGEX = /\s{3,}/;
const WHITESPACE_REGEX = /\s+/;

// Helper function to build tokens from encrypted text
const buildTokensFromEncrypted = (encrypted: string): string[] => {
	const blocks = encrypted.trim().split(TRIPLE_OR_MORE_SPACES_REGEX);
	const tokens: string[] = [];
	for (const block of blocks) {
		const compact = block.replace(WHITESPACE_REGEX, "");
		for (let i = 0; i < compact.length; i += 2) {
			const a = compact[i];
			if (a) {
				const b = compact[i + 1] || "";
				tokens.push(b ? a + b : a);
			}
		}
	}
	return tokens;
};

// Helper function to update checkerboard solution
const updateCheckerboardSolution = (
	tokens: string[],
	position: number,
	plainLetter: string,
	currentSolution: { [key: number]: string } | undefined,
): { [key: number]: string } => {
	const updated: { [key: number]: string } = { ...(currentSolution || {}) };
	const targetToken = tokens[position];
	const upper = plainLetter.toUpperCase();
	for (let idx = 0; idx < tokens.length; idx++) {
		if (tokens[idx] === targetToken) {
			updated[idx] = upper;
		}
	}
	return updated;
};

export const useSolutionHandlers = (
	_quotes: QuoteData[],
	setQuotes: Dispatch<SetStateAction<QuoteData[]>>,
) => {
	const handleSolutionChange = useCallback(
		(quoteIndex: number, cipherLetter: string, plainLetter: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) =>
					index === quoteIndex
						? {
								...quote,
								solution: {
									...(quote.solution || {}),
									[cipherLetter]: plainLetter,
								},
							}
						: quote,
				),
			);
		},
		[setQuotes],
	);

	const handleBaconianSolutionChange = useCallback(
		(quoteIndex: number, position: number, plainLetter: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) =>
					index === quoteIndex
						? {
								...quote,
								solution: {
									...(quote.solution || {}),
									[position]: plainLetter.toUpperCase(),
								},
							}
						: quote,
				),
			);
		},
		[setQuotes],
	);

	const handleFrequencyNoteChange = useCallback(
		(quoteIndex: number, letter: string, note: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) =>
					index === quoteIndex
						? {
								...quote,
								frequencyNotes: {
									...(quote.frequencyNotes || {}),
									[letter]: note,
								},
							}
						: quote,
				),
			);
		},
		[setQuotes],
	);

	const handleHillSolutionChange = useCallback(
		(
			quoteIndex: number,
			type: "matrix" | "plaintext",
			value: string[][] | { [key: number]: string },
		) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) =>
					index === quoteIndex
						? {
								...quote,
								hillSolution: {
									...(quote.hillSolution || { matrix: [], plaintext: {} }),
									[type]: value,
								} as {
									matrix: string[][];
									plaintext: { [key: number]: string };
								},
							}
						: quote,
				),
			);
		},
		[setQuotes],
	);

	const handleNihilistSolutionChange = useCallback(
		(quoteIndex: number, position: number, plainLetter: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) => {
					if (index === quoteIndex) {
						return {
							...quote,
							nihilistSolution: {
								...(quote.nihilistSolution || {}),
								[position]: plainLetter,
							},
						};
					}
					return quote;
				}),
			);
		},
		[setQuotes],
	);

	const handleCheckerboardSolutionChange = useCallback(
		(quoteIndex: number, position: number, plainLetter: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) => {
					if (index !== quoteIndex) {
						return quote;
					}

					const tokens = buildTokensFromEncrypted(quote.encrypted || "");
					const updated = updateCheckerboardSolution(
						tokens,
						position,
						plainLetter,
						quote.checkerboardSolution,
					);

					return {
						...quote,
						checkerboardSolution: updated,
					};
				}),
			);
		},
		[setQuotes],
	);

	const handleKeywordSolutionChange = useCallback(
		(quoteIndex: number, keyword: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) =>
					index === quoteIndex ? { ...quote, keywordSolution: keyword } : quote,
				),
			);
		},
		[setQuotes],
	);

	const handleCryptarithmSolutionChange = useCallback(
		(quoteIndex: number, position: number, plainLetter: string) => {
			setQuotes((prevQuotes) =>
				prevQuotes.map((quote, index) => {
					if (index === quoteIndex) {
						return {
							...quote,
							cryptarithmSolution: {
								...(quote.cryptarithmSolution || {}),
								[position]: plainLetter.toUpperCase(),
							},
						};
					}
					return quote;
				}),
			);
		},
		[setQuotes],
	);

	return {
		handleSolutionChange,
		handleBaconianSolutionChange,
		handleFrequencyNoteChange,
		handleHillSolutionChange,
		handleNihilistSolutionChange,
		handleCheckerboardSolutionChange,
		handleKeywordSolutionChange,
		handleCryptarithmSolutionChange,
	};
};
