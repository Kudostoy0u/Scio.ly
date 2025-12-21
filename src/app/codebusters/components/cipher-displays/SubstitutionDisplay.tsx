"use client";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useState } from "react";
import { ReplacementTable } from "./ReplacementTable";
import { CharacterDisplay } from "./SubstitutionDisplay/components/CharacterDisplay";
import { KeywordInputSection } from "./SubstitutionDisplay/components/KeywordInputSection";
import { getCipherInfo } from "./SubstitutionDisplay/utils/cipherInfo";
import { buildCorrectMappingForSubstitution } from "./SubstitutionDisplay/utils/mappingBuilders";
import { handleSolutionChangeWithValidation } from "./SubstitutionDisplay/utils/solutionValidation";

// Top-level regex patterns
const XENOCRYPT_LETTER_REGEX = /[A-ZÑ]/;
const STANDARD_LETTER_REGEX = /[A-Z]/;

interface SubstitutionDisplayProps {
	text: string;
	quoteIndex: number;
	solution?: { [key: string]: string };
	isTestSubmitted: boolean;
	cipherType: string;
	cipherKey?: string;
	caesarShift?: number;
	affineA?: number;
	affineB?: number;
	quotes: QuoteData[];
	onSolutionChange: (
		quoteIndex: number,
		cipherLetter: string,
		plainLetter: string,
	) => void;
	hintedLetters: { [questionIndex: number]: { [letter: string]: boolean } };
	_hintCounts: { [questionIndex: number]: number };
	onKeywordSolutionChange?: (quoteIndex: number, keyword: string) => void;
}

export const SubstitutionDisplay = ({
	text,
	quoteIndex,
	solution,
	isTestSubmitted,
	cipherType,
	cipherKey: _cipherKey,
	caesarShift,
	affineA,
	affineB,
	quotes,
	onSolutionChange,
	hintedLetters,
	onKeywordSolutionChange,
}: SubstitutionDisplayProps) => {
	const { darkMode } = useTheme();
	const [focusedCipherLetter, setFocusedCipherLetter] = useState<string | null>(
		null,
	);

	const handleCharChange = (cipherLetter: string, newPlainLetter: string) => {
		handleSolutionChangeWithValidation(
			solution,
			isTestSubmitted,
			cipherLetter,
			newPlainLetter,
			onSolutionChange,
			quoteIndex,
		);
	};

	const correctMapping: { [key: string]: string } =
		isTestSubmitted && quotes[quoteIndex]
			? buildCorrectMappingForSubstitution(
					cipherType,
					quotes[quoteIndex],
					quoteIndex,
					quotes,
				)
			: {};

	const currentQuote = quotes[quoteIndex];

	return (
		<div className="font-mono">
			{currentQuote && (
				<KeywordInputSection
					quote={currentQuote}
					isTestSubmitted={isTestSubmitted}
					darkMode={darkMode}
					quoteIndex={quoteIndex}
					onKeywordSolutionChange={onKeywordSolutionChange}
				/>
			)}
			<div
				className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				{getCipherInfo(cipherType, caesarShift, affineA, affineB)}
			</div>
			{/* Group characters into blocks (consecutive letters without spaces) */}
			{(() => {
				const charsWithPositions = text
					.split("")
					.map((char, i) => ({ char, position: i }));

				const isXenocrypt = cipherType.includes("Xenocrypt");
				const blocks: Array<Array<{ char: string; position: number }>> = [];
				let currentBlock: Array<{ char: string; position: number }> = [];

				for (let i = 0; i < charsWithPositions.length; i++) {
					const { char, position } = charsWithPositions[i] ?? {
						char: "",
						position: i,
					};
					// isLetter is computed but not used in this scope - used in CharacterDisplay component
					// const isLetter = isXenocrypt
					// 	? XENOCRYPT_LETTER_REGEX.test(char)
					// 	: STANDARD_LETTER_REGEX.test(char);
					const isSpace = char === " " || char === "\n" || char === "\t";

					if (isSpace) {
						// If we have a current block, finalize it
						if (currentBlock.length > 0) {
							blocks.push(currentBlock);
							currentBlock = [];
						}
						// Add the space as its own "block" so it renders
						blocks.push([{ char, position }]);
					} else {
						currentBlock.push({ char, position });
					}
				}
				// Add any remaining characters as a final block
				if (currentBlock.length > 0) {
					blocks.push(currentBlock);
				}

				return (
					<div className="flex flex-wrap gap-y-8 text-sm sm:text-base break-words whitespace-pre-wrap">
						{blocks.map((block) => {
							const firstPosition = block[0]?.position ?? 0;
							return (
								<div
									key={`block-${firstPosition}`}
									className="flex gap-0 flex-nowrap"
									style={{ flexShrink: 0 }}
								>
									{block.map(({ char, position }) => {
										const isLetter = isXenocrypt
											? XENOCRYPT_LETTER_REGEX.test(char)
											: STANDARD_LETTER_REGEX.test(char);
										const value = solution?.[char] || "";
										const isCorrect =
											isLetter && value === correctMapping[char];
										const isHinted = Boolean(
											isLetter && hintedLetters[quoteIndex]?.[char],
										);
										const showCorrectAnswer = Boolean(
											isTestSubmitted && isLetter,
										);
										const isSameCipherLetter = Boolean(
											isLetter && focusedCipherLetter === char,
										);

										return (
											<CharacterDisplay
												key={`sub-char-${char}-${position}`}
												char={char}
												i={position}
												isLetter={isLetter}
												value={value}
												isCorrect={isCorrect}
												isHinted={isHinted}
												showCorrectAnswer={showCorrectAnswer}
												isSameCipherLetter={isSameCipherLetter}
												correctMappingValue={correctMapping[char] || ""}
												darkMode={darkMode}
												quoteIndex={quoteIndex}
												onCharChange={handleCharChange}
												onFocus={setFocusedCipherLetter}
												onBlur={() => setFocusedCipherLetter(null)}
											/>
										);
									})}
								</div>
							);
						})}
					</div>
				);
			})()}

			{/* Replacement Table for substitution ciphers */}
			{[
				"K1 Aristocrat",
				"K2 Aristocrat",
				"K3 Aristocrat",
				"K1 Patristocrat",
				"K2 Patristocrat",
				"K3 Patristocrat",
				"Random Aristocrat",
				"Random Patristocrat",
				"Atbash",
				"Caesar",
				"Affine",
				"Random Xenocrypt",
				"K1 Xenocrypt",
				"K2 Xenocrypt",
				"K3 Xenocrypt",
			].includes(cipherType) && (
				<ReplacementTable
					text={text}
					cipherType={cipherType}
					quoteIndex={quoteIndex}
					solution={solution || {}}
					onSolutionChange={handleCharChange}
					correctMapping={correctMapping}
					isTestSubmitted={isTestSubmitted}
					hintedLetters={{ [quoteIndex]: hintedLetters[quoteIndex] || {} }}
				/>
			)}
		</div>
	);
};
