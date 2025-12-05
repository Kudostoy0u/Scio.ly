import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import React, { useState, useEffect } from "react";
import { ColumnHeader } from "./CheckerboardDisplay/components/ColumnHeader";
import { GridCell } from "./CheckerboardDisplay/components/GridCell";
import { RowHeader } from "./CheckerboardDisplay/components/RowHeader";
import { TokenInput } from "./CheckerboardDisplay/components/TokenInput";
import {
	createApplyTokenToGridHandler,
	createColLabelChangeHandler,
	createColLabelKeyDownHandler,
	createGridCellChangeHandler,
	createGridCellKeyDownHandler,
	createRowLabelChangeHandler,
	createRowLabelKeyDownHandler,
	createSyncGridFromSolutions,
} from "./CheckerboardDisplay/utils/handlers";
import { parseTokensAndBlocks } from "./CheckerboardDisplay/utils/tokenParsingUtils";

interface CheckerboardDisplayProps {
	text: string;
	rowKey: string;
	colKey: string;
	polybiusKey: string;
	usesIJ: boolean;
	quoteIndex: number;
	solution?: { [key: number]: string };
	isTestSubmitted: boolean;
	quotes: QuoteData[];
	onSolutionChange: (
		quoteIndex: number,
		position: number,
		plainLetter: string,
	) => void;
}

export const CheckerboardDisplay = ({
	text,
	rowKey,
	colKey,
	polybiusKey,
	usesIJ,
	quoteIndex,
	solution,
	isTestSubmitted,
	quotes,
	onSolutionChange,
}: CheckerboardDisplayProps) => {
	const { darkMode } = useTheme();
	const quote = quotes[quoteIndex];
	const [focusedToken, setFocusedToken] = useState<string | null>(null);
	const [colLabels, setColLabels] = useState<string[]>(() =>
		Array.from({ length: 5 }, () => ""),
	);
	const [rowLabels, setRowLabels] = useState<string[]>(() =>
		Array.from({ length: 5 }, () => ""),
	);
	const [gridValues, setGridValues] = useState<string[][]>(() =>
		Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => "")),
	);

	// Reset labels/grid when question changes or test resets
	useEffect(() => {
		setColLabels(Array.from({ length: 5 }, () => ""));
		setRowLabels(Array.from({ length: 5 }, () => ""));
		setGridValues(
			Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => "")),
		);
	}, []);

	// Parse tokens and respect block separators (3+ spaces) for visual gaps
	const { tokens, blockEnd } = parseTokensAndBlocks(text);

	const syncGridFromSolutions = createSyncGridFromSolutions(
		tokens,
		solution,
		setGridValues,
	);
	const applyTokenToGrid = createApplyTokenToGridHandler(
		colLabels,
		rowLabels,
		setGridValues,
	);
	const handleColLabelChange = createColLabelChangeHandler(
		colLabels,
		rowLabels,
		setColLabels,
		syncGridFromSolutions,
	);
	const handleRowLabelChange = createRowLabelChangeHandler(
		rowLabels,
		colLabels,
		setRowLabels,
		syncGridFromSolutions,
	);
	const handleColLabelKeyDown = createColLabelKeyDownHandler(
		colLabels,
		setColLabels,
	);
	const handleRowLabelKeyDown = createRowLabelKeyDownHandler(
		rowLabels,
		setRowLabels,
	);
	const handleGridCellChange = createGridCellChangeHandler(
		rowLabels,
		colLabels,
		text,
		quoteIndex,
		setGridValues,
		onSolutionChange,
	);
	const handleGridCellKeyDown = createGridCellKeyDownHandler(
		gridValues,
		setGridValues,
	);

	const correctMapping: { [key: number]: string } = {};
	if (isTestSubmitted && quote?.quote) {
		const original = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
		for (let i = 0; i < Math.min(tokens.length, original.length); i++) {
			const origChar = original[i];
			if (origChar !== undefined) {
				correctMapping[i] = origChar;
			}
		}
	}

	// Create array with position data to avoid using map index in key
	const tokensWithPositions: Array<{ tok: string; position: number }> = [];
	for (let i = 0; i < tokens.length; i++) {
		tokensWithPositions.push({ tok: tokens[i] ?? "", position: i });
	}

	return (
		<div className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
			{/* Parameters (hide row/column keys before submission) */}
			<div
				className={`mb-4 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
			>
				<div className="grid grid-cols-2 items-center text-sm">
					<div>
						<span className="font-semibold">Polybius key: </span>
						<span className="font-mono">{polybiusKey}</span>
					</div>
					<div className="text-xs text-right">
						<span className="font-semibold">Note:</span>{" "}
						{usesIJ
							? "Using 25-letter alphabet (I/J same)."
							: "Using 26-letter alphabet."}
					</div>
				</div>
			</div>

			{/* Responsive layout: left inputs, right helper grid on md+; stacked on mobile */}
			<div className="mb-4 flex flex-col md:flex-row md:gap-6 items-start">
				{/* Left: token inputs (approx 80%) */}
				<div className="md:flex-[4] md:min-w-0">
					<div className="flex flex-wrap gap-2">
						{tokensWithPositions.map(({ tok, position }) => {
							const isHinted = Boolean(quote?.checkerboardHinted?.[position]);
							const isCorrect =
								correctMapping[position] ===
								(solution?.[position] || "").toUpperCase();
							return (
								<TokenInput
									key={`token-${tok}-${position}`}
									tok={tok}
									idx={position}
									value={solution?.[position] || ""}
									isHinted={isHinted}
									isCorrect={isCorrect}
									focusedToken={focusedToken}
									blockEnd={blockEnd}
									quoteIndex={quoteIndex}
									onSolutionChange={onSolutionChange}
									applyTokenToGrid={applyTokenToGrid}
									setFocusedToken={setFocusedToken}
									isTestSubmitted={isTestSubmitted}
									darkMode={darkMode}
									correctMapping={correctMapping}
								/>
							);
						})}
					</div>
				</div>
				{/* Right: helper 5x5 grid (approx 20%) */}
				<div
					className={`mt-4 md:mt-0 md:flex-[1] md:max-w-xs ${darkMode ? "text-gray-300" : "text-gray-800"}`}
				>
					<div className="inline-block mx-auto md:mx-0">
						<div className="grid grid-cols-6 gap-1">
							{/* top-left corner spacer */}
							<div className="w-8 h-8" />
							{Array.from({ length: 5 }, (_, i) => i).map((i) => (
								<ColumnHeader
									key={`cb-col-${i}`}
									i={i}
									isTestSubmitted={isTestSubmitted}
									darkMode={darkMode}
									colKey={colKey}
									colLabels={colLabels}
									onLabelChange={handleColLabelChange}
									onKeyDown={handleColLabelKeyDown}
								/>
							))}
							{Array.from({ length: 5 }, (_, ri) => ri).map((ri) => (
								<React.Fragment key={`cb-row-${ri}`}>
									<RowHeader
										ri={ri}
										isTestSubmitted={isTestSubmitted}
										darkMode={darkMode}
										rowKey={rowKey}
										rowLabels={rowLabels}
										onLabelChange={handleRowLabelChange}
										onKeyDown={handleRowLabelKeyDown}
									/>
									{Array.from({ length: 5 }, (_, ci) => ci).map((ci) => (
										<GridCell
											key={`cb-grid-${ri}-${ci}`}
											ri={ri}
											ci={ci}
											isTestSubmitted={isTestSubmitted}
											darkMode={darkMode}
											gridValues={gridValues}
											onChange={handleGridCellChange}
											onKeyDown={handleGridCellKeyDown}
										/>
									))}
								</React.Fragment>
							))}
						</div>
					</div>
				</div>
			</div>
			{isTestSubmitted && (
				<div
					className={`mt-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-800"}`}
				>
					<div className="font-semibold">Original quote:</div>
					<div className="whitespace-pre-wrap mt-1">
						{quote?.quote?.replace(/\[.*?\]/g, "") || ""}
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-4">
						<div>
							<span className="font-semibold">Row key: </span>
							<span className="font-mono">{rowKey}</span>
						</div>
						<div>
							<span className="font-semibold">Column key: </span>
							<span className="font-mono">{colKey}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
