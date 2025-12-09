"use client";

import type { Settings } from "@/app/practice/types";
import type { MutableRefObject } from "react";

export default function DifficultyDropdown({
	darkMode,
	isCodebusters,
	settings,
	isOpen,
	onToggleOpen,
	onToggleDifficulty,
	displayText,
	dropdownRef,
	id,
}: {
	darkMode: boolean;
	isCodebusters: boolean;
	settings: Settings;
	isOpen: boolean;
	onToggleOpen: () => void;
	onToggleDifficulty: (id: string) => void;
	displayText: string;
	dropdownRef: MutableRefObject<HTMLDivElement | null>;
	id?: string;
}) {
	const standardDifficulties = [
		{ id: "very-easy", label: "Very Easy (0-19%)" },
		{ id: "easy", label: "Easy (20-39%)" },
		{ id: "medium", label: "Medium (40-59%)" },
		{ id: "hard", label: "Hard (60-79%)" },
		{ id: "very-hard", label: "Very Hard (80-100%)" },
	];
	const codebustersDifficulties = ["Easy", "Medium", "Hard"];

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				id={id}
				onClick={onToggleOpen}
				disabled={isCodebusters}
				className={`w-full flex justify-between items-center px-3 py-2.5 rounded-md border-0 text-sm ${
					isCodebusters
						? `opacity-50 cursor-not-allowed ${darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"}`
						: darkMode
							? "bg-gray-700 text-white focus:ring-blue-500"
							: "bg-gray-50 text-gray-900 focus:ring-blue-600"
				} shadow-sm focus:ring-1 focus:outline-none`}
			>
				<span>{displayText}</span>
				<svg
					className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					role="img"
					aria-label="Dropdown arrow"
				>
					<title>Dropdown arrow</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{isOpen && (
				<div
					className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${darkMode ? "bg-gray-700" : "bg-white"} ring-1 ring-black ring-opacity-5`}
				>
					<div className="py-1">
						{isCodebusters
							? codebustersDifficulties.map((difficulty) => (
									<label
										key={difficulty}
										className={`flex items-center px-4 py-2 text-xs cursor-pointer ${darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"}`}
									>
										<input
											type="checkbox"
											checked={settings.difficulties.includes(difficulty)}
											onChange={() => onToggleDifficulty(difficulty)}
											className={`mr-3 rounded ${darkMode ? "bg-gray-600 border-gray-500" : "bg-gray-50 border-gray-300"}`}
										/>
										{difficulty}
									</label>
								))
							: standardDifficulties.map((difficulty) => (
									<label
										key={difficulty.id}
										className={`flex items-center px-4 py-2 text-xs cursor-pointer ${darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"}`}
									>
										<input
											type="checkbox"
											checked={settings.difficulties.includes(difficulty.id)}
											onChange={() => onToggleDifficulty(difficulty.id)}
											className={`mr-3 rounded ${darkMode ? "bg-gray-600 border-gray-500" : "bg-gray-50 border-gray-300"}`}
										/>
										{difficulty.label}
									</label>
								))}
					</div>
				</div>
			)}
		</div>
	);
}
