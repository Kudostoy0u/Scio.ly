import type React from "react";
import { renderLabelDisplay } from "../utils/displayHelpers";

interface ColumnHeaderProps {
	i: number;
	isTestSubmitted: boolean;
	darkMode: boolean;
	colKey: string;
	colLabels: string[];
	onLabelChange: (e: React.ChangeEvent<HTMLInputElement>, i: number) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, i: number) => void;
}

export const ColumnHeader = ({
	i,
	isTestSubmitted,
	darkMode,
	colKey,
	colLabels,
	onLabelChange,
	onKeyDown,
}: ColumnHeaderProps) => {
	if (isTestSubmitted) {
		return (
			<div
				key={`cb-col-header-${i}`}
				className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
			>
				{renderLabelDisplay(
					(colKey[i] || "").toUpperCase(),
					(colLabels[i] || "").toUpperCase(),
				)}
			</div>
		);
	}
	return (
		<input
			key={`cb-col-input-${i}`}
			type="text"
			maxLength={2}
			onChange={(e) => onLabelChange(e, i)}
			onKeyDown={(e) => onKeyDown(e, i)}
			className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
		/>
	);
};
