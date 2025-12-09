import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { ActionButtons } from "./ActionButtons";
import { BaconianSyncButton } from "./BaconianSyncButton";
import {
	getCipherDisplayRenderer,
	renderSubstitutionDisplay,
} from "./CipherDisplays";
import { DifficultyBar } from "./DifficultyBar";
import { HintCard } from "./HintCard";
import { QuestionHeader } from "./QuestionHeader";
import type { QuestionCardProps } from "./types";
import {
	isSubstitutionType,
	processAuthor,
	processCryptarithmHint,
	shouldEnableBaconianSync,
} from "./utils";

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

	const renderCipherDisplay = (): React.ReactNode => {
		const cipherType = item.cipherType;
		const displayProps = {
			item,
			index,
			darkMode,
			isTestSubmitted,
			quotes,
			activeHints,
			handleSolutionChange,
			handleBaconianSolutionChange,
			handleHillSolutionChange,
			handleNihilistSolutionChange,
			handleCheckerboardSolutionChange,
			handleCryptarithmSolutionChange,
			handleKeywordSolutionChange,
			hintedLetters,
			_hintCounts,
			baconianSyncEnabled,
		};

		const renderer = getCipherDisplayRenderer(cipherType, displayProps);
		if (renderer) {
			return renderer();
		}
		if (isSubstitutionType(cipherType)) {
			return renderSubstitutionDisplay(displayProps);
		}
		return (
			<div
				className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
			>
				Unknown cipher type: {cipherType}
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
				<QuestionHeader
					index={index}
					item={item}
					questionPoints={questionPoints}
					darkMode={darkMode}
				/>
				<div className="flex items-center gap-2">
					<ActionButtons
						cipherType={item.cipherType}
						darkMode={darkMode}
						isTestSubmitted={isTestSubmitted}
						onHintClick={handleHintButtonClick}
						onInfoClick={() => {
							setSelectedCipherType(item.cipherType);
							setInfoModalOpen(true);
						}}
						onReportClick={
							handleReportQuote ? () => handleReportQuote(index) : undefined
						}
					/>
					<BaconianSyncButton
						cipherType={item.cipherType}
						baconianSyncEnabled={baconianSyncEnabled}
						setBaconianSyncEnabled={setBaconianSyncEnabled}
						isTestSubmitted={isTestSubmitted}
						darkMode={darkMode}
					/>
				</div>
			</div>
			{item.cipherType !== "Cryptarithm" && (
				<p
					className={`mb-4 break-words whitespace-normal overflow-x-auto ${darkMode ? "text-gray-300" : "text-gray-900"}`}
				>
					{processedAuthor}
				</p>
			)}

			<HintCard
				isActive={activeHints[index] || false}
				isTestSubmitted={isTestSubmitted}
				cipherType={item.cipherType}
				getHintContent={getHintContent}
				item={item}
				darkMode={darkMode}
			/>

			{renderCipherDisplay()}

			<DifficultyBar difficulty={item.difficulty || 0.5} />
		</div>
	);
};
