"use client";

import TestContainer from "@/app/components/TestContainer";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useState } from "react";
import QuestionsList from "../components/QuestionsList";
import type { QuoteData } from "../types";

// Dummy handlers for print view (not interactive)
const noop = () => {};

export default function CodebustersPrintPage() {
	const { darkMode } = useTheme();
	const [quotes, setQuotes] = useState<QuoteData[]>([]);
	const [tournamentName, setTournamentName] = useState("");

	useEffect(() => {
		// Get quotes from localStorage (set by main page before opening print)
		const storedQuotes = localStorage.getItem("__codebusters_print_quotes__");
		const storedTournament = localStorage.getItem(
			"__codebusters_print_tournament__",
		);

		if (storedQuotes) {
			try {
				const parsed = JSON.parse(storedQuotes);
				setQuotes(parsed);
			} catch (e) {
				console.error("Failed to parse quotes:", e);
			}
		}

		if (storedTournament) {
			setTournamentName(storedTournament);
		}

		// Clean up localStorage after reading
		setTimeout(() => {
			localStorage.removeItem("__codebusters_print_quotes__");
			localStorage.removeItem("__codebusters_print_tournament__");
		}, 1000);
	}, []);

	// Auto-print when page loads
	useEffect(() => {
		if (quotes.length > 0) {
			// Wait a bit for React to render
			const timer = setTimeout(() => {
				window.print();
			}, 500);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [quotes.length]);

	if (quotes.length === 0) {
		return (
			<div className="p-8 text-center">
				<p>Loading print view...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<style jsx global>{`
				@media print {
					/* Hide everything except the print content */
					body > *:not(.print-content) {
						display: none !important;
					}
					
					/* Hide UI elements within print content */
					header,
					nav,
					[class*="Header"]:not([class*="QuestionHeader"]),
					[class*="Timer"],
					[class*="ProgressBar"],
					[class*="SubmitButton"],
					[class*="Floating"],
					button,
					[role="button"],
					[class*="back"],
					[class*="Back"],
					[class*="HintCard"],
					[class*="hint-card"],
					[class*="ActionButtons"],
					[class*="action-buttons"],
					[class*="BaconianSyncButton"],
					[class*="DifficultyBar"],
					[class*="difficulty-bar"],
					svg[aria-label="Hint"],
					svg[aria-label="Info"],
					svg[aria-label="Report"],
					svg[aria-label="Close"],
					[title="Get a hint"],
					[title="Cipher information"],
					[title="Report quote issue"] {
						display: none !important;
					}
					
					/* Show tournament name */
					.tournament-name {
						display: block !important;
						text-align: center;
						font-size: 18px;
						font-weight: bold;
						margin-bottom: 20px;
						page-break-after: avoid;
					}
					
					/* Ensure questions are visible */
					.print-content {
						display: block !important;
					}
					
					/* Hide hint buttons and action buttons in question cards */
					.print-content [class*="Hint"],
					.print-content [class*="hint"],
					.print-content [class*="Action"],
					.print-content [class*="action"],
					.print-content svg[aria-label="Hint"],
					.print-content svg[aria-label="Info"],
					.print-content [aria-label="Hint"],
					.print-content [aria-label="Info"],
					.print-content [aria-label="Report"],
					.print-content [aria-label="Close"] {
						display: none !important;
					}
					
					/* Hide any modals or overlays */
					.print-content [class*="Modal"],
					.print-content [class*="modal"],
					.print-content [class*="overlay"],
					.print-content [class*="Overlay"] {
						display: none !important;
					}
					
					/* Ensure cipher displays are visible and properly formatted */
					/* Strong page break prevention for question cards */
					.print-content [class*="QuestionCard"],
					.print-content [data-question-card] {
						page-break-inside: avoid !important;
						break-inside: avoid !important;
						-webkit-region-break-inside: avoid !important;
						margin-bottom: 20px;
						orphans: 3 !important;
						widows: 3 !important;
					}
					
					/* Prevent page breaks within question card contents */
					.print-content [class*="QuestionCard"] > *,
					.print-content [data-question-card] > * {
						page-break-inside: avoid !important;
						break-inside: avoid !important;
					}
					
					/* Prevent breaking within replacement tables and other cipher components */
					.print-content .replacement-table-container,
					.print-content [class*="Display"],
					.print-content [class*="Cipher"] {
						page-break-inside: avoid !important;
						break-inside: avoid !important;
					}
					
					/* Prevent breaking within tables themselves */
					.print-content table {
						page-break-inside: avoid !important;
						break-inside: avoid !important;
					}
					
					/* Allow page breaks between questions only */
					.print-content [class*="QuestionCard"] + [class*="QuestionCard"],
					.print-content [data-question-card] + [data-question-card] {
						page-break-before: auto;
						break-before: auto;
					}
					
					/* Hide the label column (first column) in replacement tables */
					.print-content .replacement-table tr td:first-child,
					.print-content .replacement-table tbody tr td:first-child {
						display: none !important;
					}
					
					/* Reduce width of replacement table columns */
					.print-content .replacement-table td {
						min-width: 1.5rem !important;
						max-width: 1.75rem !important;
						width: 1.5rem !important;
						padding: 2px !important;
					}
					
					/* Ensure replacement table inputs fit the smaller columns */
					.print-content .replacement-table input[type="text"] {
						width: 100% !important;
						min-width: 0 !important;
						max-width: 100% !important;
						padding: 1px 2px !important;
						font-size: 10px !important;
					}
					
					/* Page setup */
					@page {
						margin: 0.5in;
						size: letter;
					}
					
					body {
						background: white !important;
					}
					
					/* Preserve original layout - don't override widths */
					.print-content * {
						box-sizing: border-box !important;
					}
					
					/* Ensure inputs are visible but maintain their original size from Tailwind classes */
					.print-content input[type="text"] {
						border: 1px solid #000 !important;
						background: white !important;
						text-align: center !important;
						/* Don't override width - let Tailwind classes handle it */
					}
					
					/* Preserve table structure - don't force widths */
					.print-content table {
						table-layout: auto !important;
					}
					
					/* Don't override table cell widths - preserve original */
					.print-content table td {
						/* Let original classes handle width */
					}
					
					/* Ensure replacement table maintains its natural sizing */
					.print-content .replacement-table {
						/* Preserve original width */
					}
					
					/* Don't force replacement table cell widths */
					.print-content .replacement-table td {
						/* Preserve min-width from classes but don't force width */
					}
					
					/* Ensure containers maintain their natural width */
					.print-content .replacement-table-wrapper {
						overflow: visible !important;
					}
					
					/* Prevent any layout shifts from print styles */
					.print-content [class*="TestContainer"] {
						max-width: 100% !important;
					}
				}
				
				@media screen {
					body {
						background: ${darkMode ? "#111827" : "#f9fafb"};
					}
					
					.print-content {
						padding: 20px;
					}
				}
			`}</style>

			<div className="print-content">
				{tournamentName && (
					<div className="tournament-name">{tournamentName}</div>
				)}
				<TestContainer darkMode={darkMode} maxWidth="6xl">
					<QuestionsList
						quotes={quotes}
						darkMode={darkMode}
						isTestSubmitted={false}
						activeHints={{}}
						getHintContent={() => ""}
						handleHintClick={noop}
						setSelectedCipherType={noop}
						setInfoModalOpen={noop}
						handleSolutionChange={noop}
						handleBaconianSolutionChange={noop}
						handleHillSolutionChange={noop}
						handleNihilistSolutionChange={noop}
						handleCheckerboardSolutionChange={noop}
						handleCryptarithmSolutionChange={noop}
						handleKeywordSolutionChange={noop}
						hintedLetters={{}}
						_hintCounts={{}}
					/>
				</TestContainer>
			</div>
		</div>
	);
}
