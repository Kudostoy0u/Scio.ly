"use client";

import type { QuoteData } from "../types";
import { QuestionCard } from "./QuestionCard";

interface QuestionsListProps {
	quotes: QuoteData[];
	darkMode: boolean;
	isTestSubmitted: boolean;
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
}

export default function QuestionsList({
	quotes,
	darkMode,
	isTestSubmitted,
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
}: QuestionsListProps) {
	const quotesWithPositions = quotes.map((item, position) => ({
		item,
		position,
	}));
	return (
		<>
			{quotesWithPositions.map(({ item, position }) => (
				<QuestionCard
					key={`question-${position}-${item.cipherType || ""}-${item.quote?.substring(0, 10) || ""}`}
					item={item}
					index={position}
					darkMode={darkMode}
					isTestSubmitted={isTestSubmitted}
					quotes={quotes}
					activeHints={activeHints}
					getHintContent={getHintContent}
					handleHintClick={handleHintClick}
					setSelectedCipherType={setSelectedCipherType}
					setInfoModalOpen={setInfoModalOpen}
					handleSolutionChange={handleSolutionChange}
					handleBaconianSolutionChange={handleBaconianSolutionChange}
					handleHillSolutionChange={handleHillSolutionChange}
					handleNihilistSolutionChange={handleNihilistSolutionChange}
					handleCheckerboardSolutionChange={handleCheckerboardSolutionChange}
					handleCryptarithmSolutionChange={handleCryptarithmSolutionChange}
					handleKeywordSolutionChange={handleKeywordSolutionChange}
					handleReportQuote={handleReportQuote}
					hintedLetters={hintedLetters}
					_hintCounts={_hintCounts}
				/>
			))}
		</>
	);
}
