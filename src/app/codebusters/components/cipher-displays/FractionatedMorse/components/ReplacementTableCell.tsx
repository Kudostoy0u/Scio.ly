"use client";
import type React from "react";
import { isLetterAlreadyUsed } from "../utils/inputProcessing";

interface ReplacementTableCellProps {
	triplet: string;
	replacementValue: string;
	correctValue: string;
	isCorrect: boolean;
	hasUserInput: boolean;
	isTestSubmitted: boolean;
	darkMode: boolean;
	usedTriplets: string[];
	solution: Record<string, string> | undefined;
	quoteIndex: number;
	onSolutionChange: (quoteIndex: number, key: string, value: string) => void;
	handleReplacementTableChange: (triplet: string, value: string) => void;
}

// Helper function to get color class for submitted cell
function getSubmittedCellColorClass(
	isCorrect: boolean,
	darkMode: boolean,
): string {
	if (isCorrect) {
		return darkMode ? "text-green-400" : "text-green-600";
	}
	return darkMode ? "text-red-400" : "text-red-600";
}

// Helper function to render incorrect answer display
function renderIncorrectAnswer(
	replacementValue: string,
	correctValue: string,
	darkMode: boolean,
): React.ReactNode {
	return (
		<div className="flex items-center justify-center space-x-1">
			<div
				className={`text-xs line-through ${darkMode ? "text-red-400" : "text-red-600"}`}
			>
				{replacementValue}
			</div>
			<div
				className={`text-xs font-medium ${darkMode ? "text-green-400" : "text-green-600"}`}
			>
				{correctValue}
			</div>
		</div>
	);
}

// Helper function to get submitted cell content
function getSubmittedCellContent(
	hasUserInput: boolean,
	isCorrect: boolean,
	replacementValue: string,
	correctValue: string,
	darkMode: boolean,
): React.ReactNode {
	if (hasUserInput && !isCorrect) {
		return renderIncorrectAnswer(replacementValue, correctValue, darkMode);
	}
	const colorClass = getSubmittedCellColorClass(isCorrect, darkMode);
	return (
		<div className={`text-center text-xs font-medium ${colorClass}`}>
			{correctValue}
		</div>
	);
}

export function ReplacementTableCell({
	triplet,
	replacementValue,
	correctValue,
	isCorrect,
	hasUserInput,
	isTestSubmitted,
	darkMode,
	usedTriplets,
	solution,
	quoteIndex,
	onSolutionChange,
	handleReplacementTableChange,
}: ReplacementTableCellProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newLetter = e.target.value.toUpperCase();
		if (
			isLetterAlreadyUsed(newLetter, replacementValue, usedTriplets, solution)
		) {
			return;
		}
		onSolutionChange(quoteIndex, `replacement_${triplet}`, newLetter);
		handleReplacementTableChange(triplet, e.target.value);
	};

	return (
		<td
			key={triplet}
			className={`p-1 border min-w-[2rem] ${darkMode ? "border-gray-600" : "border-gray-300"}`}
		>
			{isTestSubmitted ? (
				<div className="relative w-full h-full flex items-center justify-center">
					{getSubmittedCellContent(
						hasUserInput,
						isCorrect,
						replacementValue,
						correctValue,
						darkMode,
					)}
				</div>
			) : (
				<input
					type="text"
					maxLength={1}
					value={replacementValue}
					onFocus={() => {
						// Intentionally empty - focus handling not needed
					}}
					onBlur={() => {
						// Intentionally empty - blur handling not needed
					}}
					onChange={handleChange}
					autoComplete="off"
					className={`w-full text-center text-xs ${darkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-900"} focus:outline-none focus:ring-1 focus:ring-blue-500 border-0`}
				/>
			)}
		</td>
	);
}
