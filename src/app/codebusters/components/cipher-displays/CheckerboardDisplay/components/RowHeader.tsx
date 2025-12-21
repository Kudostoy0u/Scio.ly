import type React from "react";
import { renderLabelDisplay } from "../utils/displayHelpers";

interface RowHeaderProps {
	ri: number;
	isTestSubmitted: boolean;
	darkMode: boolean;
	rowKey: string;
	rowLabels: string[];
	onLabelChange: (e: React.ChangeEvent<HTMLInputElement>, ri: number) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, ri: number) => void;
}

export const RowHeader = ({
	ri,
	isTestSubmitted,
	darkMode,
	rowKey,
	rowLabels,
	onLabelChange,
	onKeyDown,
}: RowHeaderProps) => {
	if (isTestSubmitted) {
		return (
			<div
				className={`w-8 h-8 text-center border rounded text-xs flex items-center justify-center ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"}`}
			>
				{renderLabelDisplay(
					(rowKey[ri] || "").toUpperCase(),
					(rowLabels[ri] || "").toUpperCase(),
					darkMode,
				)}
			</div>
		);
	}
	return (
		<input
			type="text"
			maxLength={2}
			onChange={(e) => onLabelChange(e, ri)}
			onKeyDown={(e) => onKeyDown(e, ri)}
			className={`w-8 h-8 text-center border rounded text-xs outline-none focus:outline-none ring-1 ring-blue-200 ${darkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"}`}
		/>
	);
};
