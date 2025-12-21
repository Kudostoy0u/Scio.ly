"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaShareAlt } from "react-icons/fa";

import EditQuestionModal from "@/app/components/EditQuestionModal";
import { FloatingActionButtons } from "@/app/components/FloatingActionButtons";
import Header from "@/app/components/Header";
import ShareModal from "@/app/components/ShareModal";
import TestContainer from "@/app/components/TestContainer";
import { useTheme } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";
import { default as FloatingTimer } from "./components/FloatingTimer";
import { default as ProgressBar } from "./components/ProgressBar";
import { default as TestFooter } from "./components/TestFooter";
import { default as TestHeader } from "./components/TestHeader";
import { default as TestLayout } from "./components/TestLayout";
import TestMainContent from "./components/TestMainContent";
import { TestPrintConfigModal } from "./components/TestPrintConfigModal";
import { default as TestSummary } from "./components/TestSummary";
import { useTestState } from "./hooks/useTestState";
import { createTestPrintContent } from "./utils/print/content";
import { setupTestPrintWindow } from "./utils/print/setupWindow";
import { createTestPrintStyles } from "./utils/print/styles";

import type { Question } from "@/app/utils/geminiService";
import type { RouterParams } from "@/app/utils/questionUtils";

// Helper functions for printing
const formatQuestionsForPrint = (
	data: Question[],
	questionPoints: Record<number, number>,
) => {
	let questionsHtml = "";

	for (const [index, question] of data.entries()) {
		const points =
			questionPoints[index] ||
			(question.options && question.options.length > 0 ? 2 : 5);

		questionsHtml += `<div class="question">`;

		questionsHtml += `<div class="question-header">${index + 1}. ${question.question} [${points} pts]</div>`;

		if (question.imageUrl || question.imageData) {
			questionsHtml += `<div class="question-image">
        <img src="${question.imageData || question.imageUrl}" alt="Question Image" />
      </div>`;
		}

		if (question.options && question.options.length > 0) {
			questionsHtml += `<div class="question-options">`;
			for (const [optionIndex, option] of question.options.entries()) {
				const letter = String.fromCharCode(97 + optionIndex); // a, b, c, d...
				questionsHtml += `<div class="option">${letter}. ${option}</div>`;
			}
			questionsHtml += "</div>";
		} else {
			questionsHtml += `<div class="answer-space">
        <div class="answer-line">Answer: _________________________________________________</div>
        <div class="answer-line">_______________________________________________________</div>
        <div class="answer-line">_______________________________________________________</div>
      </div>`;
		}

		questionsHtml += "</div>";
	}

	return questionsHtml;
};

const createAnswerKey = (data: Question[]) => {
	let answerKeyHtml = '<div class="answer-key-section">';
	answerKeyHtml += '<div class="answer-key-header">ANSWER KEY</div>';
	answerKeyHtml += '<div class="answer-key-content">';

	const totalQuestions = data.length;
	const columns = Math.min(5, Math.ceil(totalQuestions / 20)); // 20 questions per column max
	const questionsPerColumn = Math.ceil(totalQuestions / columns);

	for (let col = 0; col < columns; col++) {
		answerKeyHtml += '<div class="answer-column">';

		for (
			let i = col * questionsPerColumn;
			i < Math.min((col + 1) * questionsPerColumn, totalQuestions);
			i++
		) {
			const question = data[i];
			if (question?.answers && question.answers.length > 0) {
				answerKeyHtml += `<div class="answer-item">${i + 1}. ${question.answers.join(", ")}</div>`;
			}
		}

		answerKeyHtml += "</div>";
	}

	answerKeyHtml += "</div>";
	answerKeyHtml += "</div>";

	return answerKeyHtml;
};

export default function TestContent({
	initialData,
	initialRouterData,
}: { initialData?: Question[]; initialRouterData?: RouterParams }) {
	const isClient = typeof window !== "undefined";
	const search = isClient ? new URLSearchParams(window.location.search) : null;
	const isPreview = !!(search && search.get("preview") === "1");
	const previewScope = search?.get("scope") || "all";
	const previewTeam = search?.get("team") || "A";
	const previewSchool = search?.get("school") || null;
	const previewDivision = search?.get("division") || null;
	const { darkMode } = useTheme();
	const [isOffline, setIsOffline] = useState(false);
	const [printModalOpen, setPrintModalOpen] = useState(false);
	const [tournamentName, setTournamentName] = useState("");
	const [questionPoints, setQuestionPoints] = useState<{
		[key: number]: number;
	}>({});

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

	const {
		isLoading,
		data,
		routerData,
		userAnswers,
		isSubmitted,
		fetchError,
		timeLeft,
		explanations,
		loadingExplanation,
		gradingResults,
		gradingFRQs,
		isMounted,
		shareModalOpen,
		inputCode,
		submittedReports,
		submittedEdits,
		isEditModalOpen,
		editingQuestion,
		isResetting,

		handleAnswerChange,
		handleSubmit,
		handleResetTest,
		handleGetExplanation,
		handleBookmarkChange,
		handleReportSubmitted,
		handleEditSubmitted,
		handleQuestionRemoved,
		handleEditOpen,
		handleEditSubmit,
		closeShareModal,
		handleBackToMain,
		isQuestionBookmarked,
		setShareModalOpen,
		setInputCode,
		setIsEditModalOpen,
	} = useTestState({
		initialData,
		initialRouterData: initialRouterData as Record<string, unknown> | undefined,
	});

	const previewToastsShownRef = useRef(false);
	useEffect(() => {
		if (!isPreview) {
			return;
		}
		if (previewToastsShownRef.current) {
			return;
		}
		previewToastsShownRef.current = true; // prevent StrictMode double effect
		try {
			toast.info("Tip: Use the delete icon on a question to replace it.", {
				autoClose: 6000,
			});
			setTimeout(() => {
				toast.info(
					"When finished, click “Send Test” at the bottom to assign.",
					{
						autoClose: 6000,
					},
				);
			}, 1200);
		} catch {
			// Ignore timeout errors
		}
	}, [isPreview]);

	const handlePrintConfig = () => {
		setPrintModalOpen(true);
	};

	const handleActualPrint = async () => {
		if (!tournamentName.trim()) {
			toast.error("Tournament name is required");
			return;
		}

		const getStylesheets = () => {
			return "";
		};

		const printStyles = createTestPrintStyles(getStylesheets);

		const printContent = createTestPrintContent(
			{
				tournamentName,
				questionsHtml:
					formatQuestionsForPrint(data, questionPoints) + createAnswerKey(data),
				questionPoints,
			},
			printStyles,
		);

		try {
			await setupTestPrintWindow(printContent);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to print test");
		}

		setPrintModalOpen(false);
	};

	if (!isMounted) {
		return null;
	}

	const isFromBookmarks =
		SyncLocalStorage.getItem("testFromBookmarks") === "true";

	return (
		<>
			<Header />
			<FloatingTimer
				timeLeft={timeLeft}
				darkMode={darkMode}
				isSubmitted={isSubmitted}
			/>
			<TestLayout darkMode={darkMode}>
				<div className="pt-20">
					<TestHeader
						eventName={routerData.eventName || "Loading..."}
						timeLeft={timeLeft}
						darkMode={darkMode}
						isFromBookmarks={isFromBookmarks}
						isSubmitted={isSubmitted}
					/>

					{/* Inline back link to Practice */}
					<div className="w-full max-w-3xl mt-0.5 mb-5 px-3 md:px-0">
						<button
							type="button"
							onClick={handleBackToMain}
							className={`group inline-flex items-center text-base font-medium ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
						>
							<span className="transition-transform duration-200 group-hover:-translate-x-1">
								←
							</span>
							<span className="ml-2">Go back</span>
						</button>
					</div>

					{isSubmitted ? (
						isPreview ? null : (
							<TestSummary
								data={data}
								userAnswers={userAnswers}
								gradingResults={gradingResults}
								darkMode={darkMode}
								isAssignmentMode={!!routerData.assignmentMode}
							/>
						)
					) : (
						<div className="px-3 md:px-0">
							<ProgressBar
								answeredCount={Object.keys(userAnswers).length}
								totalCount={data.length}
								isSubmitted={isSubmitted}
								darkMode={darkMode}
							/>
						</div>
					)}

					<TestContainer darkMode={darkMode} maxWidth="3xl">
						<div className="flex justify-between items-center mb-4 pt-1">
							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={handleResetTest}
									title="Reset Test"
									className={`flex items-center transition-all duration-200 ${
										darkMode
											? "text-gray-400 hover:text-gray-300"
											: "text-gray-500 hover:text-gray-700"
									}`}
								>
									<RefreshCcw className="w-4 h-4 mr-2" />
									<span className="text-sm">Reset</span>
								</button>

								<button
									type="button"
									onClick={handlePrintConfig}
									disabled={isOffline || data.length === 0}
									title={
										isOffline
											? "Print feature not available offline"
											: "Print Test"
									}
									className={`flex items-center transition-all duration-200 ${
										isOffline || data.length === 0
											? "text-gray-400 cursor-not-allowed"
											: darkMode
												? "text-gray-400 hover:text-gray-300"
												: "text-gray-500 hover:text-gray-700"
									}`}
								>
									<svg
										className="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Print test</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
										/>
									</svg>
									<span className="text-sm">Print</span>
								</button>
							</div>

							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={() => setShareModalOpen(true)}
									disabled={isOffline}
									title={
										isOffline
											? "Share feature not available offline"
											: "Share Test"
									}
								>
									<div
										className={`flex items-center transition-all duration-200 ${
											isOffline
												? "text-gray-400 cursor-not-allowed"
												: "text-blue-400 hover:text-blue-500"
										}`}
									>
										<FaShareAlt className="transition-all duration-500 mr-2" />
										<span className="text-sm">Take together</span>
									</div>
								</button>
							</div>
						</div>

						<div className="container mx-auto px-4 mt-3">
							<TestMainContent
								isLoading={isLoading}
								isResetting={isResetting}
								fetchError={fetchError}
								routerData={routerData}
								darkMode={darkMode}
								data={data}
								userAnswers={userAnswers}
								isSubmitted={isSubmitted}
								gradingResults={gradingResults}
								explanations={explanations}
								loadingExplanation={loadingExplanation}
								submittedReports={submittedReports}
								submittedEdits={submittedEdits}
								gradingFRQs={gradingFRQs}
								handleAnswerChange={handleAnswerChange}
								handleBookmarkChange={handleBookmarkChange}
								handleReportSubmitted={handleReportSubmitted}
								handleEditSubmitted={handleEditSubmitted}
								handleEditOpen={handleEditOpen}
								handleQuestionRemoved={handleQuestionRemoved}
								handleGetExplanation={handleGetExplanation}
								isOffline={isOffline}
								isPreview={isPreview}
								isQuestionBookmarked={isQuestionBookmarked}
							/>
						</div>

						{!(
							isLoading ||
							fetchError ||
							(routerData.eventName === "Codebusters" &&
								routerData.types === "multiple-choice")
						) &&
							data.length > 0 &&
							(isPreview ? (
								<div className="mt-6 flex items-center gap-3">
									<button
										type="button"
										onClick={handleBackToMain}
										className={`w-1/5 px-4 py-2 font-semibold rounded-lg border-2 transition-colors flex items-center justify-center text-center ${
											darkMode
												? "bg-transparent text-yellow-300 border-yellow-400 hover:text-yellow-200 hover:border-yellow-300"
												: "bg-transparent text-yellow-600 border-yellow-500 hover:text-yellow-500 hover:border-yellow-400"
										}`}
									>
										Back
									</button>
									<button
										type="button"
										onClick={async () => {
											try {
												const selectionStr =
													SyncLocalStorage.getItem("teamsSelection");
												const sel = selectionStr
													? JSON.parse(selectionStr)
													: null;
												const school = previewSchool || sel?.school;
												const divisionSel = previewDivision || sel?.division;
												if (!(school && divisionSel)) {
													toast.error("Missing team selection");
													return;
												}
												toast.info("Sending test...");
												const params = JSON.parse(
													SyncLocalStorage.getItem("testParams") || "{}",
												);
												const assignees =
													previewScope === "all"
														? [{ name: "ALL" }]
														: [{ name: previewScope }];
												const res = await fetch("/api/assignments", {
													method: "POST",
													headers: { "Content-Type": "application/json" },
													body: JSON.stringify({
														school,
														division: divisionSel,
														teamId: previewTeam,
														eventName: routerData.eventName,
														assignees,
														params,
														questions: data,
													}),
												});
												if (res.ok) {
													// const json = await res.json(); // DISABLED: Assignment notifications removed
													// const assignmentId = json?.data?.id; // DISABLED: Assignment notifications removed
													// ASSIGNMENT NOTIFICATIONS DISABLED - Users should use assignments tab instead
													// TODO: Re-enable if needed in the future
													/*
                          try {
                            const mres = await fetch(`/api/teams/units?school=${encodeURIComponent(school)}&division=${divisionSel}&teamId=${previewTeam}&members=1`);
                            const mj = mres.ok ? await mres.json() : null;
                            const members = Array.isArray(mj?.data) ? mj.data : [];
                            const targets = previewScope === 'all' ? members : members.filter((m:any)=>{
                              const full = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
                              const label = full || m.displayName || m.username || '';
                              return label === previewScope;
                            });
                            await Promise.all(targets.filter((m:any)=>m.userId).map((m:any)=>
                              fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action:'create', userId: m.userId, type: 'assignment', title: `New ${routerData.eventName} test assigned`, data: { assignmentId, eventName: routerData.eventName, url: `/assign/${assignmentId}` } }) })
                            ));
                          } catch {
                            // Ignore notification errors
                          }
                          */
													const recipientsLabel =
														previewScope === "all"
															? "all members"
															: previewScope;
													toast.success(`Test sent to ${recipientsLabel}!`);
													const qp = new URLSearchParams({
														school,
														division: divisionSel,
													});
													setTimeout(() => {
														window.location.href = `/teams/results?${qp.toString()}`;
													}, 600);
												}
											} catch {
												// Ignore assignment creation errors
											}
										}}
										className={`w-4/5 px-4 py-2 font-semibold rounded-lg border-2 flex items-center justify-center text-center ${
											darkMode
												? "bg-transparent text-blue-300 border-blue-300 hover:text-blue-200 hover:border-blue-200"
												: "bg-transparent text-blue-700 border-blue-700 hover:text-blue-600 hover:border-blue-600"
										}`}
									>
										Send Test
									</button>
								</div>
							) : (
								<TestFooter
									isSubmitted={isSubmitted}
									darkMode={darkMode}
									onSubmit={handleSubmit}
									onReset={handleResetTest}
									onBackToMain={handleBackToMain}
									isAssignment={!!routerData.assignmentId}
									isViewResults={routerData.viewResults === "true"}
								/>
							))}
					</TestContainer>
				</div>
			</TestLayout>

			<ShareModal
				isOpen={shareModalOpen}
				onClose={closeShareModal}
				inputCode={inputCode}
				setInputCode={setInputCode}
				darkMode={darkMode}
			/>

			{editingQuestion && (
				<EditQuestionModal
					isOpen={isEditModalOpen}
					onClose={() => setIsEditModalOpen(false)}
					onSubmit={handleEditSubmit}
					darkMode={darkMode}
					question={editingQuestion}
					eventName={routerData.eventName || "Unknown Event"}
					canEditAnswers={isSubmitted}
				/>
			)}

			{/* Test Print Configuration Modal */}
			<TestPrintConfigModal
				isOpen={printModalOpen}
				onClose={() => setPrintModalOpen(false)}
				onPrint={handleActualPrint}
				questions={data}
				tournamentName={tournamentName}
				setTournamentName={setTournamentName}
				questionPoints={questionPoints}
				setQuestionPoints={setQuestionPoints}
				darkMode={darkMode}
			/>

			{/* Floating Action Buttons */}
			<FloatingActionButtons
				darkMode={darkMode}
				showReferenceButton={routerData.eventName === "Codebusters"}
				onShowReference={() => {
					window.open("/2024_Div_C_Resource.pdf", "_blank");
				}}
				eventName={routerData.eventName}
				hidden={isEditModalOpen}
			/>

			{/* Global ToastContainer handles notifications */}
		</>
	);
}
