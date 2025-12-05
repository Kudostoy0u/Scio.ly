"use client";

interface KeywordInputCellProps {
	i: number;
	currentValue: string;
	expectedValue: string;
	isCorrect: boolean;
	showCorrectAnswer: boolean;
	darkMode: boolean;
	onKeywordChange: (index: number, value: string) => void;
}

export function KeywordInputCell({
	i,
	currentValue,
	expectedValue,
	isCorrect,
	showCorrectAnswer,
	darkMode,
	onKeywordChange,
}: KeywordInputCellProps) {
	return (
		<div className="flex flex-col items-center">
			<input
				type="text"
				maxLength={1}
				value={currentValue}
				disabled={showCorrectAnswer}
				onChange={(e) => onKeywordChange(i, e.target.value.toUpperCase())}
				className={`w-8 h-8 text-center border rounded text-sm ${
					darkMode
						? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
						: "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
				} ${
					showCorrectAnswer
						? isCorrect
							? "border-green-500 bg-green-100/10"
							: "border-red-500 bg-red-100/10"
						: ""
				}`}
			/>
			{showCorrectAnswer && !isCorrect && (
				<div
					className={`text-xs mt-1 ${darkMode ? "text-red-400" : "text-red-600"}`}
				>
					{expectedValue}
				</div>
			)}
		</div>
	);
}
