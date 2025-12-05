import type React from "react";

export function getTokenInputClassName(
	isTestSubmitted: boolean,
	isHinted: boolean,
	isCorrect: boolean,
	focusedToken: string | null,
	tok: string,
	darkMode: boolean,
): string {
	const baseClasses =
		"w-8 h-8 text-center border rounded text-sm outline-none focus:outline-none";
	if (isTestSubmitted) {
		if (isHinted) {
			return `${baseClasses} bg-transparent border-yellow-500`;
		}
		return `${baseClasses} bg-transparent ${isCorrect ? "border-green-500" : "border-red-500"}`;
	}
	const darkClasses = darkMode
		? "bg-gray-800 border-gray-600 text-gray-300"
		: "bg-white border-gray-300 text-gray-900";
	const focusClasses =
		focusedToken === tok ? "ring-2 ring-blue-500 border-blue-500" : "";
	return `${baseClasses} ${darkClasses} ${focusClasses}`;
}

export function getCorrectLetterDisplay(
	solutionValue: string,
	correctValue: string,
): { text: string; className: string } {
	if (solutionValue.length === 0) {
		return { text: correctValue.toUpperCase(), className: "text-red-600" };
	}
	if (solutionValue.toUpperCase() !== correctValue) {
		return { text: correctValue.toUpperCase(), className: "text-red-600" };
	}
	return { text: ".", className: "text-transparent" };
}

export function renderLabelDisplay(
	expected: string,
	user: string,
): React.ReactNode {
	if (!user) {
		return <span className="text-red-600 font-mono">{expected}</span>;
	}
	if (user === expected) {
		return <span className="text-green-600 font-mono">{expected}</span>;
	}
	return (
		<span className="font-mono text-[11px]">
			<span className="text-red-600 line-through mr-1">{user}</span>
			<span className="text-green-600">{expected}</span>
		</span>
	);
}
