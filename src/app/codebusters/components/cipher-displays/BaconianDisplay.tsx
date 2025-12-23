import { baconianSchemes } from "@/app/codebusters/schemes/baconian-schemes";
import {
	getCssClassForFormatting,
	getDisplayLetter,
	renderBinaryGroup,
} from "@/app/codebusters/schemes/display-renderer";
import type { QuoteData } from "@/app/codebusters/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Top-level regex for whitespace splitting
const WHITESPACE_REGEX = /\s+/;

interface BaconianDisplayProps {
	quotes: QuoteData[];
	quoteIndex: number;
	solution?: { [key: number]: string };
	activeHints: { [questionIndex: number]: boolean };
	isTestSubmitted?: boolean;
	onSolutionChange?: (
		quoteIndex: number,
		groupIndex: number,
		value: string,
	) => void;

	syncEnabled?: boolean;
}

export const BaconianDisplay: React.FC<BaconianDisplayProps> = ({
	quotes,
	quoteIndex,
	solution,
	activeHints,
	isTestSubmitted = false,
	onSolutionChange,
	syncEnabled = true,
}) => {
	const { darkMode } = useTheme();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
		null,
	);

	// Helper function to render binary group characters
	const renderBinaryGroupChars = (
		group: string,
		groupIndex: number,
		binaryType: string,
	): React.ReactNode[] => {
		return toGraphemes(group)
			.slice(0, 5)
			.map((char, j) => {
				const allSchemes = [
					...baconianSchemes.schemes.traditional,
					...baconianSchemes.schemes.emoji,
					...baconianSchemes.schemes.symbols,
					...baconianSchemes.schemes.formatting,
				];
				const scheme = allSchemes.find((s) => s.type === binaryType);

				if (scheme && scheme.renderType === "formatting") {
					const cssClass = getCssClassForFormatting(char, scheme);
					const position = `${groupIndex}-${j}`;
					const displayLetter = getDisplayLetter(char, position, scheme);

					let inlineStyle = {};
					if (scheme.type === "Highlight vs Plain" && char === "A") {
						inlineStyle = {
							backgroundColor: darkMode ? "#fef3c7" : "#fef9c3",
							padding: "1px 2px",
							borderRadius: "2px",
						};
					}

					return (
						<span
							key={position}
							className={`mx-0.5 ${cssClass}`}
							style={inlineStyle}
						>
							{displayLetter}
						</span>
					);
				}
				return (
					<span key={`${groupIndex}-${j}-${char}`} className="mx-0.5">
						{char}
					</span>
				);
			});
	};

	// Helper function to get focus classes
	const getFocusClasses = (
		groupIndex: number,
		shouldHighlight: boolean,
	): string => {
		if (selectedGroupIndex === groupIndex) {
			return "border-2 border-blue-500";
		}
		if (shouldHighlight) {
			return "border-2 border-blue-300";
		}
		return darkMode
			? "bg-gray-800 border-gray-600 text-gray-300 focus:border-blue-500"
			: "bg-white border-gray-300 text-gray-900 focus:border-blue-500";
	};

	// Helper function to get state classes
	const getStateClasses = (
		isTestSubmitted: boolean,
		isHinted: boolean,
		isCorrect: boolean,
	): string => {
		if (!isTestSubmitted) {
			return "";
		}
		if (isHinted) {
			return "border-yellow-500 bg-yellow-100/10";
		}
		return isCorrect
			? "border-green-500 bg-green-100/10"
			: "border-red-500 bg-red-100/10";
	};

	// Helper function to get input className
	const getInputClassName = (
		groupIndex: number,
		shouldHighlight: boolean,
		isTestSubmitted: boolean,
		isHinted: boolean,
		isCorrect: boolean,
	): string => {
		const baseClasses = "w-8 h-8 text-center border rounded text-sm font-mono";
		const focusClasses = getFocusClasses(groupIndex, shouldHighlight);
		const stateClasses = getStateClasses(isTestSubmitted, isHinted, isCorrect);
		return `${baseClasses} ${focusClasses} ${stateClasses}`;
	};

	// Helper function to get group display className
	const getGroupDisplayClassName = (binaryType: string): string => {
		const baseClasses = `text-xs sm:text-sm mb-1 font-mono ${
			darkMode ? "text-gray-400" : "text-gray-600"
		}`;
		const emojiClass =
			binaryType &&
			baconianSchemes.schemes.emoji.some((s) => s.type === binaryType)
				? "baconian-emoji"
				: "";
		return `${baseClasses} ${emojiClass}`;
	};

	// Binary group display component (extracted to reduce complexity)
	const BinaryGroupDisplay = ({
		group,
		groupIndex,
		value,
		correctLetter,
		isCorrect,
		isHinted,
		shouldHighlight,
		binaryType,
		quoteIndex,
		onInputChange,
		onFocus,
	}: {
		group: string;
		groupIndex: number;
		value: string;
		correctLetter: string;
		isCorrect: boolean;
		isHinted: boolean;
		shouldHighlight: boolean;
		binaryType: string;
		quoteIndex: number;
		onInputChange: (value: string) => void;
		onFocus: () => void;
	}) => (
		<div key={groupIndex} className="flex flex-col items-center">
			<div className={getGroupDisplayClassName(binaryType)}>
				{renderBinaryGroupChars(group, groupIndex, binaryType)}
			</div>
			<div className="relative h-12 sm:h-14">
				<input
					type="text"
					id={`baconian-${quoteIndex}-${groupIndex}`}
					value={value}
					disabled={isTestSubmitted}
					onClick={(e) => {
						if (isTestSubmitted) {
							return;
						}
						e.stopPropagation();
						onFocus();
						// Ensure input gets focus on mobile
						e.currentTarget.focus();
					}}
					onFocus={onFocus}
					onChange={(e) => {
						// Filter to only allow letters
						const filtered = e.target.value
							.toUpperCase()
							.replace(/[^A-Z]/g, "")
							.slice(0, 1);
						onInputChange(filtered);
					}}
					className={getInputClassName(
						groupIndex,
						shouldHighlight,
						isTestSubmitted,
						isHinted,
						isCorrect,
					)}
					maxLength={1}
					autoComplete="off"
					inputMode="text"
					data-quote-index={quoteIndex}
					data-group-index={groupIndex}
				/>
				{isTestSubmitted && !isCorrect && (
					<div
						className={`absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs ${
							darkMode ? "text-red-400" : "text-red-600"
						}`}
					>
						{correctLetter}
					</div>
				)}
			</div>
		</div>
	);

	const toGraphemes = (str: string): string[] => {
		try {
			// Use grapheme segmentation so multi-codepoint emojis count as a single symbol
			// Fallback to Array.from if Intl.Segmenter is unavailable
			const Segmenter =
				typeof Intl !== "undefined" && "Segmenter" in Intl
					? Intl.Segmenter
					: undefined;
			if (Segmenter) {
				const seg = new Segmenter(undefined, { granularity: "grapheme" });
				return Array.from(seg.segment(str), (s) => s.segment);
			}
			return Array.from(str);
		} catch {
			return Array.from(str);
		}
	};

	// Helper function to convert letters to binary groups
	const convertLettersToBinary = useCallback(
		(cleanedQuote: string): string[] => {
			const letterToBinary: { [key: string]: string } = {
				A: "AAAAA",
				B: "AAAAB",
				C: "AAABA",
				D: "AAABB",
				E: "AABAA",
				F: "AABAB",
				G: "AABBA",
				H: "AABBB",
				I: "ABAAA",
				J: "ABAAA",
				K: "ABAAB",
				L: "ABABA",
				M: "ABABB",
				N: "ABBAA",
				O: "ABBAB",
				P: "ABBBA",
				Q: "ABBBB",
				R: "BAAAA",
				S: "BAAAB",
				T: "BAABA",
				U: "BAABB",
				V: "BAABB",
				W: "BABAA",
				X: "BABAB",
				Y: "BABBA",
				Z: "BABBB",
			};

			const binaryGroups: string[] = [];
			for (const letter of cleanedQuote) {
				if (letter) {
					const binary = letterToBinary[letter];
					if (binary !== undefined) {
						binaryGroups.push(binary);
					}
				}
			}
			return binaryGroups;
		},
		[],
	);

	// Helper function to apply binary filter
	const applyBinaryFilter = useCallback(
		(binaryGroup: string, binaryType: string, groupIndex: number): string => {
			const allSchemes = [
				...baconianSchemes.schemes.traditional,
				...baconianSchemes.schemes.emoji,
				...baconianSchemes.schemes.symbols,
				...baconianSchemes.schemes.formatting,
			];
			const scheme = allSchemes.find((s) => s.type === binaryType);

			if (scheme) {
				return renderBinaryGroup(binaryGroup, scheme, String(groupIndex));
			}

			return binaryGroup;
		},
		[],
	);

	// Helper function to get filtered groups from stored or generate new
	const getFilteredGroups = useCallback(
		(
			storedGroups: string[] | null,
			binaryGroups: string[],
			binaryType: string,
		): string[] => {
			if (storedGroups && storedGroups.length > 0) {
				const shouldRender = storedGroups.every((group) =>
					/^[AB]{5}$/.test(group),
				);
				return shouldRender
					? storedGroups.map((group, index) =>
							applyBinaryFilter(group, binaryType, index),
						)
					: storedGroups;
			}
			return binaryGroups.map((group, index) =>
				applyBinaryFilter(group, binaryType, index),
			);
		},
		[applyBinaryFilter],
	);

	// Helper function to process filtered groups
	const processFilteredGroups = useCallback(
		(
			storedGroups: string[] | null,
			binaryGroups: string[],
			binaryType: string,
		): string[] => {
			let filteredGroups = getFilteredGroups(
				storedGroups,
				binaryGroups,
				binaryType,
			);

			// Ensure groups align exactly with 5-bit Baconian groups
			if (filteredGroups.length !== binaryGroups.length) {
				filteredGroups = binaryGroups.map((group, index) =>
					applyBinaryFilter(group, binaryType, index),
				);
			}

			// Clamp to the exact number of plaintext groups so no extras render or get graded
			return filteredGroups.slice(0, binaryGroups.length);
		},
		[getFilteredGroups, applyBinaryFilter],
	);

	const splitEncryptedGroups = useCallback(
		(encrypted: string, groupCount: number): string[] | null => {
			const trimmed = encrypted.trim();
			if (!trimmed) {
				return null;
			}
			const whitespaceSplit = trimmed.split(WHITESPACE_REGEX).filter(Boolean);
			if (whitespaceSplit.length === groupCount) {
				return whitespaceSplit;
			}
			const isPlainBinary = /^[AB]+$/.test(trimmed);
			if (isPlainBinary && trimmed.length % 5 === 0) {
				const chunks = trimmed.match(/.{1,5}/g);
				return chunks && chunks.length === groupCount ? chunks : null;
			}
			return null;
		},
		[],
	);

	const baconianData = useMemo(() => {
		const quote = quotes[quoteIndex];
		if (!quote) {
			return {
				originalQuote: "",
				binaryGroups: [],
				groupKeys: [],
				binaryType: "",
			};
		}

		const cleanedQuote = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
		const binaryGroups = convertLettersToBinary(cleanedQuote);

		// Prefer pre-generated encrypted groups from the question (stable and synchronized with grading)
		const storedGroups = quote.encrypted
			? splitEncryptedGroups(quote.encrypted, binaryGroups.length)
			: null;
		const filteredGroups = processFilteredGroups(
			storedGroups,
			binaryGroups,
			quote.baconianBinaryType || "",
		);
		const groupKeys = storedGroups?.every((group) => /^[AB]{5}$/.test(group))
			? storedGroups
			: binaryGroups;

		return {
			originalQuote: cleanedQuote,
			binaryGroups: filteredGroups,
			groupKeys,
			binaryType: quote.baconianBinaryType || "",
		};
	}, [
		quotes,
		quoteIndex,
		convertLettersToBinary,
		processFilteredGroups,
		splitEncryptedGroups,
	]);

	const handleInputChange = useCallback(
		(groupIndex: number, value: string) => {
			if (!onSolutionChange) {
				return;
			}

			const upperValue = value.toUpperCase();

			if (syncEnabled) {
				const currentGroupKey = baconianData.groupKeys?.[groupIndex];
				if (currentGroupKey) {
					baconianData.groupKeys.forEach((groupKey, index) => {
						if (groupKey === currentGroupKey) {
							onSolutionChange(quoteIndex, index, upperValue);
						}
					});
				} else {
					onSolutionChange(quoteIndex, groupIndex, upperValue);
				}
			} else {
				onSolutionChange(quoteIndex, groupIndex, upperValue);
			}
		},
		[onSolutionChange, syncEnabled, baconianData.groupKeys, quoteIndex],
	);

	useEffect(() => {
		if (isTestSubmitted) {
			return;
		}

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			const container = containerRef.current;
			if (!container || !target) {
				return;
			}
			if (!container.contains(target)) {
				setSelectedGroupIndex(null);
				return;
			}
			const isInput = Boolean(target.closest('input[id^="baconian-"]'));
			if (!isInput) {
				setSelectedGroupIndex(null);
			}
		};

		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, [isTestSubmitted]);

	useEffect(() => {
		if (isTestSubmitted || selectedGroupIndex === null) {
			return;
		}

		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === "Escape") {
				setSelectedGroupIndex(null);
				return;
			}
			if (event.key === "Backspace" || event.key === "Delete") {
				handleInputChange(selectedGroupIndex, "");
				return;
			}
			if (event.key.length === 1 && /[A-Za-z]/.test(event.key)) {
				handleInputChange(selectedGroupIndex, event.key.toUpperCase());
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleInputChange, isTestSubmitted, selectedGroupIndex]);

	return (
		<div
			ref={containerRef}
			className="font-mono"
			style={{ fontFamily: "Poppins, sans-serif" }}
		>
			<div
				className={`mb-4 p-2 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
				style={{ fontFamily: "Poppins, sans-serif" }}
			>
				<p
					className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					Note: Using 24-letter alphabet (I/J same, U/V same)
				</p>
				<div className="flex items-center gap-2 mt-1">
					{activeHints[quoteIndex] && baconianData.binaryType && (
						<p
							className={`text-sm ${darkMode ? "text-blue-300" : "text-blue-600"}`}
						>
							Binary Type: {baconianData.binaryType}
						</p>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-4">
				{baconianData.binaryGroups.map((group, i) => {
					const value = solution?.[i] || "";
					const correctLetter = baconianData.originalQuote[i] || "";
					const isCorrect = value === correctLetter;
					const quote = quotes[quoteIndex];
					const isHinted = Boolean(quote?.baconianHinted?.[i]);

					const shouldHighlight =
						syncEnabled &&
						selectedGroupIndex !== null &&
						baconianData.groupKeys?.[selectedGroupIndex] ===
							baconianData.groupKeys?.[i];

					return (
						<BinaryGroupDisplay
							key={`${i}-${group}`}
							group={group}
							groupIndex={i}
							value={value}
							correctLetter={correctLetter}
							isCorrect={isCorrect}
							isHinted={isHinted}
							shouldHighlight={shouldHighlight}
							binaryType={baconianData.binaryType}
							quoteIndex={quoteIndex}
							onInputChange={(val) => handleInputChange(i, val)}
							onFocus={() => setSelectedGroupIndex(i)}
						/>
					);
				})}
			</div>

			{/* Show original quote after submission */}
			{isTestSubmitted && (
				<div
					className={`mt-8 p-4 rounded ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
				>
					<p
						className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Original Quote:
					</p>
					<p
						className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-900"}`}
					>
						{quotes[quoteIndex]?.quote?.replace(/\[.*?\]/g, "") || ""}
					</p>
				</div>
			)}
		</div>
	);
};
