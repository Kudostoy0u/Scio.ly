import type { QuoteData } from "@/app/codebusters/types";

export interface QuestionCardProps {
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
