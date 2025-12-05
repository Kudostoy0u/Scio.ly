"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { FloatingActionButtons } from "@/app/components/FloatingActionButtons";
import MainHeader from "@/app/components/Header";
import ShareModal from "@/app/components/ShareModal";
import { pauseTestSession } from "@/app/utils/timeManagement";
import CipherInfoModal from "./CipherInfoModal";
import { loadQuestionsFromDatabase } from "./services/questionLoader";

// Import hooks
import { useAnswerChecking } from "./hooks/useAnswerChecking";
import { useAssignmentLoader } from "./hooks/useAssignmentLoader";
import { useCodebustersState } from "./hooks/useCodebustersState";
import { useHintSystem } from "./hooks/useHintSystem";
import { useProgressCalculation } from "./hooks/useProgressCalculation";
import { useQuestionGeneration } from "./hooks/useQuestionGeneration";
import { useSolutionHandlers } from "./hooks/useSolutionHandlers";
import { useTestReset } from "./hooks/useTestReset";
import { useTestSubmission } from "./hooks/useTestSubmission";
import { useTimerManagement } from "./hooks/useTimerManagement";

// Import components
import {
	ActionButtons,
	CodebustersSummary,
	EmptyState,
	Header,
	LoadingState,
	PDFModal,
	PrintConfigModal,
	QuestionsList,
	SubmitButton,
} from "./components";
import { createCodebustersPrintContent } from "./utils/print/content";
import {
	createCodebustersAnswerKey,
	formatCodebustersQuestionsForPrint,
} from "./utils/print/formatQuestions";
import { setupCodebustersPrintWindow } from "./utils/print/setupWindow";
import { createCodebustersPrintStyles } from "./utils/print/styles";

export default function CodeBusters() {
	const { darkMode } = useTheme();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isOffline, setIsOffline] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [printModalOpen, setPrintModalOpen] = useState(false);
	const [tournamentName, setTournamentName] = useState("");
	const [questionPoints, setQuestionPoints] = useState<{
		[key: number]: number;
	}>({});

	// Check for assignment parameter in URL
	const assignmentId = searchParams.get("assignment");

	// Detect offline status - extracted to reduce complexity
	useEffect(() => {
		const updateOnline = () => setIsOffline(!navigator.onLine);
		updateOnline();
		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOnline);
		return () => {
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOnline);
		};
	}, []);

	// Use custom hooks for state management
	const {
		quotes,
		setQuotes,
		isTestSubmitted,
		setIsTestSubmitted,
		setTestScore,
		timeLeft,
		setTimeLeft,
		isLoading,
		setIsLoading,
		error,
		setError,
		showPDFViewer,
		setShowPDFViewer,
		shareModalOpen,
		setShareModalOpen,
		inputCode,
		setInputCode,

		hasAttemptedLoad,
		activeHints,
		setActiveHints,
		revealedLetters,
		setRevealedLetters,
		hintedLetters,
		setHintedLetters,
		hintCounts,
		setHintCounts,
		infoModalOpen,
		setInfoModalOpen,
		selectedCipherType,
		setSelectedCipherType,
		loadPreferences,
	} = useCodebustersState(assignmentId);

	// Use custom hooks for functionality
	const {
		checkSubstitutionAnswer,
		checkHillAnswer,
		checkPortaAnswer,
		checkBaconianAnswer,
		checkCheckerboardAnswer,
	} = useAnswerChecking(quotes);
	const { getHintContent, handleHintClick } = useHintSystem(
		quotes,
		activeHints,
		setActiveHints,
		revealedLetters,
		setRevealedLetters,
		setQuotes,
		hintedLetters,
		setHintedLetters,
		hintCounts,
		setHintCounts,
	);
	const {
		handleSolutionChange,
		handleBaconianSolutionChange,
		handleHillSolutionChange,
		handleNihilistSolutionChange,
		handleCheckerboardSolutionChange,
		handleKeywordSolutionChange,
		handleCryptarithmSolutionChange,
	} = useSolutionHandlers(quotes, setQuotes);
	const { totalProgress, calculateQuoteProgress } =
		useProgressCalculation(quotes);

	// Handle quote reporting
	const handleReportQuote = useCallback(
		async (quoteIndex: number) => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return;
			}

			try {
				const response = await fetch("/api/quotes/report", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						quote: {
							id: quote.id,
							quote: quote.quote,
							author: quote.author,
							language: quote.language,
						},
						cipherType: quote.cipherType,
					}),
				});

				const data = await response.json();

				if (response.ok) {
					if (data.data?.action === "removed") {
						// Remove the quote from the quotes array
						setQuotes((prevQuotes) =>
							prevQuotes.filter((_, index) => index !== quoteIndex),
						);
						toast.success(`Quote removed: ${data.data.reason}`);
					} else if (data.data?.action === "edited" && data.data.editedQuote) {
						// Update the quote in the quotes array
						setQuotes((prevQuotes) => {
							const updatedQuotes = [...prevQuotes];
							if (updatedQuotes[quoteIndex]) {
								updatedQuotes[quoteIndex] = {
									...updatedQuotes[quoteIndex],
									quote:
										data.data.editedQuote.quote ||
										updatedQuotes[quoteIndex].quote,
									author:
										data.data.editedQuote.author ||
										updatedQuotes[quoteIndex].author,
									language:
										data.data.editedQuote.language ||
										updatedQuotes[quoteIndex].language,
								};
							}
							return updatedQuotes;
						});
						toast.info(`Quote has been edited: ${data.data.reason}`);
					} else {
						toast.info(`Quote is appropriate: ${data.data.reason}`);
					}
				} else {
					toast.error(
						`Failed to report quote: ${data.message || "Unknown error"}`,
					);
				}
			} catch (error) {
				logger.error("Error reporting quote:", error);
				toast.error("Failed to report quote. Please try again.");
			}
		},
		[quotes, setQuotes],
	);

	// Use test submission hook
	const { handleSubmitTest } = useTestSubmission({
		quotes,
		setTestScore,
		setIsTestSubmitted,
		checkSubstitutionAnswer,
		checkHillAnswer,
		checkPortaAnswer,
		checkBaconianAnswer,
		checkCheckerboardAnswer,
		calculateQuoteProgress,
		assignmentId,
	});

	// Use timer management hook
	useTimerManagement({
		timeLeft,
		setTimeLeft,
		isTestSubmitted,
		onTimeExpired: handleSubmitTest,
	});

	// Use question generation hook
	const { generateCodebustersQuestionsFromParams } = useQuestionGeneration();

	// Use assignment loader hook
	const { handleLoadAssignmentQuestions } = useAssignmentLoader({
		setQuotes,
		setTimeLeft,
		setIsLoading,
		setError,
		generateCodebustersQuestionsFromParams,
	});

	// Use test reset hook
	const { handleReset } = useTestReset({
		setIsResetting,
		setIsTestSubmitted,
		setTestScore,
		setTimeLeft,
		setActiveHints,
		setRevealedLetters,
		setHintedLetters,
		setHintCounts,
		setQuotes,
		setIsLoading,
		setError,
		loadPreferences,
	});

	// Handle loading questions from database
	const handleLoadQuestions = useCallback(async () => {
		await loadQuestionsFromDatabase(
			setIsLoading,
			setError,
			setQuotes,
			setTimeLeft,
			setIsTestSubmitted,
			setTestScore,
			loadPreferences,
		);
	}, [
		setIsLoading,
		setError,
		setQuotes,
		setTimeLeft,
		setIsTestSubmitted,
		setTestScore,
		loadPreferences,
	]);

	// Handle back navigation: preserve Codebusters progress for resume banner on Practice
	const handleBack = useCallback(() => {
		try {
			// Ensure timer is paused when exiting
			pauseTestSession();
			// Only clear unrelated unlimited cache; keep Codebusters keys and testParams so Practice can detect progress
			SyncLocalStorage.removeItem("unlimitedQuestions");
		} catch {
			// Ignore errors when clearing cache
		}
		router.push("/practice");
	}, [router]);

	// Handle retry loading
	const handleRetry = useCallback(() => {
		setError(null);
		setIsLoading(true);
		handleLoadQuestions();
	}, [setError, setIsLoading, handleLoadQuestions]);

	// Handle navigation to practice page
	const handleGoToPractice = useCallback(() => {
		router.push("/practice");
	}, [router]);

	// Handle print configuration
	const handlePrintConfig = () => {
		setPrintModalOpen(true);
	};

	// Extract print content creation to reduce complexity
	const createPrintContent = useCallback(() => {
		const getStylesheets = () => "";
		const printStyles = createCodebustersPrintStyles(getStylesheets);
		const questionsHtml =
			formatCodebustersQuestionsForPrint(quotes, questionPoints) +
			createCodebustersAnswerKey(quotes);
		return createCodebustersPrintContent(
			{
				tournamentName,
				questionsHtml,
				questionPoints,
			},
			printStyles,
		);
	}, [quotes, questionPoints, tournamentName]);

	// Handle actual printing
	const handleActualPrint = useCallback(async () => {
		if (!tournamentName.trim()) {
			toast.error("Tournament name is required");
			return;
		}
		try {
			const printContent = createPrintContent();
			await setupCodebustersPrintWindow(printContent);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to print test");
		}
		setPrintModalOpen(false);
	}, [tournamentName, createPrintContent]);

	// Handle test reset after submission
	const handleTestReset = useCallback(() => {
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}, 200);
		handleReset();
	}, [handleReset]);

	// Load questions if needed
	useEffect(() => {
		if (hasAttemptedLoad && quotes.length === 0 && !isLoading && !error) {
			if (assignmentId) {
				handleLoadAssignmentQuestions(assignmentId);
			} else {
				handleLoadQuestions();
			}
		}
	}, [
		hasAttemptedLoad,
		quotes.length,
		isLoading,
		error,
		handleLoadQuestions,
		handleLoadAssignmentQuestions,
		assignmentId,
	]);

	return (
		<>
			<MainHeader />
			<div className="relative min-h-screen">
				{/* Background */}
				<div
					className={`absolute inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
				/>

				{/* Global scrollbar theme is centralized in globals.css */}

				{/* Page Content */}
				<div className="relative flex flex-col items-center p-3 md:p-6 pt-24 md:pt-24">
					<Header
						darkMode={darkMode}
						timeLeft={timeLeft}
						isTestSubmitted={isTestSubmitted}
					/>

					{/* Inline back link to Practice */}
					<div className="w-full max-w-[90vw] md:max-w-6xl mt-0 mb-3">
						<button
							type="button"
							onClick={handleBack}
							className={`group inline-flex items-center text-base font-medium ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
						>
							<span className="transition-transform duration-200 group-hover:-translate-x-1">
								←
							</span>
							<span className="ml-2">Go back</span>
						</button>
					</div>

					{/* Progress Bar or Summary */}
					{isTestSubmitted ? (
						<div className="w-full">
							<CodebustersSummary
								quotes={quotes}
								darkMode={darkMode}
								hintedLetters={hintedLetters}
								_hintCounts={hintCounts}
							/>
						</div>
					) : (
						<div
							className={
								"sticky top-4 z-10 w-full max-w-[90vw] md:max-w-6xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg"
							}
						>
							<div
								className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
								style={{ width: `${totalProgress}%` }}
							/>
						</div>
					)}

					<main
						className={`w-full max-w-[90vw] md:max-w-6xl rounded-lg shadow-md p-3 md:p-6 mt-4 ${
							darkMode ? "bg-gray-800" : "bg-white"
						}`}
					>
						<LoadingState
							isLoading={isLoading && !isResetting}
							error={error}
							darkMode={darkMode}
							onRetry={handleRetry}
							onGoToPractice={handleGoToPractice}
						/>

						<EmptyState
							darkMode={darkMode}
							hasAttemptedLoad={hasAttemptedLoad}
							isLoading={isLoading && !isResetting}
							error={error}
							quotes={quotes}
						/>

						{/* Action buttons - positioned right above questions */}
						{!(isLoading || error) && quotes.length > 0 && hasAttemptedLoad && (
							<ActionButtons
								darkMode={darkMode}
								isOffline={isOffline}
								quotesLength={quotes.length}
								onReset={handleReset}
								onPrint={handlePrintConfig}
								onShare={() => setShareModalOpen(true)}
							/>
						)}

						{!(isLoading || error) && hasAttemptedLoad && quotes.length > 0 && (
							<QuestionsList
								quotes={quotes}
								darkMode={darkMode}
								isTestSubmitted={isTestSubmitted}
								activeHints={activeHints}
								getHintContent={getHintContent}
								handleHintClick={handleHintClick}
								setSelectedCipherType={setSelectedCipherType}
								setInfoModalOpen={setInfoModalOpen}
								handleSolutionChange={handleSolutionChange}
								handleBaconianSolutionChange={handleBaconianSolutionChange}
								handleHillSolutionChange={handleHillSolutionChange}
								handleNihilistSolutionChange={handleNihilistSolutionChange}
								handleCheckerboardSolutionChange={
									handleCheckerboardSolutionChange
								}
								handleCryptarithmSolutionChange={
									handleCryptarithmSolutionChange
								}
								handleKeywordSolutionChange={handleKeywordSolutionChange}
								handleReportQuote={handleReportQuote}
								hintedLetters={hintedLetters}
								_hintCounts={hintCounts}
							/>
						)}

						{/* Submit Button */}
						{!(isLoading || error) &&
							quotes.length > 0 &&
							hasAttemptedLoad &&
							!isResetting && (
								<SubmitButton
									isTestSubmitted={isTestSubmitted}
									darkMode={darkMode}
									onSubmit={handleSubmitTest}
									onReset={handleTestReset}
									onGoBack={handleGoToPractice}
									isAssignment={!!assignmentId}
								/>
							)}
					</main>

					{/* Floating Action Buttons */}
					<FloatingActionButtons
						darkMode={darkMode}
						showReferenceButton={true}
						onShowReference={() => setShowPDFViewer(true)}
						eventName="Codebusters"
					/>

					{/* Custom PDF Modal */}
					<PDFModal
						showPDFViewer={showPDFViewer}
						darkMode={darkMode}
						onClose={() => setShowPDFViewer(false)}
					/>

					{/* Share Modal */}
					<ShareModal
						isOpen={shareModalOpen}
						onClose={() => setShareModalOpen(false)}
						inputCode={inputCode}
						setInputCode={setInputCode}
						darkMode={darkMode}
						isCodebusters={true}
						encryptedQuotes={quotes}
					/>

					{/* Cipher Info Modal */}
					<CipherInfoModal
						isOpen={infoModalOpen}
						onClose={() => setInfoModalOpen(false)}
						cipherType={selectedCipherType}
						darkMode={darkMode}
					/>

					{/* Print Configuration Modal */}
					<PrintConfigModal
						isOpen={printModalOpen}
						onClose={() => setPrintModalOpen(false)}
						onPrint={handleActualPrint}
						quotes={quotes}
						tournamentName={tournamentName}
						setTournamentName={setTournamentName}
						questionPoints={questionPoints}
						setQuestionPoints={setQuestionPoints}
						darkMode={darkMode}
					/>
				</div>
			</div>

			{/* Global ToastContainer handles notifications */}
		</>
	);
}
