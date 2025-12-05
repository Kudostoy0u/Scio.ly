"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useCallback } from "react";
import { revealBaconianLetter } from "../utils/baconianRevealer";
import { handleCryptarithmHint } from "../utils/cryptarithmRevealer";
import { revealHillLetter } from "../utils/hillRevealer";
import {
	chooseCribWordFromQuote,
	getAffineHint,
	getBaconianHint,
	getCheckerboardHint,
	getCompleteColumnarHint,
	getGeneralCribHint,
	getXenocryptHint,
} from "../utils/hintContentGenerators";
import {
	revealCheckerboardLetter,
	revealNihilistLetter,
} from "../utils/letterRevealers";
import { getPlainLetterForCipher } from "../utils/plainLetterCalculators";

const UPPERCASE_LETTER_REGEX = /[A-Z]/;

export const useHintSystem = (
	quotes: QuoteData[],
	activeHints: { [questionIndex: number]: boolean },
	setActiveHints: (hints: { [questionIndex: number]: boolean }) => void,
	revealedLetters: { [questionIndex: number]: { [letter: string]: string } },
	setRevealedLetters: (letters: {
		[questionIndex: number]: { [letter: string]: string };
	}) => void,
	setQuotes: (quotes: QuoteData[]) => void,
	hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } },
	setHintedLetters: (letters: {
		[questionIndex: number]: { [letter: string]: boolean };
	}) => void,
	hintCounts: { [questionIndex: number]: number },
	setHintCounts: (counts: { [questionIndex: number]: number }) => void,
) => {
	// Return a stable crib word without mutating state during render
	const ensureCribWordForIndex = useCallback(
		(index: number, sourceText: string): string => {
			const q = quotes[index];
			if (q && typeof q.cribWord === "string" && q.cribWord.length > 0) {
				return q.cribWord;
			}
			return chooseCribWordFromQuote(sourceText);
		},
		[quotes],
	);

	// Helper functions using extracted utilities
	const getBaconianHintWrapper = useCallback(
		(quote: QuoteData): string | null => {
			const currentHintCount = hintCounts[quotes.indexOf(quote)] || 0;
			return getBaconianHint(
				quote,
				currentHintCount,
				ensureCribWordForIndex,
				quotes.indexOf(quote),
			);
		},
		[quotes, hintCounts, ensureCribWordForIndex],
	);

	const getCompleteColumnarHintWrapper = useCallback(
		(quote: QuoteData): string | null => {
			const quoteIndex = quotes.indexOf(quote);
			return getCompleteColumnarHint(
				quote,
				activeHints,
				quoteIndex,
				ensureCribWordForIndex,
			);
		},
		[quotes, activeHints, ensureCribWordForIndex],
	);

	const getAffineHintWrapper = useCallback(
		(quote: QuoteData): string | null => {
			const quoteIndex = quotes.indexOf(quote);
			return getAffineHint(quote, quoteIndex, ensureCribWordForIndex);
		},
		[quotes, ensureCribWordForIndex],
	);

	const getXenocryptHintWrapper = useCallback(
		(quote: QuoteData): string | null => {
			const quoteIndex = quotes.indexOf(quote);
			return getXenocryptHint(quote, quoteIndex, ensureCribWordForIndex);
		},
		[quotes, ensureCribWordForIndex],
	);

	const getGeneralCribHintWrapper = useCallback(
		(quote: QuoteData): string | null => {
			const quoteIndex = quotes.indexOf(quote);
			return getGeneralCribHint(quote, quoteIndex, ensureCribWordForIndex);
		},
		[quotes, ensureCribWordForIndex],
	);

	const getHintContent = useCallback(
		(quote: QuoteData): string => {
			if (!quote) {
				return "No hint available";
			}

			const checkerboardHint = getCheckerboardHint(quote);
			if (checkerboardHint) {
				return checkerboardHint;
			}

			const baconianHint = getBaconianHintWrapper(quote);
			if (baconianHint) {
				return baconianHint;
			}

			const columnarHint = getCompleteColumnarHintWrapper(quote);
			if (columnarHint) {
				return columnarHint;
			}

			const affineHint = getAffineHintWrapper(quote);
			if (affineHint) {
				return affineHint;
			}

			const xenocryptHint = getXenocryptHintWrapper(quote);
			if (xenocryptHint) {
				return xenocryptHint;
			}

			const generalHint = getGeneralCribHintWrapper(quote);
			if (generalHint) {
				return generalHint;
			}

			return "No hint found";
		},
		[
			getBaconianHintWrapper,
			getCompleteColumnarHintWrapper,
			getAffineHintWrapper,
			getXenocryptHintWrapper,
			getGeneralCribHintWrapper,
		],
	);

	// Use extracted reveal functions
	const revealCheckerboardLetterWrapper = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return revealCheckerboardLetter(questionIndex, quote, quotes, setQuotes);
		},
		[quotes, setQuotes],
	);

	const revealNihilistLetterWrapper = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return revealNihilistLetter(questionIndex, quote, quotes, setQuotes);
		},
		[quotes, setQuotes],
	);

	const revealBaconianLetterWrapper = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return revealBaconianLetter(questionIndex, quote, quotes, setQuotes);
		},
		[quotes, setQuotes],
	);

	const revealHillLetterWrapper = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return revealHillLetter(questionIndex, quote, quotes, setQuotes);
		},
		[quotes, setQuotes],
	);

	// Use extracted plain letter calculator
	const getPlainLetterForCipherWrapper = useCallback(
		(quote: QuoteData, randomCipherLetter: string): string => {
			return getPlainLetterForCipher(quote, randomCipherLetter);
		},
		[],
	);

	const updateSolutionForFractionatedMorse = useCallback(
		(
			solution: { [key: string]: string },
			q: QuoteData,
			randomCipherLetter: string,
		): { [key: string]: string } => {
			if (q.cipherType !== "Fractionated Morse" || !q.fractionationTable) {
				return solution;
			}
			for (const [triplet, letter] of Object.entries(q.fractionationTable)) {
				if (letter === randomCipherLetter) {
					return {
						...solution,
						[`replacement_${triplet}`]: randomCipherLetter,
					};
				}
			}
			return solution;
		},
		[],
	);

	const updateRevealedLetterState = useCallback(
		(
			questionIndex: number,
			randomCipherLetter: string,
			correctPlainLetter: string,
		): void => {
			const newRevealedLetters = {
				...revealedLetters,
				[questionIndex]: {
					...revealedLetters[questionIndex],
					[randomCipherLetter]: correctPlainLetter,
				},
			};
			setRevealedLetters(newRevealedLetters);

			const newHintedLetters = {
				...hintedLetters,
				[questionIndex]: {
					...hintedLetters[questionIndex],
					[randomCipherLetter]: true,
				},
			};
			setHintedLetters(newHintedLetters);

			const newQuotes = quotes.map((q, idx) => {
				if (idx === questionIndex) {
					let updatedSolution = {
						...q.solution,
						[randomCipherLetter]: correctPlainLetter,
					};
					updatedSolution = updateSolutionForFractionatedMorse(
						updatedSolution,
						q,
						randomCipherLetter,
					);
					return {
						...q,
						solution: updatedSolution,
					};
				}
				return q;
			});
			setQuotes(newQuotes);
		},
		[
			quotes,
			revealedLetters,
			hintedLetters,
			setRevealedLetters,
			setHintedLetters,
			setQuotes,
			updateSolutionForFractionatedMorse,
		],
	);

	const getAvailableLetters = useCallback(
		(quote: QuoteData, questionIndex: number): string[] => {
			return quote.encrypted
				.toUpperCase()
				.split("")
				.filter((char: string) => char && UPPERCASE_LETTER_REGEX.test(char))
				.filter((char: string) => !revealedLetters[questionIndex]?.[char]);
		},
		[revealedLetters],
	);

	const updateHintCount = useCallback(
		(questionIndex: number): void => {
			const currentHintCount = hintCounts[questionIndex] || 0;
			const newHintCount = currentHintCount + 1;
			const newHintCounts = { ...hintCounts, [questionIndex]: newHintCount };
			setHintCounts(newHintCounts);
		},
		[hintCounts, setHintCounts],
	);

	const tryRevealSpecialCipher = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return (
				revealCheckerboardLetterWrapper(questionIndex, quote) ||
				revealNihilistLetterWrapper(questionIndex, quote) ||
				revealBaconianLetterWrapper(questionIndex, quote) ||
				revealHillLetterWrapper(questionIndex, quote)
			);
		},
		[
			revealCheckerboardLetterWrapper,
			revealNihilistLetterWrapper,
			revealBaconianLetterWrapper,
			revealHillLetterWrapper,
		],
	);

	const revealRandomLetter = useCallback(
		(questionIndex: number) => {
			const quote = quotes[questionIndex];
			if (!quote) {
				return;
			}
			updateHintCount(questionIndex);
			if (tryRevealSpecialCipher(questionIndex, quote)) {
				return;
			}
			const availableLetters = getAvailableLetters(quote, questionIndex);
			if (availableLetters.length === 0) {
				return;
			}
			const randomIndex = Math.floor(Math.random() * availableLetters.length);
			const randomCipherLetter = availableLetters[randomIndex];
			if (!randomCipherLetter) {
				return;
			}
			const correctPlainLetter = getPlainLetterForCipherWrapper(
				quote,
				randomCipherLetter,
			);
			if (correctPlainLetter) {
				updateRevealedLetterState(
					questionIndex,
					randomCipherLetter,
					correctPlainLetter,
				);
			}
		},
		[
			quotes,
			getPlainLetterForCipherWrapper,
			updateRevealedLetterState,
			getAvailableLetters,
			updateHintCount,
			tryRevealSpecialCipher,
		],
	);

	// Use extracted cryptarithm handler
	const handleCryptarithmHintWrapper = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			return handleCryptarithmHint(questionIndex, quote, quotes, setQuotes);
		},
		[quotes, setQuotes],
	);

	const handleBaconianHint = useCallback(
		(questionIndex: number, quote: QuoteData): boolean => {
			if (quote.cipherType !== "Baconian") {
				return false;
			}
			const currentHintCount = hintCounts[questionIndex] || 0;
			if (currentHintCount === 0) {
				setActiveHints({
					...activeHints,
					[questionIndex]: true,
				});
				const newHintCounts = { ...hintCounts, [questionIndex]: 1 };
				setHintCounts(newHintCounts);
				return true;
			}
			if (currentHintCount === 1) {
				const words = (quote.quote.match(/[A-Za-z]+/g) || [])
					.map((w) => w.toUpperCase())
					.filter((w) => w.length >= 3)
					.sort((a, b) => a.length - b.length);
				if (words.length > 0) {
					setActiveHints({
						...activeHints,
						[questionIndex]: true,
					});
				} else {
					revealRandomLetter(questionIndex);
				}
				return true;
			}
			revealRandomLetter(questionIndex);
			return true;
		},
		[
			activeHints,
			setActiveHints,
			hintCounts,
			setHintCounts,
			revealRandomLetter,
		],
	);

	const handleCribHint = useCallback(
		(questionIndex: number, quote: QuoteData): void => {
			const hintContent = getHintContent(quote);
			const hasCrib =
				hintContent.includes("Crib:") && !hintContent.includes("No crib found");
			if (!hasCrib) {
				revealRandomLetter(questionIndex);
				return;
			}
			if (!activeHints[questionIndex]) {
				setActiveHints({
					...activeHints,
					[questionIndex]: true,
				});
				return;
			}
			if (
				quote.cipherType === "Complete Columnar" &&
				!activeHints[`${questionIndex}_second_crib` as unknown as number]
			) {
				setActiveHints({
					...activeHints,
					[`${questionIndex}_second_crib`]: true,
				});
				return;
			}
			revealRandomLetter(questionIndex);
		},
		[activeHints, setActiveHints, getHintContent, revealRandomLetter],
	);

	const handleHintClick = useCallback(
		(questionIndex: number) => {
			const quote = quotes[questionIndex];
			if (!quote) {
				return;
			}
			if (handleCryptarithmHintWrapper(questionIndex, quote)) {
				return;
			}
			if (handleBaconianHint(questionIndex, quote)) {
				return;
			}
			handleCribHint(questionIndex, quote);
		},
		[quotes, handleCryptarithmHintWrapper, handleBaconianHint, handleCribHint],
	);

	return {
		getHintContent,
		handleHintClick,
	};
};
