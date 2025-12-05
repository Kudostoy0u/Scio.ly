import type React from "react";

interface GridCellProps {
	ri: number;
	ci: number;
	isTestSubmitted: boolean;
	darkMode: boolean;
	gridValues: string[][];
	onChange: (
		e: React.ChangeEvent<HTMLInputElement>,
		ri: number,
		ci: number,
	) => void;
	onKeyDown: (
		e: React.KeyboardEvent<HTMLInputElement>,
		ri: number,
		ci: number,
	) => void;
}

export const GridCell = ({
	ri,
	ci,
	isTestSubmitted,
	darkMode,
	gridValues,
	onChange,
	onKeyDown,
}: GridCellProps) => {
	if (isTestSubmitted) {
		return (
			<div
				key={`cb-cell-${ri}-${ci}`}
				className={`w-8 h-8 border rounded-sm flex items-center justify-center ${darkMode ? "border-gray-600" : "border-gray-300"}`}
			>
				{gridValues[ri]?.[ci] || ""}
			</div>
		);
	}
	return (
		<input
			key={`cb-cell-input-${ri}-${ci}`}
			type="text"
			maxLength={2}
			value={gridValues[ri]?.[ci] || ""}
			onChange={(e) => onChange(e, ri, ci)}
			onKeyDown={(e) => onKeyDown(e, ri, ci)}
			className={`w-8 h-8 text-center border rounded-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
		/>
	);
};
