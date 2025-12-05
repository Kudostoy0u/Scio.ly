import type { QuoteData } from "@/app/codebusters/types";
import { resolveQuestionPoints } from "@/app/codebusters/utils/gradingUtils";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	BaconianDisplay,
	CheckerboardDisplay,
	ColumnarTranspositionDisplay,
	CryptarithmDisplay,
	FractionatedMorseDisplay,
	HillDisplay,
	NihilistDisplay,
	PortaDisplay,
	SubstitutionDisplay,
} from "./cipher-displays";

const processAuthor = (author: string): string => {
	const commaIndex = author.indexOf(",");
	if (commaIndex !== -1) {
		const textAfterComma = author.substring(commaIndex + 1).trim();
		if (textAfterComma.length > 28) {
			return author.substring(0, commaIndex);
		}
	}
	return author;
};

// Helper function to extract all letters from cryptarithm data
function extractAllLetters(digitGroups: Array<{ word: string }>): string {
	return digitGroups.map((g) => g.word.replace(/\s/g, "")).join("");
}

// Helper function to extract all digits from cryptarithm data
function extractAllDigits(digitGroups: Array<{ digits: string }>): string[] {
	const allDigitsArr: string[] = [];
	for (const g of digitGroups) {
		const digits = g.digits.split(" ").filter(Boolean);
		for (const d of digits) {
			allDigitsArr.push(d);
		}
	}
	return allDigitsArr;
}

// Helper function to find unfilled indices
function findUnfilledIndices(
	allLetters: string,
	current: Record<number, string>,
): number[] {
	const unfilled: number[] = [];
	for (let i = 0; i < allLetters.length; i++) {
		if (!current[i]) {
			unfilled.push(i);
		}
	}
	return unfilled;
}

// Helper function to find positions to fill
function findPositionsToFill(
	allDigitsArr: string[],
	targetDigit: string,
): number[] {
	const positionsToFill: number[] = [];
	for (let pos = 0; pos < allDigitsArr.length; pos++) {
		const d = allDigitsArr[pos];
		if (d === targetDigit) {
			positionsToFill.push(pos);
		}
	}
	return positionsToFill;
}

// Helper function to determine if Baconian sync should be enabled
function shouldEnableBaconianSync(binaryType: string): boolean {
	const emojiSchemes = [
		"Happy vs Sad",
		"Fire vs Ice",
		"Day vs Night",
		"Land vs Sea",
		"Tech vs Nature",
		"Sweet vs Spicy",
		"Star vs Heart",
		"Sun vs Moon",
		"Music vs Art",
		"Food vs Drink",
		"Sport vs Game",
		"Animal vs Plant",
		"City vs Country",
		"Past vs Future",
		"Light vs Dark",
		"Hot vs Cold",
		"Big vs Small",
		"Fast vs Slow",
		"Old vs New",
	];

	const symbolSchemes = [
		"Stars vs Hearts",
		"Squares vs Circles",
		"Arrows vs Lines",
		"Shapes vs Numbers",
	];

	const hasMultipleValues =
		emojiSchemes.includes(binaryType) || symbolSchemes.includes(binaryType);

	return !(
		binaryType === "Vowels/Consonants" ||
		binaryType === "Odd/Even" ||
		hasMultipleValues
	);
}

// Helper function to check if cipher type is substitution
function isSubstitutionType(cipherType: string): boolean {
	const substitutionTypes = [
		"K1 Aristocrat",
		"K2 Aristocrat",
		"K3 Aristocrat",
		"Random Aristocrat",
		"K1 Patristocrat",
		"K2 Patristocrat",
		"K3 Patristocrat",
		"Random Patristocrat",
		"Caesar",
		"Atbash",
		"Affine",
		"Random Xenocrypt",
		"K1 Xenocrypt",
		"K2 Xenocrypt",
	];
	return substitutionTypes.includes(cipherType);
}

// Helper function to process cryptarithm hint
function processCryptarithmHint(
	item: QuoteData,
	index: number,
	quotes: QuoteData[],
	handleCryptarithmSolutionChange: (
		index: number,
		pos: number,
		value: string,
	) => void,
): void {
	if (!item.cryptarithmData) {
		return;
	}

	const allLetters = extractAllLetters(item.cryptarithmData.digitGroups);
	const allDigitsArr = extractAllDigits(item.cryptarithmData.digitGroups);
	const current = item.cryptarithmSolution || {};
	const unfilled = findUnfilledIndices(allLetters, current);

	if (unfilled.length === 0) {
		return;
	}

	const targetIndex = Math.floor(Math.random() * unfilled.length);
	const target = unfilled[targetIndex];
	if (target === undefined) {
		return;
	}

	const targetDigit = allDigitsArr[target];
	const letterAtTarget = allLetters[target];
	if (letterAtTarget === undefined || targetDigit === undefined) {
		return;
	}

	const correct = letterAtTarget.toUpperCase();
	const positionsToFill = findPositionsToFill(allDigitsArr, targetDigit);

	for (const pos of positionsToFill) {
		handleCryptarithmSolutionChange(index, pos, correct);
	}

	const currentQuote = quotes[index];
	if (currentQuote) {
		quotes[index] = {
			...currentQuote,
			cryptarithmHinted: {
				...(currentQuote.cryptarithmHinted || {}),
				...Object.fromEntries(positionsToFill.map((p) => [p, true])),
			},
		};
	}
}

interface QuestionCardProps {
	item: QuoteData;
	index: number;
	darkMode: boolean;
	isTestSubmitted: boolean;
	quotes: QuoteData[];
	activeHints: { [questionIndex: number]: boolean };
	getHintContent: (quote: QuoteData) => string;
	handleHintClick: (questionIndex: number) => void;
	setSelectedCipherType: (type: string) => void;
	setInfoModalOpen: (open: boolean) => void;
	handleSolutionChange: (
		quoteIndex: number,
		cipherLetter: string,
		plainLetter: string,
	) => void;
	handleBaconianSolutionChange: (
		quoteIndex: number,
		position: number,
		plainLetter: string,
	) => void;

	handleHillSolutionChange: (
		quoteIndex: number,
		type: "matrix" | "plaintext",
		value: string[][] | { [key: number]: string },
	) => void;
	handleNihilistSolutionChange: (
		quoteIndex: number,
		position: number,
		plainLetter: string,
	) => void;
	handleCheckerboardSolutionChange: (
		quoteIndex: number,
		position: number,
		plainLetter: string,
	) => void;
	handleCryptarithmSolutionChange: (
		quoteIndex: number,
		position: number,
		plainLetter: string,
	) => void;
	handleKeywordSolutionChange: (quoteIndex: number, keyword: string) => void;
	handleReportQuote?: (quoteIndex: number) => void;
	hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } };
	_hintCounts: { [questionIndex: number]: number };
	questionPoints?: { [key: number]: number };
	_resetTrigger?: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
	item,
	index,
	darkMode,
	isTestSubmitted,
	quotes,
	activeHints,
	getHintContent,
	handleHintClick,
	setSelectedCipherType,
	setInfoModalOpen,
	handleSolutionChange,
	handleBaconianSolutionChange,

	handleHillSolutionChange,
	handleNihilistSolutionChange,
	handleCheckerboardSolutionChange,
	handleCryptarithmSolutionChange,
	handleKeywordSolutionChange,
	handleReportQuote,
	hintedLetters,
	_hintCounts,
	questionPoints = {},
}) => {
	const [baconianSyncEnabled, setBaconianSyncEnabled] = useState<boolean>(true);

	useEffect(() => {
		if (item.cipherType === "Baconian" && item.baconianBinaryType) {
			setBaconianSyncEnabled(shouldEnableBaconianSync(item.baconianBinaryType));
		}
	}, [item.cipherType, item.baconianBinaryType]);

	const processedAuthor = useMemo(
		() => processAuthor(item.author),
		[item.author],
	);

	// Helper function to handle hint button click
	const handleHintButtonClick = (): void => {
		if (isTestSubmitted) {
			return;
		}
		if (item.cipherType === "Cryptarithm") {
			processCryptarithmHint(
				item,
				index,
				quotes,
				handleCryptarithmSolutionChange,
			);
		}
		handleHintClick(index);
	};

	// Helper functions to render specific cipher displays (extracted to reduce complexity)
	const renderHillDisplay = (): React.ReactNode => (
		<HillDisplay
			text={item.encrypted}
			matrix={item.matrix ?? []}
			quoteIndex={index}
			solution={item.hillSolution}
			onSolutionChange={(
				type: "matrix" | "plaintext",
				value: string[][] | { [key: number]: string },
			) => handleHillSolutionChange(index, type, value)}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
		/>
	);

	const renderPortaDisplay = (): React.ReactNode => (
		<PortaDisplay
			text={item.encrypted}
			keyword={item.portaKeyword ?? ""}
			quoteIndex={index}
			solution={item.solution}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleSolutionChange}
		/>
	);

	const renderBaconianDisplay = (): React.ReactNode => (
		<BaconianDisplay
			quoteIndex={index}
			solution={item.solution}
			quotes={quotes}
			activeHints={activeHints}
			isTestSubmitted={isTestSubmitted}
			onSolutionChange={handleBaconianSolutionChange}
			syncEnabled={baconianSyncEnabled}
		/>
	);

	const renderFractionatedMorseDisplay = (): React.ReactNode => (
		<FractionatedMorseDisplay
			text={item.encrypted}
			quoteIndex={index}
			solution={item.solution}
			fractionationTable={item.fractionationTable}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleSolutionChange}
			hintedLetters={hintedLetters}
		/>
	);

	const renderColumnarTranspositionDisplay = (): React.ReactNode => (
		<ColumnarTranspositionDisplay
			text={item.encrypted}
			quoteIndex={index}
			solution={item.solution}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleSolutionChange}
		/>
	);

	const renderNihilistDisplay = (): React.ReactNode => (
		<NihilistDisplay
			text={item.encrypted}
			polybiusKey={item.nihilistPolybiusKey ?? ""}
			cipherKey={item.nihilistCipherKey ?? ""}
			quoteIndex={index}
			solution={item.nihilistSolution}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleNihilistSolutionChange}
		/>
	);

	const renderCheckerboardDisplay = (): React.ReactNode => (
		<CheckerboardDisplay
			text={item.encrypted}
			rowKey={item.checkerboardRowKey ?? ""}
			colKey={item.checkerboardColKey ?? ""}
			polybiusKey={item.checkerboardPolybiusKey ?? ""}
			usesIJ={!!item.checkerboardUsesIJ}
			quoteIndex={index}
			solution={item.checkerboardSolution}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleCheckerboardSolutionChange}
		/>
	);

	const renderCryptarithmDisplay = (): React.ReactNode => (
		<CryptarithmDisplay
			text={item.encrypted}
			quoteIndex={index}
			solution={item.cryptarithmSolution}
			isTestSubmitted={isTestSubmitted}
			quotes={quotes}
			onSolutionChange={handleCryptarithmSolutionChange}
			cryptarithmData={item.cryptarithmData}
		/>
	);

	const renderSubstitutionDisplay = (): React.ReactNode => (
		<SubstitutionDisplay
			text={item.encrypted}
			quoteIndex={index}
			solution={item.solution}
			isTestSubmitted={isTestSubmitted}
			cipherType={item.cipherType}
			cipherKey={item.key}
			caesarShift={item.caesarShift}
			affineA={item.affineA}
			affineB={item.affineB}
			quotes={quotes}
			onSolutionChange={handleSolutionChange}
			onKeywordSolutionChange={handleKeywordSolutionChange}
			hintedLetters={hintedLetters}
			_hintCounts={_hintCounts}
		/>
	);

	// Helper function to get cipher display renderer
	const getCipherDisplayRenderer = (): (() => React.ReactNode) | null => {
		const cipherType = item.cipherType;
		const rendererMap: { [key: string]: () => React.ReactNode } = {
			"Hill 2x2": renderHillDisplay,
			"Hill 3x3": renderHillDisplay,
			Porta: renderPortaDisplay,
			Baconian: renderBaconianDisplay,
			"Fractionated Morse": renderFractionatedMorseDisplay,
			"Complete Columnar": renderColumnarTranspositionDisplay,
			Nihilist: renderNihilistDisplay,
			Checkerboard: renderCheckerboardDisplay,
			Cryptarithm: renderCryptarithmDisplay,
		};
		return rendererMap[cipherType] ?? null;
	};

	// Helper function to render cipher display (extracted to reduce complexity)
	const renderCipherDisplay = (): React.ReactNode => {
		const cipherType = item.cipherType;
		const renderer = getCipherDisplayRenderer();
		if (renderer) {
			return renderer();
		}
		if (isSubstitutionType(cipherType)) {
			return renderSubstitutionDisplay();
		}
		return (
			<div
				className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
			>
				Unknown cipher type: {cipherType}
			</div>
		);
	};

	// Helper function to render question header
	const renderQuestionHeader = (): React.ReactNode => {
		const pts = resolveQuestionPoints(item, index, questionPoints);
		return (
			<>
				Question {index + 1}
				<br className="md:hidden" />
				<span className="hidden md:inline"> </span>[{pts} pts]
			</>
		);
	};

	// Helper function to render Baconian sync button
	const renderBaconianSyncButton = (): React.ReactNode | null => {
		if (item.cipherType !== "Baconian") {
			return null;
		}

		// Extract className logic to reduce complexity
		const getButtonClassName = (): string => {
			const baseClasses =
				"px-2 py-1 rounded text-xs border transition-all duration-200";
			const stateClasses = baconianSyncEnabled
				? darkMode
					? "bg-blue-600 border-blue-500 text-white"
					: "bg-blue-500 border-blue-600 text-white"
				: darkMode
					? "bg-gray-600 border-gray-500 text-gray-300"
					: "bg-gray-200 border-gray-300 text-gray-600";
			const disabledClasses = isTestSubmitted
				? "opacity-50 cursor-not-allowed"
				: "hover:scale-105";
			return `${baseClasses} ${stateClasses} ${disabledClasses}`;
		};

		// Extract title logic to reduce complexity
		const getButtonTitle = (): string => {
			if (isTestSubmitted) {
				return "Sync disabled after submission";
			}
			return baconianSyncEnabled
				? "Disable input syncing"
				: "Enable input syncing";
		};

		return (
			<button
				type="button"
				onClick={() => setBaconianSyncEnabled(!baconianSyncEnabled)}
				disabled={isTestSubmitted}
				className={getButtonClassName()}
				title={getButtonTitle()}
			>
				{baconianSyncEnabled ? "Sync ON" : "Sync OFF"}
			</button>
		);
	};

	// Helper function to render hint card
	const renderHintCard = (): React.ReactNode | null => {
		if (
			!activeHints[index] ||
			isTestSubmitted ||
			item.cipherType === "Cryptarithm"
		) {
			return null;
		}
		return (
			<div
				className={`mb-4 p-3 rounded-lg border-l-4 ${
					darkMode
						? "bg-blue-900/30 border-blue-400 text-blue-200"
						: "bg-blue-50 border-blue-500 text-blue-700"
				}`}
			>
				<div className="flex items-center gap-2 mb-2">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-label="Hint"
					>
						<title>Hint</title>
						<path d="M9 12l2 2 4-4" />
						<path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
						<path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
						<path d="M13 12h3" />
						<path d="M8 12H5" />
					</svg>
					<span className="font-semibold text-sm">Hint</span>
				</div>
				<p className="text-sm font-mono">{getHintContent(item)}</p>
			</div>
		);
	};

	// Helper function to render difficulty bar
	const renderDifficultyBar = (): React.ReactNode => {
		const difficulty = item.difficulty || 0.5;
		const difficultyColor =
			difficulty >= 0.66
				? "bg-red-500"
				: difficulty >= 0.33
					? "bg-yellow-500"
					: "bg-green-500";
		return (
			<div className="absolute right-2 w-20 h-2 rounded-full bg-gray-300">
				<div
					className={`h-full rounded-full ${difficultyColor}`}
					style={{ width: `${difficulty * 100}%` }}
				/>
			</div>
		);
	};

	return (
		<div
			className={`relative border p-4 pb-4 rounded-lg transition-all duration-500 ease-in-out mb-6 question ${
				darkMode
					? "bg-gray-700 border-gray-600 text-white"
					: "bg-gray-50 border-gray-300 text-black"
			}`}
			data-question-card={true}
			data-question-index={index}
		>
			<div className="flex justify-between items-start">
				<h3
					data-question-header={true}
					className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					{renderQuestionHeader()}
				</h3>
				<div className="flex items-center gap-2">
					<span
						className={`px-2 py-1 rounded text-sm ${
							darkMode
								? "bg-gray-700 text-gray-300"
								: "bg-gray-100 text-gray-700"
						}`}
					>
						{item.cipherType.charAt(0).toUpperCase() + item.cipherType.slice(1)}
					</span>

					{renderBaconianSyncButton()}

					<button
						type="button"
						onClick={handleHintButtonClick}
						disabled={isTestSubmitted}
						className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 ${
							isTestSubmitted
								? "opacity-50 cursor-not-allowed"
								: "hover:scale-110"
						} ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "text-gray-600"}`}
						title={
							isTestSubmitted
								? "Hints are disabled after submission"
								: "Get a hint"
						}
					>
						<svg
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="Hint"
						>
							<title>Hint</title>
							<circle cx="12" cy="12" r="10" />
							<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
							<circle cx="12" cy="17" r="1" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedCipherType(item.cipherType);
							setInfoModalOpen(true);
						}}
						className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
							darkMode
								? "bg-gray-600 border-gray-500 text-white"
								: "text-gray-600"
						}`}
						title="Cipher information"
					>
						<svg
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="Cipher information"
						>
							<title>Cipher information</title>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4" />
							<path d="M12 8h.01" />
						</svg>
					</button>
					{isTestSubmitted && handleReportQuote && (
						<button
							type="button"
							onClick={() => handleReportQuote(index)}
							className={`w-5 h-5 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
								darkMode
									? "bg-gray-600 border-gray-500 text-white"
									: "text-gray-600"
							}`}
							title="Report quote issue"
						>
							<svg
								width="10"
								height="10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-label="Report"
							>
								<title>Report</title>
								<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
								<line x1="4" y1="22" x2="4" y2="15" />
							</svg>
						</button>
					)}
				</div>
			</div>
			{item.cipherType !== "Cryptarithm" && (
				<p
					className={`mb-4 break-words whitespace-normal overflow-x-auto ${darkMode ? "text-gray-300" : "text-gray-900"}`}
				>
					{processedAuthor}
				</p>
			)}

			{renderHintCard()}

			{renderCipherDisplay()}

			{renderDifficultyBar()}
		</div>
	);
};
