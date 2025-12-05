import {
	getCorrectLetterDisplay,
	getTokenInputClassName,
} from "../utils/displayHelpers";

interface TokenInputProps {
	tok: string;
	idx: number;
	value: string;
	isHinted: boolean;
	isCorrect: boolean;
	focusedToken: string | null;
	blockEnd: Set<number>;
	quoteIndex: number;
	onSolutionChange: (quoteIndex: number, idx: number, val: string) => void;
	applyTokenToGrid: (tok: string, val: string) => void;
	setFocusedToken: (tok: string | null) => void;
	isTestSubmitted: boolean;
	darkMode: boolean;
	correctMapping: { [key: number]: string };
}

export const TokenInput = ({
	tok,
	idx,
	value,
	isHinted,
	isCorrect,
	focusedToken,
	blockEnd,
	quoteIndex,
	onSolutionChange,
	applyTokenToGrid,
	setFocusedToken,
	isTestSubmitted,
	darkMode,
	correctMapping,
}: TokenInputProps) => {
	const correctDisplay = getCorrectLetterDisplay(
		value,
		correctMapping[idx] || "",
	);
	return (
		<div
			key={idx}
			className={`flex flex-col items-center ${blockEnd.has(idx) ? "mr-6 md:mr-10" : ""}`}
		>
			<div
				className={`text-xs mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
			>
				{tok}
			</div>
			<input
				type="text"
				maxLength={1}
				value={value}
				onChange={(e) => {
					const up = e.target.value.toUpperCase();
					onSolutionChange(quoteIndex, idx, up);
					applyTokenToGrid(tok, up);
				}}
				autoComplete="off"
				disabled={isTestSubmitted}
				onFocus={() => setFocusedToken(tok)}
				onBlur={() => setFocusedToken(null)}
				className={getTokenInputClassName(
					isTestSubmitted,
					isHinted,
					isCorrect,
					focusedToken,
					tok,
					darkMode,
				)}
			/>
			{isTestSubmitted && (
				<div className={`mt-1 text-[10px] ${correctDisplay.className}`}>
					{correctDisplay.text}
				</div>
			)}
		</div>
	);
};
