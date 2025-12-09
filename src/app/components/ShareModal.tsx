"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";

import api from "@/app/api";
import type { QuoteData as CodebustersQuoteData } from "@/app/codebusters/types";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaRegClipboard } from "react-icons/fa";
import { toast } from "react-toastify";

interface ShareModalProps {
	isOpen: boolean;
	onClose: () => void;
	inputCode: string;
	setInputCode: (code: string) => void;
	darkMode: boolean;
	timeLeft?: number | null;
	isTimeSynchronized?: boolean;
	syncTimestamp?: number | null;
	isCodebusters?: boolean;
	encryptedQuotes?: CodebustersQuoteData[];
}

interface QuestionWithId {
	id: string;
	[key: string]: unknown;
}

const ShareModal: React.FC<ShareModalProps> = React.memo(
	({
		isOpen,
		onClose,
		inputCode,
		setInputCode,
		darkMode,
		timeLeft,
		isCodebusters = false,
		encryptedQuotes = [],
	}) => {
		const [loadingGenerate, setLoadingGenerate] = useState(false);
		const [loadingLoad, setLoadingLoad] = useState(false);
		const [shareCode, setShareCode] = useState<string | null>(null);
		const [isGenerating, setIsGenerating] = useState(false);
		const [isOffline, setIsOffline] = useState(false);
		const hasGeneratedRef = useRef(false);
		const generationRequestId = useRef(0);
		const currentEncryptedQuotesRef = useRef<
			CodebustersQuoteData[] | undefined
		>(encryptedQuotes);
		const currentIsCodebustersRef = useRef(isCodebusters);
		const hasHandledRedirectRef = useRef(false);

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

		useEffect(() => {
			currentEncryptedQuotesRef.current = encryptedQuotes;
			currentIsCodebustersRef.current = isCodebusters;
		}, [encryptedQuotes, isCodebusters]);

		const generateShareCode = useCallback(async () => {
			if (isGenerating || hasGeneratedRef.current) {
				return;
			}

			const currentRequestId = ++generationRequestId.current;

			setIsGenerating(true);
			setLoadingGenerate(true);

			// Helper function to get time left from session for codebusters
			const getCodebustersTimeLeft = (): number | null => {
				const timeSession = JSON.parse(
					SyncLocalStorage.getItem("currentTestSession") || "{}",
				);
				return timeSession?.timeState?.timeLeft ?? null;
			};

			// Helper function to get time left from session for regular tests
			const getRegularTimeLeft = (): number | null => {
				try {
					const timeSession = JSON.parse(
						SyncLocalStorage.getItem("currentTestSession") || "{}",
					);
					if (
						timeSession?.timeState &&
						typeof timeSession.timeState.timeLeft === "number"
					) {
						return timeSession.timeState.timeLeft;
					}
				} catch {
					// Fall through to return timeLeft
				}
				return typeof timeLeft === "number" ? timeLeft : null;
			};

			// Helper function to get time left from session
			const getTimeLeftLocal = (isCodebustersMode: boolean): number | null => {
				if (isCodebustersMode) {
					return getCodebustersTimeLeft();
				}
				return getRegularTimeLeft();
			};

			// Helper function to handle share code response
			const handleShareCodeResponseLocal = async (
				requestId: number,
				shareCodeValue: string,
			): Promise<void> => {
				if (requestId === generationRequestId.current) {
					setShareCode(shareCodeValue);
					hasGeneratedRef.current = true;

					try {
						await navigator.clipboard.writeText(shareCodeValue);
						toast.success("Share code copied to clipboard!");
					} catch (error) {
						logger.error("Failed to copy share code to clipboard:", error);
					}
				}
			};

			// Helper function to generate codebusters share code
			const generateCodebustersShareCodeLocal = async (
				currentRequestIdLocal: number,
				currentTimeLeftLocal: number | null,
			): Promise<void> => {
				const currentEncryptedQuotes = currentEncryptedQuotesRef.current || [];
				if (currentEncryptedQuotes.length === 0) {
					toast.error("No quotes available to share");
					return;
				}

				const testParams = JSON.parse(
					SyncLocalStorage.getItem("testParams") || "{}",
				);
				const shareData = JSON.parse(
					SyncLocalStorage.getItem("codebustersShareData") || "{}",
				);

				const response = await fetch(api.codebustersShareGenerate, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						shareData: shareData,
						testParams: testParams,
						timeRemainingSeconds: currentTimeLeftLocal,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to generate share code");
				}

				const data = await response.json();
				await handleShareCodeResponseLocal(
					currentRequestIdLocal,
					data.data.shareCode,
				);
			};

			// Helper function to generate regular share code
			const generateRegularShareCodeLocal = async (
				currentRequestIdLocal: number,
				currentTimeLeftLocal: number | null,
			): Promise<void> => {
				const testQuestionsRaw = SyncLocalStorage.getItem("testQuestions");
				if (!testQuestionsRaw) {
					toast.error("No test questions found to share.");
					return;
				}
				const testParamsRaw = SyncLocalStorage.getItem("testParams");
				if (!testParamsRaw) {
					toast.error("No test parameters found.");
					return;
				}

				const questions = JSON.parse(testQuestionsRaw) as QuestionWithId[];
				const questionIds = questions.map((q) => q.id).filter((id) => id);

				if (questionIds.length === 0) {
					throw new Error("No valid question IDs found");
				}

				const idQuestionIds = questions
					.filter((q) => q.id && q.imageData)
					.map((q) => q.id);
				const testParams = JSON.parse(testParamsRaw);

				const response = await fetch(api.shareGenerate, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						questionIds,
						idQuestionIds,
						testParamsRaw: testParams,
						timeRemainingSeconds: currentTimeLeftLocal || null,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Failed to generate share code");
				}

				const data = await response.json();
				await handleShareCodeResponseLocal(
					currentRequestIdLocal,
					data.data.shareCode,
				);
			};

			try {
				const currentIsCodebusters = currentIsCodebustersRef.current;
				const currentTimeLeft = getTimeLeftLocal(currentIsCodebusters);

				if (currentIsCodebusters) {
					await generateCodebustersShareCodeLocal(
						currentRequestId,
						currentTimeLeft,
					);
				} else {
					await generateRegularShareCodeLocal(
						currentRequestId,
						currentTimeLeft,
					);
				}
			} catch (error) {
				logger.error("Error generating share code:", error);
				toast.error((error as Error).message);
			} finally {
				setIsGenerating(false);
				setLoadingGenerate(false);
			}
		}, [timeLeft, isGenerating]);

		const copyCodeToClipboard = async () => {
			try {
				await navigator.clipboard.writeText(shareCode || "");
				toast.success("Code copied to clipboard!");
			} catch {
				toast.error("Failed to copy code");
			}
		};

		const handleSharedTestRedirect = useCallback(async (code: string) => {
			try {
				const { handleShareCodeRedirect } = await import(
					"@/app/utils/shareCodeUtils"
				);
				await handleShareCodeRedirect(code);
			} catch (error) {
				logger.error("Error loading shared test:", error);
				toast.error((error as Error).message);
			}
		}, []);

		const loadSharedTest = async () => {
			if (!inputCode) {
				toast.error("Please enter a share code");
				return;
			}
			setLoadingLoad(true);
			try {
				const { handleShareCodeRedirect } = await import(
					"@/app/utils/shareCodeUtils"
				);
				await handleShareCodeRedirect(inputCode);
			} catch (error) {
				logger.error("Error loading shared test:", error);
				toast.error((error as Error).message);
			}
		};

		useEffect(() => {
			if (hasHandledRedirectRef.current) {
				return;
			}

			const shareCode = SyncLocalStorage.getItem("shareCode");
			if (shareCode) {
				hasHandledRedirectRef.current = true;

				handleSharedTestRedirect(shareCode);
				SyncLocalStorage.removeItem("shareCode");
			}
		}, [handleSharedTestRedirect]);

		useEffect(() => {
			if (!isOpen) {
				hasGeneratedRef.current = false;
				setShareCode(null);
				setIsGenerating(false);
				setLoadingGenerate(false);

				generationRequestId.current++;

				hasHandledRedirectRef.current = false;
			}
		}, [isOpen]);

		// Helper function to render loading state
		const renderLoadingState = () => (
			<div className="flex items-center gap-2">
				<div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
				<p>Generating...</p>
			</div>
		);

		// Helper function to render share code display
		const renderShareCodeDisplay = () => (
			<div
				className={`flex items-center justify-between p-2 rounded-md ${
					darkMode ? "bg-gray-700" : "bg-gray-100"
				}`}
			>
				<span className={`break-all ${darkMode ? "text-white" : "text-black"}`}>
					{shareCode}
				</span>
				<button type="button" onClick={copyCodeToClipboard} className="ml-2">
					<FaRegClipboard
						className={darkMode ? "text-gray-300" : "text-black"}
					/>
				</button>
			</div>
		);

		// Helper function to render generate button
		const renderGenerateButton = () => (
			<button
				type="button"
				onClick={generateShareCode}
				disabled={isGenerating || loadingGenerate || isOffline}
				className={`w-full px-4 py-2 rounded-md font-medium transition-colors border-2 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:border-gray-400 disabled:text-gray-400 ${
					darkMode ? "hover:bg-blue-900/20" : ""
				}`}
			>
				{isOffline ? "Share Not Available Offline" : "Generate Share Code"}
			</button>
		);

		// Helper function to render share code section
		const renderShareCodeSection = () => {
			if (isGenerating || loadingGenerate) {
				return renderLoadingState();
			}

			if (shareCode) {
				return renderShareCodeDisplay();
			}

			return renderGenerateButton();
		};

		// Helper function to render load shared test section
		const renderLoadSharedTestSection = () => (
			<div className="mb-4">
				<h4 className="font-semibold mb-2">Load Shared Test</h4>
				<input
					type="text"
					value={inputCode}
					onChange={(e) => setInputCode(e.target.value)}
					placeholder="Enter share code"
					className={`w-full p-2 border rounded-md mb-2 ${
						darkMode
							? "bg-gray-700 text-white border-gray-600"
							: "bg-white text-black border-gray-300"
					}`}
				/>
				<button
					type="button"
					onClick={loadSharedTest}
					disabled={loadingLoad || isOffline}
					className={`w-full px-4 py-2 rounded-md font-medium transition-colors border-2 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:border-gray-400 disabled:text-gray-400 ${
						darkMode ? "hover:bg-green-900/20" : ""
					}`}
				>
					{loadingLoad
						? "Loading..."
						: isOffline
							? "Load Not Available Offline"
							: "Load Shared Test"}
				</button>
			</div>
		);

		return (
			<div
				className="fixed inset-0 flex items-center justify-center z-[60]"
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.5)",
					display: isOpen ? "flex" : "none",
				}}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						onClose();
					}
				}}
				role="presentation"
				tabIndex={-1}
			>
				<div
					className={`relative rounded-lg p-6 w-96 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							onClose();
						}
						e.stopPropagation();
					}}
				>
					<button
						type="button"
						onClick={onClose}
						className={`absolute top-4 right-4 text-gray-500 hover:${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Close"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
					<h3 className="text-lg font-semibold mb-4">Share Test</h3>

					<div className="mb-4">
						<h4 className="font-semibold mb-2">Share Code</h4>
						{renderShareCodeSection()}
					</div>

					{renderLoadSharedTestSection()}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// but don't affect the share code generation logic

		const propsEqual =
			prevProps.isOpen === nextProps.isOpen &&
			prevProps.darkMode === nextProps.darkMode &&
			prevProps.inputCode === nextProps.inputCode &&
			prevProps.isCodebusters === nextProps.isCodebusters &&
			JSON.stringify(prevProps.encryptedQuotes) ===
				JSON.stringify(nextProps.encryptedQuotes);

		// Props changed, component will re-render
		if (!propsEqual) {
			// No action needed, React will handle re-render
		}

		return propsEqual;
	},
);

ShareModal.displayName = "ShareModal";

export default ShareModal;
