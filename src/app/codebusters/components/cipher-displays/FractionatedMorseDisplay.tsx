"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import logger from "@/lib/utils/logging/logger";
import { useMemo, useState } from "react";
import { CharacterDisplay } from "./FractionatedMorse/components/CharacterDisplay";
import { ReplacementTable } from "./FractionatedMorse/components/ReplacementTable";
import {
	buildMappingFromFractionationTable,
	buildMappingFromKey,
} from "./FractionatedMorse/utils/mapping";
import {
	calculatePlaintextLetters,
	removeTrailingPartialTriplets,
} from "./FractionatedMorse/utils/morseProcessing";
import { buildTripletsFromText } from "./FractionatedMorse/utils/tripletProcessing";

// Top-level regex patterns
const UPPERCASE_LETTER_TEST_REGEX = /[A-Z]/;

interface FractionatedMorseDisplayProps {
	text: string;
	quoteIndex: number;
	solution?: { [key: string]: string };
	fractionationTable?: { [key: string]: string };
	isTestSubmitted: boolean;
	quotes: QuoteData[];
	onSolutionChange: (
		quoteIndex: number,
		cipherLetter: string,
		plainLetter: string,
	) => void;
	hintedLetters?: { [questionIndex: number]: { [letter: string]: boolean } };
}

export const FractionatedMorseDisplay = ({
	text,
	quoteIndex,
	solution,
	fractionationTable,
	isTestSubmitted,
	quotes,
	onSolutionChange,
	hintedLetters = {},
}: FractionatedMorseDisplayProps) => {
	const { darkMode } = useTheme();
	const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(
		null,
	);

	const correctMapping = useMemo(() => {
		if (!(isTestSubmitted && quotes[quoteIndex] && fractionationTable)) {
			return {};
		}
		const quote = quotes[quoteIndex];
		if (!quote) {
			return {};
		}
		if (quote.cipherType === "Fractionated Morse") {
			return buildMappingFromFractionationTable(fractionationTable);
		}
		if (quote.key) {
			// Convert string key to array of characters
			const keyArray = quote.key.split("").filter((char) => char.trim() !== "");
			return buildMappingFromKey(keyArray.length > 0 ? keyArray : undefined);
		}
		return {};
	}, [isTestSubmitted, quoteIndex, quotes, fractionationTable]);

	const usedTriplets = useMemo(
		() =>
			fractionationTable
				? Object.keys(fractionationTable)
						.filter((triplet) => triplet !== "xxx" && !triplet.includes("xxx"))
						.sort()
				: [],
		[fractionationTable],
	);

	const cipherToTriplet: { [key: string]: string } = {};
	if (fractionationTable) {
		// fractionationTable is triplet -> letter, so we need to reverse it
		for (const [triplet, letter] of Object.entries(fractionationTable)) {
			cipherToTriplet[letter] = triplet;
		}
	}

	const tripletToCipher: { [key: string]: string } = {};
	if (fractionationTable) {
		// fractionationTable is already triplet -> letter
		Object.assign(tripletToCipher, fractionationTable);
	}

	const handleReplacementTableChange = (triplet: string, newLetter: string) => {
		if (!fractionationTable) {
			return;
		}

		if (newLetter) {
			onSolutionChange(quoteIndex, newLetter.toUpperCase(), triplet);
		} else {
			const previousLetter = solution?.[`replacement_${triplet}`];
			if (previousLetter) {
				onSolutionChange(quoteIndex, previousLetter.toUpperCase(), "");
			}
		}
	};

	const updateReplacementTableFromTriplet = (
		cipherLetter: string,
		triplet: string,
	) => {
		if (!fractionationTable) {
			return;
		}

		logger.log("Updating replacement table from triplet:", {
			cipherLetter,
			triplet,
			fractionationTable,
		});

		const matchingTriplet = usedTriplets.find((t) => t === triplet);
		if (matchingTriplet) {
			logger.log("Found matching triplet:", matchingTriplet);

			// Update the replacement table entry
			onSolutionChange(
				quoteIndex,
				`replacement_${matchingTriplet}`,
				cipherLetter,
			);

			// Also sync all other instances of this cipher letter with the same triplet
			// This matches the behavior when entering a letter in the replacement table
			onSolutionChange(quoteIndex, cipherLetter.toUpperCase(), triplet);
		} else {
			logger.log("No matching triplet found for:", triplet);
			logger.log("Available triplets:", usedTriplets);
		}
	};

	const clearReplacementTableFromTriplet = (
		cipherLetter: string,
		incompleteTriplet: string,
	) => {
		if (!fractionationTable) {
			return;
		}

		logger.log("Clearing replacement table from incomplete triplet:", {
			cipherLetter,
			incompleteTriplet,
		});

		const matchingTriplet = usedTriplets.find((t) => {
			const currentReplacement = solution?.[`replacement_${t}`];
			return currentReplacement === cipherLetter;
		});

		if (matchingTriplet) {
			logger.log("Found triplet to clear:", matchingTriplet);

			onSolutionChange(quoteIndex, `replacement_${matchingTriplet}`, "");
		}
	};

	// Safety check: ensure we have text to display
	if (!text || text.trim().length === 0) {
		return (
			<div className="font-mono">
				<div
					className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
				>
					Fractionated Morse Cipher
				</div>
				<div
					className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
				>
					No encrypted text available
				</div>
			</div>
		);
	}

	return (
		<div className="font-mono">
			<div
				className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Fractionated Morse Cipher
			</div>

			{/* Cipher text */}
			<div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
				{(() => {
					const { triplets, incompleteTriplets } = buildTripletsFromText(
						text,
						isTestSubmitted,
						correctMapping,
						solution,
					);

					const plaintextLetters = calculatePlaintextLetters(triplets);
					removeTrailingPartialTriplets(triplets);

					const charsWithPositions = text
						.split("")
						.map((char, i) => ({ char, position: i }));
					return charsWithPositions.map(({ char, position }) => {
						const isLetter = UPPERCASE_LETTER_TEST_REGEX.test(char);
						// Don't hide cipher letters - display them even if not in validCipherLetters
						// This ensures all encrypted letters are visible
						const value = solution?.[char] || "";
						const isCorrect = Boolean(
							isTestSubmitted &&
								correctMapping[char] &&
								value.toLowerCase() === correctMapping[char].toLowerCase(),
						);
						const isHinted = Boolean(
							isLetter && hintedLetters[quoteIndex]?.[char],
						);
						const showCorrectAnswer = Boolean(isTestSubmitted && isLetter);
						const isSameCipherLetter = Boolean(
							isLetter && focusedCipherLetter === char,
						);
						const plaintextLetter =
							isLetter && !incompleteTriplets.has(position)
								? plaintextLetters[position] || ""
								: "";

						return (
							<CharacterDisplay
								key={`fm-char-${char}-${position}`}
								char={char}
								i={position}
								isLetter={isLetter}
								value={value}
								isCorrect={isCorrect}
								isHinted={isHinted}
								showCorrectAnswer={showCorrectAnswer}
								isSameCipherLetter={isSameCipherLetter}
								plaintextLetter={plaintextLetter}
								correctMappingValue={correctMapping[char] || ""}
								quoteIndex={quoteIndex}
								onSolutionChange={onSolutionChange}
								updateReplacementTableFromTriplet={
									updateReplacementTableFromTriplet
								}
								clearReplacementTableFromTriplet={
									clearReplacementTableFromTriplet
								}
								isTestSubmitted={isTestSubmitted}
								darkMode={darkMode}
								setFocusedCipherLetter={setFocusedCipherLetter}
							/>
						);
					});
				})()}
			</div>

			<ReplacementTable
				usedTriplets={usedTriplets}
				solution={solution}
				fractionationTable={fractionationTable}
				isTestSubmitted={isTestSubmitted}
				darkMode={darkMode}
				quoteIndex={quoteIndex}
				onSolutionChange={onSolutionChange}
				handleReplacementTableChange={handleReplacementTableChange}
			/>

			{/* Show original quote and morse code when test is submitted */}
			{isTestSubmitted && (
				<div
					className={`mt-4 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
				>
					<p
						className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Original Quote & Morse Code:
					</p>
					<p
						className={`font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-900"}`}
					>
						{quotes[quoteIndex]?.quote || ""}
					</p>
				</div>
			)}
		</div>
	);
};
