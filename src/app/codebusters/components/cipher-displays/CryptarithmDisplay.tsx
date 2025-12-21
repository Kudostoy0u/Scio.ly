import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import logger from "@/lib/utils/logging/logger";
import React, { useCallback } from "react";

// Regex for splitting equation parts (moved to top level for performance)
const EQUATION_SPLIT_REGEX = /\s*[+\-=]\s*/;

interface CryptarithmDisplayProps {
	text: string;
	quoteIndex: number;
	solution: { [key: number]: string } | undefined;
	isTestSubmitted: boolean;
	quotes: QuoteData[];
	onSolutionChange: (
		quoteIndex: number,
		position: number,
		letter: string,
	) => void;
	cryptarithmData?: {
		equation: string;
		numericExample: string | null;
		digitGroups: Array<{
			digits: string;
			word: string;
		}>;
		operation?: "+" | "-";
	};
}

export const CryptarithmDisplay: React.FC<CryptarithmDisplayProps> = ({
	text: _text,
	quoteIndex,
	solution,
	isTestSubmitted,
	quotes: _quotes,
	onSolutionChange,
	cryptarithmData,
}) => {
	const { darkMode } = useTheme();
	// Track which cells the user has clicked in the grid (letter -> digit)
	const [clickedCells, setClickedCells] = React.useState<{
		[letter: string]: string;
	}>({});
	// Track which input is currently selected (position in display coordinates)
	const [selectedInputPosition, setSelectedInputPosition] = React.useState<
		number | null
	>(null);

	// Helper function to get input className
	const getDigitInputClassName = (
		isTestSubmitted: boolean,
		isHinted: boolean,
		isCorrect: boolean,
		isSelected: boolean,
		_isBoundary: boolean,
	): string => {
		const baseClasses =
			"w-8 h-8 md:w-10 md:h-10 text-center border rounded text-sm font-mono focus:outline-none focus:ring-0 cursor-pointer";
		if (isTestSubmitted) {
			if (isHinted) {
				return `${baseClasses} border-yellow-500 text-yellow-800 bg-transparent`;
			}
			return isCorrect
				? `${baseClasses} border-green-500 text-green-800 bg-transparent`
				: `${baseClasses} border-red-500 text-red-800 bg-transparent`;
		}
		if (isSelected) {
			return `${baseClasses} border-blue-500 ${darkMode ? "bg-blue-900/40" : "bg-blue-100"}`;
		}
		return `${baseClasses} ${darkMode ? "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500" : "bg-white border-gray-300 text-gray-900 hover:border-gray-400"}`;
	};

	// Digit input component (extracted to reduce complexity)
	const DigitInput = ({
		digit,
		position,
		value,
		isCorrect,
		isHinted,
		isBoundary,
		correctLetter,
		quoteIndex,
		isTestSubmitted,
		darkMode,
		selectedInputPosition,
		setSelectedInputPosition,
	}: {
		digit: string;
		position: number;
		value: string;
		isCorrect: boolean;
		isHinted: boolean;
		isBoundary: boolean;
		correctLetter: string | undefined;
		quoteIndex: number;
		isTestSubmitted: boolean;
		darkMode: boolean;
		selectedInputPosition: number | null;
		setSelectedInputPosition: (pos: number | null) => void;
	}) => {
		const isSelected = selectedInputPosition === position;

		return (
			<React.Fragment key={`${digit}-${position}`}>
				<div className="flex flex-col items-center justify-start">
					<div
						className={`text-xs mb-1 font-mono ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						{digit}
					</div>
					<input
						type="text"
						id={`cryptarithm-${quoteIndex}-${position}`}
						name={`cryptarithm-${quoteIndex}-${position}`}
						maxLength={1}
						value={value || ""}
						readOnly={!isTestSubmitted}
						disabled={isTestSubmitted}
						onClick={() => {
							if (!isTestSubmitted) {
								setSelectedInputPosition(position);
							}
						}}
						autoComplete="off"
						className={getDigitInputClassName(
							isTestSubmitted,
							isHinted,
							isCorrect,
							isSelected,
							isBoundary,
						)}
					/>
					{/* Show correct letter below input when incorrect (red outline) */}
					{isTestSubmitted && !isCorrect && correctLetter && (
						<div
							className={`mt-1 text-[10px] ${darkMode ? "text-red-400" : "text-red-600"}`}
						>
							{correctLetter}
						</div>
					)}
				</div>
				{isBoundary && <div className="w-4" />}
			</React.Fragment>
		);
	};

	// Calculate position offset (number of letters in equation words before solution words)
	const positionOffset = React.useMemo(() => {
		if (!cryptarithmData?.digitGroups || !cryptarithmData.equation) {
			return 0;
		}

		const equationWordsSet = new Set<string>();
		const parts = cryptarithmData.equation
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

		let offset = 0;
		for (const group of cryptarithmData.digitGroups) {
			const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
			if (equationWordsSet.has(wordUpper)) {
				offset += group.word.replace(/\s/g, "").length;
			} else {
				// We've reached solution words, stop counting
				break;
			}
		}
		return offset;
	}, [cryptarithmData]);

	const inlineDigits = React.useMemo(() => {
		if (!cryptarithmData?.digitGroups) {
			return { digits: [] as string[], boundaries: new Set<number>() };
		}

		// Identify equation words to exclude from "Values to decode for solution"
		const equationWordsSet = new Set<string>();
		if (cryptarithmData.equation) {
			const parts = cryptarithmData.equation
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
		}

		// Filter out equation words from digitGroups
		const solutionGroups = cryptarithmData.digitGroups.filter((group) => {
			const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
			return !equationWordsSet.has(wordUpper);
		});

		// Log which words are being displayed in "values to decode for solution"
		const solutionWordsList = solutionGroups
			.map((group) => group.word.replace(/\s/g, ""))
			.join(", ");
		logger.log(
			`[Cryptarithm Display] Words displayed in "values to decode for solution": ${solutionWordsList || "(none - all were equation words)"}`,
		);

		// If we have no solution groups (all were equation words), return empty
		if (solutionGroups.length === 0) {
			return { digits: [] as string[], boundaries: new Set<number>() };
		}

		const digits: string[] = [];
		const boundaries = new Set<number>();
		solutionGroups.forEach((group, gi) => {
			const word = group.word.replace(/\s/g, "");
			const parts = group.digits.split(" ").filter(Boolean);
			const wordStartIdx = digits.length;

			// Validate that digits count matches word length
			if (parts.length !== word.length) {
				logger.log(
					`[Cryptarithm Display] WARNING: Word "${word}" has ${word.length} letters but ${parts.length} digits. Digits: "${group.digits}"`,
				);
			}

			for (const d of parts) {
				digits.push(d);
			}
			const wordEndIdx = digits.length - 1;
			// Add boundary at the last position of this word (except for the last word)
			if (gi < solutionGroups.length - 1 && wordEndIdx >= 0) {
				boundaries.add(wordEndIdx);
			}
			logger.log(
				`[Cryptarithm Display] Word "${word}" (${word.length} letters) spans positions ${wordStartIdx}-${wordEndIdx}, digits: "${parts.join("")}", boundary at ${wordEndIdx}`,
			);
		});
		logger.log(
			`[Cryptarithm Display] Total digits: ${digits.length}, boundaries at: ${Array.from(
				boundaries,
			)
				.sort((a, b) => a - b)
				.join(", ")}`,
		);
		logger.log(`[Cryptarithm Display] All digits: "${digits.join("")}"`);
		return { digits, boundaries };
	}, [cryptarithmData]);

	const digitToPositions = React.useMemo(() => {
		const map: { [digit: string]: number[] } = {};
		inlineDigits.digits.forEach((d, i) => {
			if (!map[d]) {
				map[d] = [];
			}
			map[d].push(i);
		});
		return map;
	}, [inlineDigits]);

	// Helper function to build correct mapping
	const buildCorrectMapping = useCallback(
		(
			data: CryptarithmDisplayProps["cryptarithmData"],
			isTestSubmitted: boolean,
		): { [key: number]: string } => {
			const mapping: { [key: number]: string } = {};
			if (!(isTestSubmitted && data?.digitGroups)) {
				return mapping;
			}

			// Identify equation words to exclude (same logic as inlineDigits)
			const equationWordsSet = new Set<string>();
			if (data.equation) {
				const parts = data.equation.split(EQUATION_SPLIT_REGEX).filter(Boolean);
				if (parts.length === 3) {
					const [w1, w2, w3] = parts;
					if (w1 && w2 && w3) {
						equationWordsSet.add(w1.toUpperCase());
						equationWordsSet.add(w2.toUpperCase());
						equationWordsSet.add(w3.toUpperCase());
					}
				}
			}

			// Filter out equation words to match inlineDigits
			const solutionGroups = data.digitGroups.filter(
				(group: { digits: string; word: string }) => {
					const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
					return !equationWordsSet.has(wordUpper);
				},
			);

			// Build mapping only from solution words (matching inlineDigits)
			const allLetters = solutionGroups
				.map((group: { digits: string; word: string }) =>
					group.word.replace(/\s/g, ""),
				)
				.join("");
			for (let i = 0; i < allLetters.length; i++) {
				const letter = allLetters[i];
				if (letter !== undefined) {
					mapping[i] = letter;
				}
			}
			return mapping;
		},
		[],
	);

	const correctMapping = React.useMemo(
		() => buildCorrectMapping(cryptarithmData, isTestSubmitted),
		[cryptarithmData, isTestSubmitted, buildCorrectMapping],
	);

	// Parse equation for grid-style display
	const equationData = React.useMemo(() => {
		if (!(cryptarithmData?.equation && cryptarithmData.digitGroups)) {
			return null;
		}

		const operation =
			cryptarithmData.operation ||
			(cryptarithmData.equation.includes("-") ? "-" : "+");
		const parts = cryptarithmData.equation
			.split(EQUATION_SPLIT_REGEX)
			.filter(Boolean);
		if (parts.length !== 3) {
			return null;
		}

		const [w1, w2, w3] = parts;
		if (!(w1 && w2 && w3)) {
			return null;
		}
		const maxLen = Math.max(w1.length || 0, w2.length || 0, w3.length || 0);

		return { w1, w2, w3, maxLen, operation };
	}, [cryptarithmData]);

	// Extract all unique letters from equation and sort alphabetically
	const equationLetters = React.useMemo(() => {
		if (!equationData) return [];
		const lettersSet = new Set<string>();
		for (const ch of equationData.w1 + equationData.w2 + equationData.w3) {
			lettersSet.add(ch);
		}
		return Array.from(lettersSet).sort();
	}, [equationData]);

	// Handle keyboard input when an input is selected
	React.useEffect(() => {
		if (isTestSubmitted || selectedInputPosition === null) return;

		const handleKeyPress = (e: globalThis.KeyboardEvent) => {
			// Only handle if a letter key is pressed
			if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
				const letter = e.key.toUpperCase();

				// Check if letter is valid for this cryptarithm
				if (!equationLetters.includes(letter)) {
					return;
				}

				// Find the selected input's position and digit
				const position = selectedInputPosition;
				const digit = inlineDigits.digits[position];
				if (digit === undefined) return;

				// Process the input
				const val = letter;

				// Check if this letter is already mapped to a different digit
				const existingDigitForLetter = clickedCells[val];
				if (existingDigitForLetter && existingDigitForLetter !== digit) {
					// This letter is already mapped to a different digit - clear all positions with that digit
					let clearPosition = 0;
					for (const group of cryptarithmData?.digitGroups ?? []) {
						const digits = group.digits.split(" ").filter(Boolean);
						for (let i = 0; i < digits.length; i++) {
							const posDigit = digits[i];
							if (posDigit === existingDigitForLetter) {
								const currentSolutionLetter = solution?.[clearPosition];
								if (
									currentSolutionLetter &&
									currentSolutionLetter.toUpperCase() === val
								) {
									onSolutionChange(quoteIndex, clearPosition, "");
								}
							}
							clearPosition++;
						}
					}
				}

				// If entering a duplicate letter in solution words, clear all other positions in solution words with that letter first
				if (
					val &&
					equationLetters.includes(val) &&
					solution &&
					cryptarithmData?.digitGroups
				) {
					// Build equation words set once
					const equationWordsSet = new Set<string>();
					if (cryptarithmData.equation) {
						const parts = cryptarithmData.equation
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
					}

					// Find all positions in solution words (not equation words) that have this letter
					let checkPosition = positionOffset;
					for (const group of cryptarithmData.digitGroups) {
						const wordUpper = group.word.replace(/\s/g, "").toUpperCase();
						const isEquationWord = equationWordsSet.has(wordUpper);

						if (!isEquationWord) {
							const digits = group.digits.split(" ").filter(Boolean);
							for (let i = 0; i < digits.length; i++) {
								const solutionPos = checkPosition;
								const currentSolutionLetter = solution?.[solutionPos];
								if (
									currentSolutionLetter &&
									currentSolutionLetter.toUpperCase() === val &&
									solutionPos !== position + positionOffset
								) {
									onSolutionChange(quoteIndex, solutionPos, "");
								}
								checkPosition++;
							}
						} else {
							const digits = group.digits.split(" ").filter(Boolean);
							checkPosition += digits.length;
						}
					}
				}

				// Update all positions with this digit
				const positions = digitToPositions[digit] || [position];
				for (const p of positions) {
					onSolutionChange(quoteIndex, p + positionOffset, val);
				}

				// Sync with grid
				if (val && equationLetters.includes(val)) {
					const previousLetter = Object.keys(clickedCells).find(
						(l) => clickedCells[l] === digit && l !== val,
					);

					setClickedCells((prev) => {
						const next = { ...prev };
						if (previousLetter) {
							delete next[previousLetter];
						}
						next[val] = digit;
						return next;
					});
				}
			} else if (e.key === "Backspace" || e.key === "Delete") {
				// Handle deletion
				const position = selectedInputPosition;
				const digit = inlineDigits.digits[position];
				if (digit === undefined) return;

				const positions = digitToPositions[digit] || [position];
				for (const p of positions) {
					onSolutionChange(quoteIndex, p + positionOffset, "");
				}

				// Clear grid selection
				setClickedCells((prev) => {
					const next = { ...prev };
					const letterToRemove = Object.keys(next).find(
						(l) => next[l] === digit,
					);
					if (letterToRemove) {
						delete next[letterToRemove];
					}
					return next;
				});
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => {
			window.removeEventListener("keydown", handleKeyPress);
		};
	}, [
		selectedInputPosition,
		isTestSubmitted,
		equationLetters,
		inlineDigits,
		digitToPositions,
		positionOffset,
		solution,
		cryptarithmData,
		onSolutionChange,
		quoteIndex,
		clickedCells,
	]);

	// Build letter to digit mapping from solution (reverse: letter -> what digit it represents)
	const letterToDigit = React.useMemo(() => {
		const mapping: { [letter: string]: string } = {};
		if (!solution || !cryptarithmData?.digitGroups) return mapping;

		let position = 0;
		for (const group of cryptarithmData.digitGroups) {
			const digits = group.digits.split(" ").filter(Boolean);
			const word = group.word.replace(/\s/g, "");
			for (let i = 0; i < word.length && i < digits.length; i++) {
				const letter = word[i];
				const digit = digits[i];
				const solutionLetter = solution[position];
				// If user entered this letter for this position, map letter -> digit
				if (
					letter &&
					digit &&
					solutionLetter &&
					solutionLetter.toUpperCase() === letter.toUpperCase()
				) {
					mapping[letter.toUpperCase()] = digit;
				}
				position++;
			}
		}
		return mapping;
	}, [solution, cryptarithmData]);

	// Handle letter-to-digit grid input change
	const handleLetterDigitChange = useCallback(
		(letter: string, digit: string) => {
			// When user enters a digit for a letter, we need to update all positions where that letter appears
			// But we need to find which digit corresponds to which position
			if (!cryptarithmData?.digitGroups) return;

			// Check if this digit is already selected for this letter (based on clicked cells)
			const isAlreadySelected = clickedCells[letter] === digit;

			// If clicking the same cell, clear it
			if (isAlreadySelected) {
				// Clear all positions with this digit
				let position = 0;
				for (const group of cryptarithmData.digitGroups) {
					const digits = group.digits.split(" ").filter(Boolean);
					for (let i = 0; i < digits.length; i++) {
						const posDigit = digits[i];
						if (posDigit === digit) {
							const currentSolution = solution?.[position];
							// Only clear if the current solution matches this letter
							if (
								currentSolution &&
								currentSolution.toUpperCase() === letter.toUpperCase()
							) {
								onSolutionChange(quoteIndex, position, "");
							}
						}
						position++;
					}
				}

				// Clear the click
				setClickedCells((prev) => {
					const next = { ...prev };
					delete next[letter];
					return next;
				});
				return;
			}
			// Find any other letter that has this digit selected and clear it
			const previousLetter = Object.keys(clickedCells).find(
				(l) => clickedCells[l] === digit && l !== letter,
			);

			// Update clicked cells state - remove previous letter's selection and add new one
			setClickedCells((prev) => {
				const next = { ...prev };
				if (previousLetter) {
					delete next[previousLetter];
				}
				next[letter] = digit;
				return next;
			});

			// Clear the previous letter's solution if it existed
			if (previousLetter) {
				const previousDigit =
					letterToDigit[previousLetter] || clickedCells[previousLetter];
				if (previousDigit) {
					let position = 0;
					for (const group of cryptarithmData.digitGroups) {
						const digits = group.digits.split(" ").filter(Boolean);
						for (let i = 0; i < digits.length; i++) {
							const posDigit = digits[i];
							if (posDigit === previousDigit) {
								const currentSolution = solution?.[position];
								if (
									currentSolution &&
									currentSolution.toUpperCase() === previousLetter.toUpperCase()
								) {
									onSolutionChange(quoteIndex, position, "");
								}
							}
							position++;
						}
					}
				}
			}

			// Check if this digit is already selected for this letter (based on solution)
			const currentDigit = letterToDigit[letter];
			const isAlreadySelectedInSolution = currentDigit === digit;

			// If clicking the same cell (already selected), clear all positions with this digit
			if (isAlreadySelectedInSolution) {
				let position = 0;
				for (const group of cryptarithmData.digitGroups) {
					const digits = group.digits.split(" ").filter(Boolean);
					for (let i = 0; i < digits.length; i++) {
						const posDigit = digits[i];
						// Clear all positions with this digit
						if (posDigit === digit) {
							onSolutionChange(quoteIndex, position, "");
						}
						position++;
					}
				}
				return;
			}

			// First, clear any existing mapping for this letter (if it was mapped to a different digit)
			// Find all positions where this letter was previously set and clear them
			if (currentDigit) {
				let position = 0;
				for (const group of cryptarithmData.digitGroups) {
					const digits = group.digits.split(" ").filter(Boolean);
					for (let i = 0; i < digits.length; i++) {
						const posDigit = digits[i];
						// Clear positions where this letter was mapped to the old digit
						if (posDigit === currentDigit) {
							const currentSolution = solution?.[position];
							// Only clear if the current solution matches this letter
							if (
								currentSolution &&
								currentSolution.toUpperCase() === letter.toUpperCase()
							) {
								onSolutionChange(quoteIndex, position, "");
							}
						}
						position++;
					}
				}
			}

			// Now set all positions with this digit to the letter (regardless of what letter should be there)
			let position = 0;
			for (const group of cryptarithmData.digitGroups) {
				const digits = group.digits.split(" ").filter(Boolean);
				for (let i = 0; i < digits.length; i++) {
					const posDigit = digits[i];
					// If this position has the clicked digit, set it to the letter
					if (posDigit === digit) {
						onSolutionChange(quoteIndex, position, letter.toUpperCase());
					}
					position++;
				}
			}
		},
		[
			cryptarithmData,
			onSolutionChange,
			quoteIndex,
			letterToDigit,
			clickedCells,
			solution,
		],
	);

	// Get correct digit for each letter (for showing after submission)
	const correctLetterToDigit = React.useMemo(() => {
		const mapping: { [letter: string]: string } = {};
		if (!cryptarithmData?.digitGroups) return mapping;

		logger.log("All digitGroups:", cryptarithmData.digitGroups);

		// First, extract mapping from equation words (w1, w2, w3) - these are the authoritative source
		// Process them in order and only set mapping if letter not already mapped
		if (equationData) {
			const equationWords = [equationData.w1, equationData.w2, equationData.w3];
			logger.log("Equation words to match:", equationWords);

			// Process equation words first, in order
			for (const eqWord of equationWords) {
				const eqWordUpper = eqWord.toUpperCase();
				const matchingGroup = cryptarithmData.digitGroups.find(
					(group) =>
						group.word.replace(/\s/g, "").toUpperCase() === eqWordUpper,
				);

				if (matchingGroup) {
					const digits = matchingGroup.digits.split(" ").filter(Boolean);
					logger.log(
						`Found equation word "${eqWord}" with digits="${digits.join("")}"`,
					);

					for (let i = 0; i < eqWord.length && i < digits.length; i++) {
						const letter = eqWord[i]?.toUpperCase();
						const digit = digits[i];
						if (letter && digit) {
							// Only set if not already mapped (first occurrence wins)
							if (!mapping[letter]) {
								mapping[letter] = digit;
							} else if (mapping[letter] !== digit) {
								logger.log(
									`WARNING: Letter ${letter} already mapped to ${mapping[letter]}, but word "${eqWord}" position ${i} has ${digit}`,
								);
							}
						}
					}
				} else {
					logger.log(
						`WARNING: Equation word "${eqWord}" not found in digitGroups!`,
					);
				}
			}
		}

		// Then, fill in any missing letters from solution words
		for (const group of cryptarithmData.digitGroups) {
			const digits = group.digits.split(" ").filter(Boolean);
			const word = group.word.replace(/\s/g, "");
			for (let i = 0; i < word.length && i < digits.length; i++) {
				const letter = word[i]?.toUpperCase();
				const digit = digits[i];
				// Only add if not already mapped (equation words take precedence)
				if (letter && digit && !mapping[letter]) {
					mapping[letter] = digit;
				}
			}
		}
		logger.log("Final Letter to Digit Mapping:", mapping);
		return mapping;
	}, [cryptarithmData, equationData]);

	return (
		<div className="space-y-4">
			{/* Grid-style equation on left, letter-to-digit mapping grid on right */}
			{equationData && (
				<div className="mb-4 flex flex-col md:flex-row items-center">
					{/* Left: Grid-style equation */}
					<div className="md:flex-[4] md:min-w-0 w-full md:w-auto md:ml-12">
						<div className="flex justify-center md:justify-start">
							<div className="font-mono flex items-start">
								{/* Operation icon on the left - centered vertically between the two words */}
								<div
									className="flex items-center mr-2"
									style={{ height: "72px" }}
								>
									{equationData.operation === "+" ? (
										<svg
											className={`w-6 h-6 ${darkMode ? "text-gray-300" : "text-gray-900"}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-label="Plus sign"
										>
											<title>Plus sign</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 4v16m8-8H4"
											/>
										</svg>
									) : (
										<svg
											className={`w-6 h-6 ${darkMode ? "text-gray-300" : "text-gray-900"}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-label="Minus sign"
										>
											<title>Minus sign</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M20 12H4"
											/>
										</svg>
									)}
								</div>
								{/* Words aligned to the right */}
								<div className="flex-1">
									{/* First word - right aligned */}
									<div className="flex justify-end mb-1">
										{(() => {
											const letters: Array<{ letter: string; key: string }> =
												[];
											for (let i = 0; i < equationData.w1.length; i++) {
												const letter = equationData.w1[i];
												if (letter) {
													letters.push({
														letter,
														key: `w1-${equationData.w1.slice(0, i + 1)}`,
													});
												}
											}
											return letters.map(({ letter, key }) => (
												<div
													key={key}
													className={`w-8 h-8 flex items-center justify-center text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}
												>
													{letter}
												</div>
											));
										})()}
									</div>
									{/* Second word - right aligned */}
									<div className="flex justify-end mb-1">
										{(() => {
											const letters: Array<{ letter: string; key: string }> =
												[];
											for (let i = 0; i < equationData.w2.length; i++) {
												const letter = equationData.w2[i];
												if (letter) {
													letters.push({
														letter,
														key: `w2-${equationData.w2.slice(0, i + 1)}`,
													});
												}
											}
											return letters.map(({ letter, key }) => (
												<div
													key={key}
													className={`w-8 h-8 flex items-center justify-center text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}
												>
													{letter}
												</div>
											));
										})()}
									</div>
									{/* Solid line separator */}
									<div
										className={`h-0.5 mb-1 ${darkMode ? "bg-gray-600" : "bg-gray-900"}`}
										style={{
											width: `${Math.max(equationData.w1.length, equationData.w2.length, equationData.w3.length) * 32}px`,
										}}
									/>
									{/* Result word - right aligned */}
									<div className="flex justify-end">
										{(() => {
											const letters: Array<{ letter: string; key: string }> =
												[];
											for (let i = 0; i < equationData.w3.length; i++) {
												const letter = equationData.w3[i];
												if (letter) {
													letters.push({
														letter,
														key: `w3-${equationData.w3.slice(0, i + 1)}`,
													});
												}
											}
											return letters.map(({ letter, key }) => (
												<div
													key={key}
													className={`w-8 h-8 flex items-center justify-center text-lg font-semibold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
												>
													{letter}
												</div>
											));
										})()}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Right: Letter-to-digit mapping grid */}
					<div
						className={`mt-4 md:mt-0 flex-shrink-0 w-full md:w-auto md:mr-12 ${darkMode ? "text-gray-300" : "text-gray-800"}`}
					>
						<div className="inline-block mx-auto md:mx-0">
							<div className="grid grid-cols-11 gap-x-1 gap-y-1 relative">
								{/* Top-left corner spacer */}
								<div className="w-6 h-6 md:w-8 md:h-8" />
								{/* Column headers: 0-9 */}
								{Array.from({ length: 10 }, (_, i) => {
									const digit = i;
									return (
										<div
											key={`col-header-digit-${digit}`}
											className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-mono text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-600"}`}
										>
											{digit}
										</div>
									);
								})}
								{/* Rows: one for each letter */}
								{equationLetters.map((letter) => {
									const currentDigit = letterToDigit[letter] || "";
									const correctDigit = correctLetterToDigit[letter] || "";

									return (
										<React.Fragment key={`row-${letter}`}>
											{/* Row header: letter */}
											<div
												className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-mono text-xs font-semibold ${darkMode ? "text-gray-400" : "text-gray-600"}`}
											>
												{letter}
											</div>
											{/* Grid cells: 0-9 */}
											{Array.from({ length: 10 }, (_, i) => {
												const digit = i;
												const isSelected = currentDigit === String(digit);
												const isCorrectDigit = correctDigit === String(digit);
												const isClicked =
													!isTestSubmitted &&
													clickedCells[letter] === String(digit);
												return isTestSubmitted ? (
													<div
														key={`cell-${letter}-digit-${digit}`}
														className={`w-6 h-6 md:w-8 md:h-8 border rounded-sm flex items-center justify-center ${
															isCorrectDigit
																? isSelected
																	? "border-green-500 bg-green-100/10"
																	: "border-green-500 bg-green-100/10"
																: isSelected
																	? "border-red-500 bg-red-100/10"
																	: darkMode
																		? "border-gray-600"
																		: "border-gray-300"
														}`}
													>
														{isCorrectDigit && (
															<span
																className={`text-xs font-mono font-bold ${darkMode ? "text-gray-200" : "text-gray-900"}`}
															>
																✕
															</span>
														)}
													</div>
												) : (
													<button
														type="button"
														key={`cell-button-${letter}-digit-${digit}`}
														className={`w-6 h-6 md:w-8 md:h-8 border rounded-sm flex items-center justify-center cursor-pointer transition-colors relative z-10 ${
															isClicked
																? "border-blue-500 bg-blue-100/20"
																: darkMode
																	? "bg-gray-800 border-gray-600 hover:bg-gray-700"
																	: "bg-white border-gray-300 hover:bg-gray-100"
														}`}
														onClick={(e) => {
															e.stopPropagation();
															e.preventDefault();
															handleLetterDigitChange(letter, String(digit));
														}}
														onMouseDown={(e) => {
															e.stopPropagation();
														}}
														title={
															isClicked
																? "Click to clear"
																: `Click to mark digit ${digit} for letter ${letter}`
														}
													>
														{isClicked && (
															<span
																className={`text-xs font-mono font-bold pointer-events-none ${darkMode ? "text-gray-200" : "text-gray-900"}`}
															>
																✕
															</span>
														)}
													</button>
												);
											})}
										</React.Fragment>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Digit values inline (with larger gaps at word boundaries) - Vertically aligned */}
			{inlineDigits.digits.length > 0 && (
				<div
					className={`p-4 rounded-lg border ${darkMode ? "border-gray-600" : "border-gray-300"} mt-4 mb-6`}
				>
					<h4
						className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Values to decode for solution
					</h4>
					{/* Group digits into word blocks to prevent words from breaking across lines */}
					{(() => {
						const wordBlocks: Array<Array<{ digit: string; index: number }>> =
							[];
						let currentBlock: Array<{ digit: string; index: number }> = [];

						for (let i = 0; i < inlineDigits.digits.length; i++) {
							const digit = inlineDigits.digits[i] ?? "";
							currentBlock.push({ digit, index: i });

							// If this is a boundary (end of word) or last digit, finalize the block
							const isBoundary = inlineDigits.boundaries.has(i);
							const isLast = i === inlineDigits.digits.length - 1;
							if (isBoundary || isLast) {
								// const word = currentBlock.map(b => b.digit).join("");
								// logger.log(`[Cryptarithm Display] Finalizing word block at position ${i} (boundary: ${isBoundary}, last: ${isLast}): "${word}"`);
								wordBlocks.push(currentBlock);
								currentBlock = [];
							}
						}

						return (
							<div className="flex flex-wrap gap-2 justify-center">
								{wordBlocks.map((block) => {
									const firstIndex = block[0]?.index ?? 0;
									return (
										<div
											key={`word-block-${firstIndex}`}
											className={`flex gap-2 flex-nowrap ${wordBlocks.indexOf(block) < wordBlocks.length - 1 ? "mr-4" : ""}`}
											style={{ flexShrink: 0 }}
										>
											{block.map(({ digit, index: i }) => {
												const displayPosition = i;
												const solutionPosition =
													displayPosition + positionOffset;
												const correctLetter = correctMapping[displayPosition];
												const isCorrect =
													correctLetter ===
													(solution?.[solutionPosition] || "");
												const isHinted =
													_quotes[quoteIndex]?.cryptarithmHinted?.[
														solutionPosition
													] === true;
												return (
													<DigitInput
														key={`${digit}-${i}-${displayPosition}`}
														digit={digit}
														position={displayPosition}
														value={solution?.[solutionPosition] || ""}
														isCorrect={isCorrect}
														isHinted={isHinted}
														isBoundary={false}
														correctLetter={correctLetter}
														quoteIndex={quoteIndex}
														isTestSubmitted={isTestSubmitted}
														darkMode={darkMode}
														selectedInputPosition={selectedInputPosition}
														setSelectedInputPosition={setSelectedInputPosition}
													/>
												);
											})}
										</div>
									);
								})}
							</div>
						);
					})()}
				</div>
			)}
		</div>
	);
};
