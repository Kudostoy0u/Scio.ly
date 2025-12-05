"use client";
import type { Question } from "@/app/utils/geminiService";
import {
	type Explanations,
	type GradingResults,
	type LoadingExplanation,
	type RouterParams,
	getExplanation,
} from "@/app/utils/questionUtils";
import {
	getCurrentTestSession,
	resetTestSession,
	resumeTestSession,
} from "@/app/utils/timeManagement";
import logger from "@/lib/utils/logger";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { loadAssignment, loadViewResultsData } from "../utils/assignmentLoader";
import {
	handleEditSubmit as handleEditSubmitUtil,
	handleQuestionRemoved as handleQuestionRemovedUtil,
} from "../utils/questionHandlers";
import { handleTestSubmission } from "../utils/testSubmission";
import { useTestAnswers } from "./useTestAnswers";
import { useTestBookmarks } from "./useTestBookmarks";
import { useTestEdit } from "./useTestEdit";
import { useTestGrading } from "./useTestGrading";
import { useTestTimer } from "./useTestTimer";
import { fetchQuestionsForParams } from "./utils/fetchQuestions";
import { initLoad } from "./utils/initLoad";
import { normalizeQuestionsFull } from "./utils/normalize";
import { buildPreviewAutofill } from "./utils/preview";
import { resolveRouterParams } from "./utils/ssr";
import {
	useCountdown,
	usePauseOnUnmount,
	useResumeOnMount,
	useSetupVisibility,
} from "./utils/timeHooks";

/**
 * Test state management hook for Science Olympiad practice tests
 * Provides comprehensive state management for test sessions including questions, answers, timing, and grading
 *
 * @param {Object} params - Hook parameters
 * @param {any[]} [params.initialData] - Initial question data for SSR
 * @param {any} [params.initialRouterData] - Initial router parameters for SSR
 * @returns {Object} Test state and control functions
 * @example
 * ```typescript
 * const {
 *   data: questions,
 *   userAnswers,
 *   isSubmitted,
 *   submitTest,
 *   updateAnswer
 * } = useTestState({
 *   initialData: serverQuestions,
 *   initialRouterData: routerParams
 * });
 * ```
 */
export function useTestState({
	initialData,
	initialRouterData,
}: {
	initialData?: unknown[];
	initialRouterData?: Record<string, unknown>;
} = {}) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const fetchStartedRef = useRef(false);
	const fetchCompletedRef = useRef(false);
	const [data, setData] = useState<Question[]>(
		Array.isArray(initialData) ? (initialData as Question[]) : [],
	);

	// Debug data state changes
	useEffect(() => {
		if (data.length > 0) {
			// Debug logging can go here if needed
		}
	}, [data]);

	const [routerData, setRouterData] = useState<RouterParams>(
		initialRouterData || {},
	);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [explanations, setExplanations] = useState<Explanations>({});
	const [loadingExplanation, setLoadingExplanation] =
		useState<LoadingExplanation>({});
	const [lastCallTime, setLastCallTime] = useState<number>(0);
	const rateLimitDelay = 2000;
	const [isMounted, setIsMounted] = useState(false);
	const ssrAppliedRef = useRef(false);
	const mountLoggedRef = useRef(false);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [inputCode, setInputCode] = useState<string>("");
	const [isResetting, setIsResetting] = useState(false);
	const isClient = typeof window !== "undefined";
	const previewSearch = isClient
		? new URLSearchParams(window.location.search)
		: null;
	const isPreviewMode = !!(
		previewSearch && previewSearch.get("preview") === "1"
	);

	const stableRouterData = useMemo(
		() => initialRouterData || {},
		[initialRouterData],
	);

	// Use extracted hooks
	const { userAnswers, setUserAnswers, handleAnswerChange } = useTestAnswers({
		routerData,
	});
	const { handleBookmarkChange, isQuestionBookmarked } = useTestBookmarks();
	const {
		submittedReports,
		submittedEdits,
		isEditModalOpen,
		editingQuestion,
		handleReportSubmitted,
		handleEditSubmitted,
		handleEditOpen,
		handleBackToMain,
		setIsEditModalOpen,
		setSubmittedReports,
		setSubmittedEdits,
	} = useTestEdit();
	const { timeLeft, setTimeLeft } = useTestTimer({
		routerData,
		isSubmitted,
		onTimeUp: () => handleSubmit(),
	});
	const { gradingResults, setGradingResults, gradingFRQs, setGradingFrQs } =
		useTestGrading(data, userAnswers, isSubmitted, routerData);

	// Helper function to clear assignment data
	const clearAssignmentData = useCallback(
		(currentAssignmentId: string | null, newAssignmentId: string) => {
			localStorage.removeItem("testQuestions");
			localStorage.removeItem("testUserAnswers");
			localStorage.removeItem("testGradingResults");
			localStorage.removeItem("testParams");

			if (currentAssignmentId) {
				const oldAssignmentKey = `assignment_${currentAssignmentId}`;
				localStorage.removeItem(`${oldAssignmentKey}_questions`);
				localStorage.removeItem(`${oldAssignmentKey}_answers`);
				localStorage.removeItem(`${oldAssignmentKey}_grading`);
				localStorage.removeItem(`${oldAssignmentKey}_session`);
			}

			localStorage.setItem("currentAssignmentId", String(newAssignmentId));
		},
		[],
	);

	// Helper function to restore stored answers and grades
	const restoreStoredAnswersAndGrades = useCallback(
		(
			routerData: RouterParams,
			setUserAnswers: (
				answers: Record<number, (string | null)[] | null>,
			) => void,
			setGradingResults: (results: GradingResults) => void,
			setIsSubmitted: (submitted: boolean) => void,
		) => {
			try {
				const session = getCurrentTestSession();
				if (session) {
					setIsSubmitted(session.isSubmitted);
				}
				const isAssignmentMode = !!(
					routerData.assignmentId ||
					routerData.teamsAssign === "1" ||
					routerData.teamsAssign === 1
				);
				const answersKey =
					isAssignmentMode && routerData.assignmentId
						? `assignment_${routerData.assignmentId}_answers`
						: "testUserAnswers";
				const gradesKey =
					isAssignmentMode && routerData.assignmentId
						? `assignment_${routerData.assignmentId}_grading`
						: "testGradingResults";

				const storedAnswers = localStorage.getItem(answersKey);
				if (storedAnswers) {
					try {
						const parsed = JSON.parse(storedAnswers);
						setUserAnswers(parsed);
					} catch {
						// Ignore errors
					}
				}
				const storedGrades = localStorage.getItem(gradesKey);
				if (storedGrades) {
					try {
						setGradingResults(JSON.parse(storedGrades));
					} catch {
						// Ignore errors
					}
				}
			} catch {
				// Ignore errors
			}
		},
		[],
	);

	// Helper function to handle localStorage restoration
	const handleLocalStorageRestore = useCallback(
		(
			stableRouterData: Record<string, unknown>,
			routerData: RouterParams,
			setData: (data: Question[]) => void,
			setUserAnswers: (
				answers: Record<number, (string | null)[] | null>,
			) => void,
			setGradingResults: (results: GradingResults) => void,
			setIsSubmitted: (submitted: boolean) => void,
			setIsLoading: (loading: boolean) => void,
			fetchCompletedRef: React.MutableRefObject<boolean>,
		) => {
			const currentAssignmentId = localStorage.getItem("currentAssignmentId");
			const isAssignmentMode = !!stableRouterData.assignmentId;
			const newAssignmentId = stableRouterData.assignmentId;

			if (
				isAssignmentMode &&
				newAssignmentId &&
				newAssignmentId !== currentAssignmentId
			) {
				clearAssignmentData(currentAssignmentId, newAssignmentId as string);
			}

			const stored = localStorage.getItem("testQuestions");
			if (stored && !isAssignmentMode) {
				const parsed = JSON.parse(stored);
				const hasQs = Array.isArray(parsed) && parsed.length > 0;
				if (hasQs) {
					const normalized = normalizeQuestionsFull(parsed as Question[]);
					setData(normalized);
					restoreStoredAnswersAndGrades(
						routerData,
						setUserAnswers,
						setGradingResults,
						setIsSubmitted,
					);
					setIsLoading(false);
					fetchCompletedRef.current = true;
					logger.log("resume from localStorage before SSR", {
						count: normalized.length,
					});
					return true;
				}
			}
			return false;
		},
		[clearAssignmentData, restoreStoredAnswersAndGrades],
	);

	// Helper function to validate and set user answers
	const validateAndSetUserAnswers = useCallback(
		(
			restored: { userAnswers?: Record<string, unknown> },
			setUserAnswers: (
				answers: Record<number, (string | null)[] | null>,
			) => void,
		) => {
			if (restored.userAnswers) {
				const validAnswers: Record<number, (string | null)[] | null> = {};
				for (const [key, value] of Object.entries(restored.userAnswers)) {
					const index = Number.parseInt(key, 10);
					if (
						!Number.isNaN(index) &&
						(Array.isArray(value) || value === null)
					) {
						validAnswers[index] = value;
					}
				}
				setUserAnswers(validAnswers);
			}
		},
		[],
	);

	// Helper function to validate and set grading results
	const validateAndSetGradingResults = useCallback(
		(
			restored: { gradingResults?: Record<string, unknown> },
			setGradingResults: (results: GradingResults) => void,
		) => {
			if (restored.gradingResults) {
				const validGrading: GradingResults = {};
				for (const [key, value] of Object.entries(restored.gradingResults)) {
					const index = Number.parseInt(key, 10);
					if (
						!Number.isNaN(index) &&
						typeof value === "number" &&
						value >= 0 &&
						value <= 3
					) {
						validGrading[index] = value;
					}
				}
				setGradingResults(validGrading);
			}
		},
		[],
	);

	useEffect(() => {
		// Handle view results mode
		if (stableRouterData.viewResults === "true" && !isSubmitted) {
			setIsSubmitted(true);
			loadViewResultsData(stableRouterData, {
				setData,
				setUserAnswers,
				setGradingResults,
				setRouterData,
				setIsLoading,
				setTimeLeft,
				setIsSubmitted,
				setFetchError,
				fetchCompletedRef,
			});
		}

		// Handle assignment loading
		const isAssignmentMode = !!(
			stableRouterData.assignmentId ||
			stableRouterData.teamsAssign === "1" ||
			stableRouterData.teamsAssign === 1
		);

		if (isAssignmentMode && !fetchCompletedRef.current) {
			loadAssignment(stableRouterData, {
				setData,
				setUserAnswers,
				setGradingResults,
				setRouterData,
				setIsLoading,
				setTimeLeft,
				setIsSubmitted,
				setFetchError,
				fetchCompletedRef,
			});
			return;
		}

		// Prefer locally stored questions over SSR on reload to resume tests
		if (!ssrAppliedRef.current) {
			try {
				const restored = handleLocalStorageRestore(
					stableRouterData,
					routerData,
					setData,
					setUserAnswers,
					setGradingResults,
					setIsSubmitted,
					setIsLoading,
					fetchCompletedRef,
				);
				if (restored) {
					return;
				}
			} catch {
				// Ignore errors
			}
		}
		// Short-circuit if SSR provided data
		if (ssrAppliedRef.current) {
			return;
		}
		if (
			Array.isArray(initialData) &&
			initialData.length > 0 &&
			isLoading &&
			!fetchCompletedRef.current
		) {
			ssrAppliedRef.current = true;
			logger.log("short-circuit: applying SSR initialData", {
				count: initialData.length,
			});
			// Persist SSR data with normalization for consistent reloads
			const paramsStr = localStorage.getItem("testParams");
			resolveRouterParams(initialRouterData ?? {}, paramsStr);
			const base = normalizeQuestionsFull(initialData as Question[]);
			setData(base);
			setIsLoading(false);
			fetchCompletedRef.current = true;
		}
	}, [
		initialData,
		initialRouterData,
		stableRouterData,
		isSubmitted,
		isLoading,
		routerData,
		setUserAnswers,
		setGradingResults,
		setTimeLeft,
		handleLocalStorageRestore,
	]);

	useEffect(() => {
		if (!mountLoggedRef.current) {
			mountLoggedRef.current = true;
			logger.log("useTestState mount", {
				initialDataLen: Array.isArray(initialData) ? initialData.length : 0,
				hasInitialRouterData:
					!!initialRouterData &&
					Object.keys(initialRouterData || {}).length > 0,
			});
		}
		setIsMounted(true);
		if (localStorage.getItem("loaded")) {
			localStorage.removeItem("testUserAnswers");
			localStorage.removeItem("testGradingResults");

			localStorage.removeItem("loaded");
		}

		import("./utils/storageRestore")
			.then(({ restoreStoredState }) => {
				// Only restore from generic localStorage if we're not in assignment mode
				const isAssignmentMode = !!(
					routerData.assignmentId ||
					routerData.teamsAssign === "1" ||
					routerData.teamsAssign === 1
				);

				if (!isAssignmentMode) {
					const restored = restoreStoredState();
					validateAndSetUserAnswers(restored, setUserAnswers);
					validateAndSetGradingResults(restored, setGradingResults);
				}
			})
			.catch(() => {
				// Ignore errors - fallback handling is already in place
			});
	}, [
		initialData,
		initialRouterData,
		routerData,
		setUserAnswers,
		setGradingResults,
		validateAndSetUserAnswers,
		validateAndSetGradingResults,
	]);

	// If in preview mode, auto-fill answers with correct ones (all correct for multi-select) and mark submitted once data is loaded
	useEffect(() => {
		if (!isPreviewMode) {
			return;
		}
		if (!Array.isArray(data) || data.length === 0) {
			return;
		}
		if (isSubmitted) {
			return;
		}
		try {
			const { filled, grades } = buildPreviewAutofill(data);
			setUserAnswers(filled);
			setGradingResults(grades);
			setIsSubmitted(true);
			localStorage.setItem("testUserAnswers", JSON.stringify(filled));
			localStorage.setItem("testGradingResults", JSON.stringify(grades));
		} catch {
			// Ignore errors
		}
	}, [isPreviewMode, data, isSubmitted, setUserAnswers, setGradingResults]);

	// Ensure timer shows immediately by syncing from session when available
	useEffect(() => {
		try {
			const session = resumeTestSession() || getCurrentTestSession();
			if (session) {
				setTimeLeft(session.timeState.timeLeft);
			}
		} catch {
			// Ignore errors
		}
		// Re-run when router params are established (session is created in initLoad)
	}, [setTimeLeft]);

	useEffect(() => {
		// Skip initLoad if we're in assignment mode - assignment loading is handled separately
		if (stableRouterData.assignmentId) {
			return;
		}

		if (
			fetchStartedRef.current ||
			fetchCompletedRef.current ||
			data.length > 0 ||
			isLoading === false
		) {
			return;
		}
		fetchStartedRef.current = true;
		initLoad({
			initialData,
			stableRouterData,
			setRouterData,
			setFetchError,
			setIsLoading,
			setData,
			setTimeLeft,
			fetchCompletedRef,
		});
	}, [initialData, stableRouterData, data.length, isLoading, setTimeLeft]);

	useEffect(() => {
		if (timeLeft === 30) {
			toast.warning("Warning: Thirty seconds left");
		}
		if (timeLeft === 60) {
			toast.warning("Warning: One minute left");
		}
	}, [timeLeft]);

	useCountdown(timeLeft, isSubmitted, setTimeLeft, () => handleSubmit());

	usePauseOnUnmount();
	useResumeOnMount();
	useSetupVisibility();

	const handleSubmit = useCallback(async () => {
		await handleTestSubmission(
			data,
			userAnswers,
			gradingResults,
			routerData,
			timeLeft,
			{
				setIsSubmitted,
				setGradingResults,
				setGradingFrQs,
			},
		);
	}, [
		data,
		userAnswers,
		gradingResults,
		routerData,
		timeLeft,
		setGradingResults,
		setGradingFrQs,
	]);

	const reloadQuestions = async () => {
		setIsResetting(true);
		setFetchError(null);

		try {
			const total = Number.parseInt(routerData.questionCount || "10");
			const questions = await fetchQuestionsForParams(
				routerData as Record<string, unknown>,
				total,
			);
			setData(questions);
			localStorage.setItem("testQuestions", JSON.stringify(questions));
		} catch (error) {
			logger.error("Error reloading questions:", error);
			setFetchError("Failed to reload questions. Please try again.");
		} finally {
			setIsResetting(false);
		}
	};

	const handleResetTest = () => {
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}, 200);

		setIsSubmitted(false);
		setUserAnswers({});
		setGradingResults({});
		setExplanations({});
		setSubmittedReports({});
		setSubmittedEdits({});

		localStorage.removeItem("testQuestions");
		localStorage.removeItem("testUserAnswers");
		localStorage.removeItem("testGradingResults");
		localStorage.removeItem("contestedQuestions");
		localStorage.removeItem("testFromBookmarks");

		const timeLimit = routerData.timeLimit || "30";
		const eventName = routerData.eventName || "Unknown Event";
		const newSession = resetTestSession(eventName, Number.parseInt(timeLimit));

		setTimeLeft(newSession.timeState.timeLeft);

		reloadQuestions();
	};

	const handleGetExplanation = (
		index: number,
		question: Question,
		userAnswer: (string | null)[],
	) => {
		getExplanation(
			index,
			question,
			userAnswer,
			routerData,
			explanations,
			setExplanations,
			setLoadingExplanation,
			lastCallTime,
			setLastCallTime,
			setData,
			gradingResults,
			setGradingResults,
			userAnswers,
			rateLimitDelay,
		);
	};

	const handleQuestionRemoved = (questionIndex: number) => {
		handleQuestionRemovedUtil(
			questionIndex,
			data,
			routerData,
			userAnswers,
			gradingResults,
			explanations,
			loadingExplanation,
			{
				setData,
				setUserAnswers,
				setGradingResults,
				setExplanations,
				setLoadingExplanation,
				setSubmittedReports,
				setSubmittedEdits,
			},
		);
	};

	const handleEditSubmit = (
		editedQuestion: Question,
		reason: string,
		originalQuestion: Question,
		aiBypass?: boolean,
		aiSuggestion?: {
			question: string;
			options?: string[];
			answers: string[];
			answerIndices?: number[];
		},
	): Promise<{ success: boolean; message: string; reason: string }> => {
		return handleEditSubmitUtil(
			editedQuestion,
			reason,
			originalQuestion,
			data,
			editingQuestion,
			routerData,
			{
				setData,
				handleEditSubmitted,
			},
			aiBypass,
			aiSuggestion,
		);
	};

	const closeShareModal = useCallback(() => {
		setShareModalOpen(false);
	}, []);

	const handleBackToPractice = useCallback(() => {
		router.push("/practice");
	}, [router]);

	// Wrap handleBackToMain to also navigate to practice immediately
	const handleBackToMainWithNavigation = useCallback(() => {
		handleBackToMain(); // Close edit modal if open
		// Navigate immediately using router.push for instant navigation
		router.push("/practice");
	}, [router, handleBackToMain]);

	return {
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
		handleBackToMain: handleBackToMainWithNavigation,
		handleBackToPractice,
		isQuestionBookmarked,
		setShareModalOpen,
		setInputCode,
		setIsEditModalOpen,
	};
}
