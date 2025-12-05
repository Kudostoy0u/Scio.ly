"use client";
import { numberToLetter } from "@/app/codebusters/cipher-utils";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";
import { useEffect, useMemo } from "react";

// Top-level regex patterns
const UPPERCASE_LETTER_REGEX = /[A-Z]/;

// Helper function to find next letter in original quote
const findNextLetterInQuote = (
	originalQuote: string,
	startIndex: number,
): { char: string; index: number } | null => {
	for (let i = startIndex; i < originalQuote.length; i++) {
		const char = originalQuote[i];
		if (char && UPPERCASE_LETTER_REGEX.test(char)) {
			return { char, index: i + 1 };
		}
	}
	return null;
};

// Helper function to build correct mapping
const buildCorrectMapping = (
	text: string,
	originalQuote: string,
): { [key: number]: string } => {
	const mapping: { [key: number]: string } = {};
	let plainTextIndex = 0;
	for (let i = 0; i < text.length; i++) {
		const textChar = text[i];
		if (textChar && UPPERCASE_LETTER_REGEX.test(textChar)) {
			const result = findNextLetterInQuote(originalQuote, plainTextIndex);
			if (result) {
				mapping[i] = result.char;
				plainTextIndex = result.index;
			}
		}
	}
	return mapping;
};

// Helper function to find cipher letter indices
const findCipherLetterIndices = (text: string): number[] => {
	const indices: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const textChar = text[i];
		if (textChar && UPPERCASE_LETTER_REGEX.test(textChar)) {
			indices.push(i);
		}
	}
	return indices;
};

// Helper function to calculate padding positions
const calculatePaddingPositions = (
	cipherLetterIndices: number[],
	cleanPlainLength: number,
	matrixSize: number,
): Set<number> => {
	const positions = new Set<number>();
	const requiredLength = Math.ceil(cleanPlainLength / matrixSize) * matrixSize;
	const paddingCount = requiredLength - cleanPlainLength;
	if (paddingCount === 0) {
		return positions;
	}
	const start = Math.max(0, cipherLetterIndices.length - paddingCount);
	for (let idx = start; idx < cipherLetterIndices.length; idx++) {
		const cipherIdx = cipherLetterIndices[idx];
		if (cipherIdx !== undefined) {
			positions.add(cipherIdx);
		}
	}
	return positions;
};

interface HillDisplayProps {
	text: string;
	matrix: number[][];
	quoteIndex: number;
	solution?: { matrix: string[][]; plaintext: { [key: number]: string } };
	onSolutionChange: (
		type: "matrix" | "plaintext",
		value: string[][] | { [key: number]: string },
	) => void;
	isTestSubmitted: boolean;
	quotes: QuoteData[];
}

export const HillDisplay = ({
	text,
	matrix,
	quoteIndex,
	solution,
	onSolutionChange,
	isTestSubmitted,
	quotes,
}: HillDisplayProps) => {
	const { darkMode } = useTheme();
	const quote = quotes[quoteIndex];
	const is3x3 = quote?.cipherType === "Hill 3x3";
	const matrixSize = is3x3 ? 3 : 2;

	useEffect(() => {
		if (quote && is3x3 && quote.decryptionMatrix) {
			const hasEmptyMatrix =
				!solution?.matrix ||
				solution.matrix.every((row) => row.every((cell) => cell === ""));
			if (hasEmptyMatrix) {
				const decryptionMatrix = quote.decryptionMatrix.map((row) =>
					row.map((num) => num.toString()),
				);
				onSolutionChange("matrix", decryptionMatrix);
			}
		}
	}, [quote, is3x3, solution?.matrix, onSolutionChange]);

	const correctMapping = useMemo(() => {
		if (!(isTestSubmitted && quote)) {
			return {};
		}
		const originalQuote = quote.quote?.toUpperCase() || "";
		return buildCorrectMapping(text, originalQuote);
	}, [isTestSubmitted, quote, text]);

	const paddingPositions = useMemo(() => {
		if (!(isTestSubmitted && quote)) {
			return new Set<number>();
		}
		const cipherLetterIndices = findCipherLetterIndices(text);
		const cleanPlainLength =
			quote.quote?.toUpperCase().replace(/[^A-Z]/g, "").length ?? 0;
		return calculatePaddingPositions(
			cipherLetterIndices,
			cleanPlainLength,
			matrixSize,
		);
	}, [isTestSubmitted, quote, text, matrixSize]);

	if (!quote) {
		return <div>Quote not found</div>;
	}

	// Helper function to get matrix input className
	const getMatrixInputClassName = (
		isTestSubmitted: boolean,
		isCorrect: boolean,
		darkMode: boolean,
	): string => {
		const baseClasses =
			"w-10 h-10 sm:w-12 sm:h-12 text-center border rounded text-base sm:text-lg";
		const darkClasses = darkMode
			? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
			: "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
		const stateClasses = isTestSubmitted
			? isCorrect
				? "border-green-500 bg-green-100/10"
				: "border-red-500 bg-red-100/10"
			: "";
		return `${baseClasses} ${darkClasses} ${stateClasses}`;
	};

	// Helper function to handle matrix cell change
	const handleMatrixCellChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		i: number,
		j: number,
		matrixSize: number,
	) => {
		const baseMatrix =
			solution?.matrix ||
			Array.from({ length: matrixSize }, () => new Array(matrixSize).fill(""));
		// Create a deep copy to avoid mutating the original
		const newMatrix = baseMatrix.map((row) => [...row]);
		const row = newMatrix[i];
		if (row) {
			row[j] = e.target.value;
		}
		onSolutionChange("matrix", newMatrix);
	};

	// Matrix cell component (extracted to reduce complexity)
	const MatrixCell = ({
		i,
		j,
		value,
		numValue,
		correctLetter,
		isCorrect,
		is3x3,
		matrixSize,
		isTestSubmitted,
		darkMode,
	}: {
		i: number;
		j: number;
		value: string;
		numValue: number;
		correctLetter: string;
		isCorrect: boolean;
		is3x3: boolean;
		matrixSize: number;
		isTestSubmitted: boolean;
		darkMode: boolean;
	}) => {
		if (is3x3) {
			return (
				<div
					key={`solution-${i}-${j}`}
					className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
						darkMode
							? "bg-gray-700/50 border-gray-600"
							: "bg-gray-50 border-gray-200"
					}`}
				>
					<span
						className={`text-base sm:text-lg font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
					>
						{value || "?"}
					</span>
					<span
						className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						{numberToLetter(numValue)}
					</span>
				</div>
			);
		}
		return (
			<div key={`solution-${i}-${j}`} className="flex flex-col items-center">
				<input
					type="text"
					id={`hill-matrix-${i}-${j}`}
					name={`hill-matrix-${i}-${j}`}
					maxLength={2}
					disabled={isTestSubmitted}
					value={value}
					onChange={(e) => handleMatrixCellChange(e, i, j, matrixSize)}
					className={getMatrixInputClassName(
						isTestSubmitted,
						isCorrect,
						darkMode,
					)}
					placeholder="?"
					autoComplete="off"
					style={{ textTransform: "uppercase" }}
				/>
				{isTestSubmitted && !isCorrect && (
					<div
						className={`${darkMode ? "text-red-400" : "text-red-600"} text-[10px] sm:text-xs mt-1`}
					>
						{correctLetter}
					</div>
				)}
			</div>
		);
	};

	// Helper function to get character input className
	const getCharacterInputClassName = (
		isPadding: boolean,
		isTestSubmitted: boolean,
		isCorrect: boolean,
		darkMode: boolean,
	): string => {
		const baseClasses =
			"w-5 h-5 sm:w-6 sm:h-6 text-center border rounded mt-1 text-xs sm:text-sm";
		const paddingClasses = isPadding
			? darkMode
				? "bg-gray-700 border-gray-500 text-gray-400"
				: "bg-gray-200 border-gray-300 text-gray-500"
			: darkMode
				? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
				: "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
		const stateClasses = isTestSubmitted
			? isCorrect
				? "border-green-500 bg-green-100/10"
				: "border-red-500 bg-red-100/10"
			: "";
		return `${baseClasses} ${paddingClasses} ${stateClasses}`;
	};

	// Helper function to handle character input change
	const handleCharacterInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		i: number,
	) => {
		const newValue = e.target.value.toUpperCase();
		const newPlaintext = { ...(solution?.plaintext || {}) };
		newPlaintext[i] = newValue;
		onSolutionChange("plaintext", newPlaintext);
	};

	// Character display component (extracted to reduce complexity)
	const CharacterDisplay = ({
		char,
		i,
		value,
		correctLetter,
		isCorrect,
		isPadding,
		quoteIndex,
		darkMode,
		isTestSubmitted,
	}: {
		char: string;
		i: number;
		value: string;
		correctLetter: string;
		isCorrect: boolean;
		isPadding: boolean;
		quoteIndex: number;
		darkMode: boolean;
		isTestSubmitted: boolean;
	}) => {
		const isLetter = UPPERCASE_LETTER_REGEX.test(char);
		if (!isLetter) {
			return (
				<div key={i} className="flex flex-col items-center mx-0.5">
					<span
						className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}
					>
						{char}
					</span>
				</div>
			);
		}
		return (
			<div key={i} className="flex flex-col items-center mx-0.5">
				<span
					className={`text-base sm:text-lg ${darkMode ? "text-gray-300" : "text-gray-900"}`}
				>
					{char}
				</span>
				<div className="relative h-12 sm:h-14">
					<input
						type="text"
						id={`hill-plaintext-${quoteIndex}-${i}`}
						name={`hill-plaintext-${quoteIndex}-${i}`}
						maxLength={1}
						disabled={isTestSubmitted}
						value={value}
						onChange={(e) => handleCharacterInputChange(e, i)}
						className={getCharacterInputClassName(
							isPadding,
							isTestSubmitted,
							isCorrect,
							darkMode,
						)}
					/>
					{isTestSubmitted && isPadding && (
						<div
							className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
								darkMode ? "text-gray-400" : "text-gray-500"
							}`}
						>
							X
						</div>
					)}
					{isTestSubmitted && !isPadding && !isCorrect && correctLetter && (
						<div
							className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
								darkMode ? "text-red-400" : "text-red-600"
							}`}
						>
							{correctLetter}
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="font-mono">
			{/* Matrix display section */}
			<div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
				<div>
					<p
						className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Encryption Matrix:
					</p>
					<div
						className={`grid gap-2 ${is3x3 ? "grid-cols-3" : "grid-cols-2"}`}
					>
						{matrix.map((row, i) =>
							row.map((num, j) => (
								<div
									key={`hill-matrix-${i}-${j}-${num}`}
									className={`w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center border rounded ${
										darkMode
											? "bg-gray-700/50 border-gray-600"
											: "bg-gray-50 border-gray-200"
									}`}
								>
									<span
										className={`text-base sm:text-lg font-bold ${darkMode ? "text-gray-300" : "text-gray-900"}`}
									>
										{num}
									</span>
									<span
										className={`text-[10px] sm:text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
									>
										{numberToLetter(num)}
									</span>
								</div>
							)),
						)}
					</div>
				</div>
				<div>
					<p
						className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Decryption Matrix:
					</p>
					<div
						className={`grid gap-2 ${is3x3 ? "grid-cols-3" : "grid-cols-2"}`}
					>
						{(() => {
							const matrixPositions: Array<{ i: number; j: number }> = [];
							for (let i = 0; i < matrixSize; i++) {
								for (let j = 0; j < matrixSize; j++) {
									matrixPositions.push({ i, j });
								}
							}
							return matrixPositions.map(({ i, j }) => {
								const value = solution?.matrix?.[i]?.[j] || "";
								const numValue = Number.parseInt(value) || 0;
								const correctNum = quote.decryptionMatrix?.[i]?.[j] ?? 0;
								const correctLetter = numberToLetter(correctNum);
								const isCorrect = isTestSubmitted && numValue === correctNum;

								return (
									<MatrixCell
										key={`hill-solution-matrix-${i}-${j}`}
										i={i}
										j={j}
										value={value}
										numValue={numValue}
										correctLetter={correctLetter}
										isCorrect={isCorrect}
										is3x3={is3x3}
										matrixSize={matrixSize}
										isTestSubmitted={isTestSubmitted}
										darkMode={darkMode}
									/>
								);
							});
						})()}
					</div>
				</div>
			</div>

			{/* Updated Encrypted text and solution section */}
			<div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
				{(() => {
					const charsWithPositions = text
						.split("")
						.map((char, i) => ({ char, position: i }));
					return charsWithPositions.map(({ char, position }) => {
						const isLetter = UPPERCASE_LETTER_REGEX.test(char);
						const value = solution?.plaintext?.[position] || "";
						const correctLetter =
							isTestSubmitted && isLetter
								? (correctMapping[position] ?? "")
								: "";
						const isCorrect = value.toUpperCase() === correctLetter;
						const isPadding =
							isLetter && isTestSubmitted && paddingPositions.has(position);

						return (
							<CharacterDisplay
								key={`hill-char-${char}-${position}`}
								char={char}
								i={position}
								value={value}
								correctLetter={correctLetter}
								isCorrect={isCorrect}
								isPadding={isPadding}
								quoteIndex={quoteIndex}
								darkMode={darkMode}
								isTestSubmitted={isTestSubmitted}
							/>
						);
					});
				})()}
			</div>

			{/* Show original quote after submission */}
			{isTestSubmitted && (
				<div
					className={`mt-8 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
				>
					<p
						className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Original Quote:
					</p>
					<p
						className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-900"}`}
					>
						{quote.quote.replace(/\[.*?\]/g, "")}
					</p>
				</div>
			)}
		</div>
	);
};
