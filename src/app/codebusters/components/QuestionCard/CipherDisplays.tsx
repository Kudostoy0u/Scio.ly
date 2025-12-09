import type { QuoteData } from "@/app/codebusters/types";
import type React from "react";
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
} from "../cipher-displays";
import type { QuestionCardProps } from "./types";

interface CipherDisplayRendererProps {
	item: QuoteData;
	index: number;
	darkMode: boolean;
	isTestSubmitted: boolean;
	quotes: QuoteData[];
	activeHints: QuestionCardProps["activeHints"];
	handleSolutionChange: QuestionCardProps["handleSolutionChange"];
	handleBaconianSolutionChange: QuestionCardProps["handleBaconianSolutionChange"];
	handleHillSolutionChange: QuestionCardProps["handleHillSolutionChange"];
	handleNihilistSolutionChange: QuestionCardProps["handleNihilistSolutionChange"];
	handleCheckerboardSolutionChange: QuestionCardProps["handleCheckerboardSolutionChange"];
	handleCryptarithmSolutionChange: QuestionCardProps["handleCryptarithmSolutionChange"];
	handleKeywordSolutionChange: QuestionCardProps["handleKeywordSolutionChange"];
	hintedLetters: QuestionCardProps["hintedLetters"];
	_hintCounts: QuestionCardProps["_hintCounts"];
	baconianSyncEnabled: boolean;
}

export const renderHillDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<HillDisplay
		text={props.item.encrypted}
		matrix={props.item.matrix ?? []}
		quoteIndex={props.index}
		solution={props.item.hillSolution}
		onSolutionChange={(
			type: "matrix" | "plaintext",
			value: string[][] | { [key: number]: string },
		) => props.handleHillSolutionChange(props.index, type, value)}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
	/>
);

export const renderPortaDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<PortaDisplay
		text={props.item.encrypted}
		keyword={props.item.portaKeyword ?? ""}
		quoteIndex={props.index}
		solution={props.item.solution}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleSolutionChange}
	/>
);

export const renderBaconianDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<BaconianDisplay
		quoteIndex={props.index}
		solution={props.item.solution}
		quotes={props.quotes}
		activeHints={props.activeHints}
		isTestSubmitted={props.isTestSubmitted}
		onSolutionChange={props.handleBaconianSolutionChange}
		syncEnabled={props.baconianSyncEnabled}
	/>
);

export const renderFractionatedMorseDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<FractionatedMorseDisplay
		text={props.item.encrypted}
		quoteIndex={props.index}
		solution={props.item.solution}
		fractionationTable={props.item.fractionationTable}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleSolutionChange}
		hintedLetters={props.hintedLetters}
	/>
);

export const renderColumnarTranspositionDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<ColumnarTranspositionDisplay
		text={props.item.encrypted}
		quoteIndex={props.index}
		solution={props.item.solution}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleSolutionChange}
	/>
);

export const renderNihilistDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<NihilistDisplay
		text={props.item.encrypted}
		polybiusKey={props.item.nihilistPolybiusKey ?? ""}
		cipherKey={props.item.nihilistCipherKey ?? ""}
		quoteIndex={props.index}
		solution={props.item.nihilistSolution}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleNihilistSolutionChange}
	/>
);

export const renderCheckerboardDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<CheckerboardDisplay
		text={props.item.encrypted}
		rowKey={props.item.checkerboardRowKey ?? ""}
		colKey={props.item.checkerboardColKey ?? ""}
		polybiusKey={props.item.checkerboardPolybiusKey ?? ""}
		usesIJ={!!props.item.checkerboardUsesIJ}
		quoteIndex={props.index}
		solution={props.item.checkerboardSolution}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleCheckerboardSolutionChange}
	/>
);

export const renderCryptarithmDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<CryptarithmDisplay
		text={props.item.encrypted}
		quoteIndex={props.index}
		solution={props.item.cryptarithmSolution}
		isTestSubmitted={props.isTestSubmitted}
		quotes={props.quotes}
		onSolutionChange={props.handleCryptarithmSolutionChange}
		cryptarithmData={props.item.cryptarithmData}
	/>
);

export const renderSubstitutionDisplay = (
	props: CipherDisplayRendererProps,
): React.ReactNode => (
	<SubstitutionDisplay
		text={props.item.encrypted}
		quoteIndex={props.index}
		solution={props.item.solution}
		isTestSubmitted={props.isTestSubmitted}
		cipherType={props.item.cipherType}
		cipherKey={props.item.key}
		caesarShift={props.item.caesarShift}
		affineA={props.item.affineA}
		affineB={props.item.affineB}
		quotes={props.quotes}
		onSolutionChange={props.handleSolutionChange}
		onKeywordSolutionChange={props.handleKeywordSolutionChange}
		hintedLetters={props.hintedLetters}
		_hintCounts={props._hintCounts}
	/>
);

export const getCipherDisplayRenderer = (
	cipherType: string,
	props: CipherDisplayRendererProps,
): (() => React.ReactNode) | null => {
	const rendererMap: { [key: string]: () => React.ReactNode } = {
		"Hill 2x2": () => renderHillDisplay(props),
		"Hill 3x3": () => renderHillDisplay(props),
		Porta: () => renderPortaDisplay(props),
		Baconian: () => renderBaconianDisplay(props),
		"Fractionated Morse": () => renderFractionatedMorseDisplay(props),
		"Complete Columnar": () => renderColumnarTranspositionDisplay(props),
		Nihilist: () => renderNihilistDisplay(props),
		Checkerboard: () => renderCheckerboardDisplay(props),
		Cryptarithm: () => renderCryptarithmDisplay(props),
	};
	return rendererMap[cipherType] ?? null;
};
