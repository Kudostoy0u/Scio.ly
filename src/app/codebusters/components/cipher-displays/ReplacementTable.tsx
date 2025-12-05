"use client";
import { getLetterFrequencies } from "@/app/codebusters/utils/substitution";
import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";

interface ReplacementTableProps {
	text: string;
	solution?: { [key: string]: string };
	quoteIndex: number;
	isTestSubmitted: boolean;
	cipherType: string;
	correctMapping?: { [key: string]: string };
	onSolutionChange: (cipherLetter: string, plainLetter: string) => void;
	focusedCipherLetter?: string | null;
	onCipherLetterFocus?: (cipherLetter: string) => void;
	onCipherLetterBlur?: () => void;
	hintedLetters?: { [questionIndex: number]: { [letter: string]: boolean } };
}

export const ReplacementTable = ({
	text,
	solution,
	quoteIndex,
	isTestSubmitted,
	cipherType,
	correctMapping,
	onSolutionChange,
	focusedCipherLetter,
	onCipherLetterFocus,
	onCipherLetterBlur,
	hintedLetters,
}: ReplacementTableProps) => {
	const { darkMode } = useTheme();
	const frequencies = getLetterFrequencies(text);

	const isXenocrypt = cipherType.includes("Xenocrypt");
	const alphabet = isXenocrypt
		? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
		: "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	const handleReplacementTableChange = (
		cipherLetter: string,
		newPlainLetter: string,
	) => {
		if (isTestSubmitted) {
			return;
		}

		// Use the passed onSolutionChange function which already includes validation
		onSolutionChange(cipherLetter, newPlainLetter);
	};

	// Helper function to get submitted cell text color
	const getSubmittedCellColor = (
		isHinted: boolean,
		isCorrect: boolean,
		darkMode: boolean,
	): string => {
		if (isHinted) {
			return darkMode ? "text-yellow-300" : "text-yellow-600";
		}
		if (isCorrect) {
			return darkMode ? "text-green-400" : "text-green-600";
		}
		return darkMode ? "text-red-400" : "text-red-600";
	};

	// Helper function to render submitted cell content
	const renderSubmittedCellContent = (
		hasUserInput: boolean,
		isCorrect: boolean,
		isHinted: boolean,
		userValue: string,
		correctValue: string,
		darkMode: boolean,
	): React.ReactNode => {
		if (hasUserInput && !isCorrect && !isHinted) {
			return (
				<div className="flex items-center justify-center space-x-1">
					<div
						className={`text-xs line-through ${darkMode ? "text-red-400" : "text-red-600"}`}
					>
						{userValue}
					</div>
					<div
						className={`text-xs font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}
					>
						{correctValue}
					</div>
				</div>
			);
		}
		return (
			<div
				className={`text-center text-xs font-medium ${getSubmittedCellColor(isHinted, isCorrect, darkMode)}`}
			>
				{correctValue}
			</div>
		);
	};

	// Replacement cell component (extracted to reduce complexity)
	const ReplacementCell = ({
		letter,
		userValue,
		correctValue,
		isCorrect,
		hasUserInput,
		isHinted,
		isTestSubmitted,
		darkMode,
		focusedCipherLetter,
		onCipherLetterFocus,
		onCipherLetterBlur,
	}: {
		letter: string;
		userValue: string;
		correctValue: string;
		isCorrect: boolean;
		hasUserInput: boolean;
		isHinted: boolean;
		isTestSubmitted: boolean;
		darkMode: boolean;
		focusedCipherLetter?: string | null;
		onCipherLetterFocus?: (letter: string) => void;
		onCipherLetterBlur?: () => void;
	}) => {
		const baseClassName = `p-1 border min-w-[2rem] ${darkMode ? "border-gray-600" : "border-gray-300"}`;

		if (isTestSubmitted) {
			return (
				<td key={letter} className={baseClassName}>
					<div className="relative w-full h-full flex items-center justify-center">
						{renderSubmittedCellContent(
							hasUserInput,
							isCorrect,
							isHinted,
							userValue,
							correctValue,
							darkMode,
						)}
					</div>
				</td>
			);
		}

		const inputClassName = `w-full text-center text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-900"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
			focusedCipherLetter === letter ? "ring-2 ring-blue-500" : "border-0"
		}`;

		return (
			<td key={letter} className={baseClassName}>
				<input
					type="text"
					maxLength={1}
					value={userValue}
					onChange={(e) =>
						handleReplacementTableChange(letter, e.target.value.toUpperCase())
					}
					onFocus={() => onCipherLetterFocus?.(letter)}
					onBlur={onCipherLetterBlur}
					autoComplete="off"
					className={inputClassName}
					placeholder=""
				/>
			</td>
		);
	};

	return (
		<div
			className={`mt-4 mb-4 p-3 rounded border replacement-table-container ${darkMode ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-300"}`}
		>
			<div
				className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Replacement Table
			</div>
			<div className="overflow-x-auto replacement-table-wrapper">
				<table className="text-xs border-collapse min-w-full replacement-table">
					<tbody>
						{/* Cipher letters row */}
						<tr>
							<td
								className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
							>
								Cipher
							</td>
							{alphabet.split("").map((letter) => (
								<td
									key={letter}
									className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
								>
									{letter}
								</td>
							))}
						</tr>
						{/* Frequency row */}
						<tr>
							<td
								className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
							>
								Frequency
							</td>
							{alphabet.split("").map((letter) => (
								<td
									key={letter}
									className={`p-1 border text-center ${darkMode ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
								>
									{frequencies[letter] || 0}
								</td>
							))}
						</tr>
						{/* Replacement row - editable cells */}
						<tr>
							<td
								className={`p-1 border text-center font-bold ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"}`}
							>
								Replacement
							</td>
							{alphabet.split("").map((letter) => {
								const userValue = solution?.[letter] || "";
								const correctValue = correctMapping?.[letter] || "";
								const isCorrect = userValue === correctValue;
								const hasUserInput = userValue !== "";
								const isHinted = Boolean(hintedLetters?.[quoteIndex]?.[letter]);

								return (
									<ReplacementCell
										key={letter}
										letter={letter}
										userValue={userValue}
										correctValue={correctValue}
										isCorrect={isCorrect}
										hasUserInput={hasUserInput}
										isHinted={isHinted}
										isTestSubmitted={isTestSubmitted}
										darkMode={darkMode}
										focusedCipherLetter={focusedCipherLetter}
										onCipherLetterFocus={onCipherLetterFocus}
										onCipherLetterBlur={onCipherLetterBlur}
									/>
								);
							})}
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};
