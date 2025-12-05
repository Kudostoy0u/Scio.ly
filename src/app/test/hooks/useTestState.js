"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTestState = useTestState;
const questionUtils_1 = require("@/app/utils/questionUtils");
const timeManagement_1 = require("@/app/utils/timeManagement");
const logger_1 = require("@/lib/utils/logger");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const react_toastify_1 = require("react-toastify");
const assignmentLoader_1 = require("../utils/assignmentLoader");
const questionHandlers_1 = require("../utils/questionHandlers");
const testSubmission_1 = require("../utils/testSubmission");
const useTestAnswers_1 = require("./useTestAnswers");
const useTestBookmarks_1 = require("./useTestBookmarks");
const useTestEdit_1 = require("./useTestEdit");
const useTestGrading_1 = require("./useTestGrading");
const useTestTimer_1 = require("./useTestTimer");
const fetchQuestions_1 = require("./utils/fetchQuestions");
const initLoad_1 = require("./utils/initLoad");
const normalize_1 = require("./utils/normalize");
const preview_1 = require("./utils/preview");
const ssr_1 = require("./utils/ssr");
const timeHooks_1 = require("./utils/timeHooks");
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
function useTestState({ initialData, initialRouterData } = {}) {
	const router = (0, navigation_1.useRouter)();
	const [isLoading, setIsLoading] = (0, react_1.useState)(true);
	const fetchStartedRef = (0, react_1.useRef)(false);
	const fetchCompletedRef = (0, react_1.useRef)(false);
	const [data, setData] = (0, react_1.useState)(
		Array.isArray(initialData) ? initialData : [],
	);
	// Debug data state changes
	(0, react_1.useEffect)(() => {
		if (data.length > 0) {
			// Debug logging can go here if needed
		}
	}, [data]);
	const [routerData, setRouterData] = (0, react_1.useState)(
		initialRouterData || {},
	);
	const [isSubmitted, setIsSubmitted] = (0, react_1.useState)(false);
	const [fetchError, setFetchError] = (0, react_1.useState)(null);
	const [explanations, setExplanations] = (0, react_1.useState)({});
	const [loadingExplanation, setLoadingExplanation] = (0, react_1.useState)({});
	const [lastCallTime, setLastCallTime] = (0, react_1.useState)(0);
	const rateLimitDelay = 2000;
	const [isMounted, setIsMounted] = (0, react_1.useState)(false);
	const ssrAppliedRef = (0, react_1.useRef)(false);
	const mountLoggedRef = (0, react_1.useRef)(false);
	const [shareModalOpen, setShareModalOpen] = (0, react_1.useState)(false);
	const [inputCode, setInputCode] = (0, react_1.useState)("");
	const [isResetting, setIsResetting] = (0, react_1.useState)(false);
	const isClient = typeof window !== "undefined";
	const previewSearch = isClient
		? new URLSearchParams(window.location.search)
		: null;
	const isPreviewMode = !!(
		previewSearch && previewSearch.get("preview") === "1"
	);
	const stableRouterData = (0, react_1.useMemo)(
		() => initialRouterData || {},
		[initialRouterData],
	);
	// Use extracted hooks
	const { userAnswers, setUserAnswers, handleAnswerChange } = (0,
	useTestAnswers_1.useTestAnswers)({ routerData });
	const { handleBookmarkChange, isQuestionBookmarked } = (0,
	useTestBookmarks_1.useTestBookmarks)();
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
	} = (0, useTestEdit_1.useTestEdit)();
	const { timeLeft, setTimeLeft } = (0, useTestTimer_1.useTestTimer)({
		routerData,
		isSubmitted,
		onTimeUp: () => handleSubmit(),
	});
	const { gradingResults, setGradingResults, gradingFRQs, setGradingFrQs } = (0,
	useTestGrading_1.useTestGrading)(data, userAnswers, isSubmitted, routerData);
	// Helper function to clear assignment data
	const clearAssignmentData = (0, react_1.useCallback)(
		(currentAssignmentId, newAssignmentId) => {
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
	const restoreStoredAnswersAndGrades = (0, react_1.useCallback)(
		(routerData, setUserAnswers, setGradingResults, setIsSubmitted) => {
			try {
				const session = (0, timeManagement_1.getCurrentTestSession)();
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
					} catch (_a) {
						// Ignore errors
					}
				}
				const storedGrades = localStorage.getItem(gradesKey);
				if (storedGrades) {
					try {
						setGradingResults(JSON.parse(storedGrades));
					} catch (_b) {
						// Ignore errors
					}
				}
			} catch (_c) {
				// Ignore errors
			}
		},
		[],
	);
	// Helper function to handle localStorage restoration
	const handleLocalStorageRestore = (0, react_1.useCallback)(
		(
			stableRouterData,
			routerData,
			setData,
			setUserAnswers,
			setGradingResults,
			setIsSubmitted,
			setIsLoading,
			fetchCompletedRef,
		) => {
			const currentAssignmentId = localStorage.getItem("currentAssignmentId");
			const isAssignmentMode = !!stableRouterData.assignmentId;
			const newAssignmentId = stableRouterData.assignmentId;
			if (
				isAssignmentMode &&
				newAssignmentId &&
				newAssignmentId !== currentAssignmentId
			) {
				clearAssignmentData(currentAssignmentId, newAssignmentId);
			}
			const stored = localStorage.getItem("testQuestions");
			if (stored && !isAssignmentMode) {
				const parsed = JSON.parse(stored);
				const hasQs = Array.isArray(parsed) && parsed.length > 0;
				if (hasQs) {
					const normalized = (0, normalize_1.normalizeQuestionsFull)(parsed);
					setData(normalized);
					restoreStoredAnswersAndGrades(
						routerData,
						setUserAnswers,
						setGradingResults,
						setIsSubmitted,
					);
					setIsLoading(false);
					fetchCompletedRef.current = true;
					logger_1.default.log("resume from localStorage before SSR", {
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
	const validateAndSetUserAnswers = (0, react_1.useCallback)(
		(restored, setUserAnswers) => {
			if (restored.userAnswers) {
				const validAnswers = {};
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
	const validateAndSetGradingResults = (0, react_1.useCallback)(
		(restored, setGradingResults) => {
			if (restored.gradingResults) {
				const validGrading = {};
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
	(0, react_1.useEffect)(() => {
		// Handle view results mode
		if (stableRouterData.viewResults === "true" && !isSubmitted) {
			setIsSubmitted(true);
			(0, assignmentLoader_1.loadViewResultsData)(stableRouterData, {
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
			(0, assignmentLoader_1.loadAssignment)(stableRouterData, {
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
			} catch (_a) {
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
			logger_1.default.log("short-circuit: applying SSR initialData", {
				count: initialData.length,
			});
			// Persist SSR data with normalization for consistent reloads
			const paramsStr = localStorage.getItem("testParams");
			(0, ssr_1.resolveRouterParams)(
				initialRouterData !== null && initialRouterData !== void 0
					? initialRouterData
					: {},
				paramsStr,
			);
			const base = (0, normalize_1.normalizeQuestionsFull)(initialData);
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
	(0, react_1.useEffect)(() => {
		if (!mountLoggedRef.current) {
			mountLoggedRef.current = true;
			logger_1.default.log("useTestState mount", {
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
		Promise.resolve()
			.then(() => require("./utils/storageRestore"))
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
	(0, react_1.useEffect)(() => {
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
			const { filled, grades } = (0, preview_1.buildPreviewAutofill)(data);
			setUserAnswers(filled);
			setGradingResults(grades);
			setIsSubmitted(true);
			localStorage.setItem("testUserAnswers", JSON.stringify(filled));
			localStorage.setItem("testGradingResults", JSON.stringify(grades));
		} catch (_a) {
			// Ignore errors
		}
	}, [isPreviewMode, data, isSubmitted, setUserAnswers, setGradingResults]);
	// Ensure timer shows immediately by syncing from session when available
	(0, react_1.useEffect)(() => {
		try {
			const session =
				(0, timeManagement_1.resumeTestSession)() ||
				(0, timeManagement_1.getCurrentTestSession)();
			if (session) {
				setTimeLeft(session.timeState.timeLeft);
			}
		} catch (_a) {
			// Ignore errors
		}
		// Re-run when router params are established (session is created in initLoad)
	}, [setTimeLeft]);
	(0, react_1.useEffect)(() => {
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
		(0, initLoad_1.initLoad)({
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
	(0, react_1.useEffect)(() => {
		if (timeLeft === 30) {
			react_toastify_1.toast.warning("Warning: Thirty seconds left");
		}
		if (timeLeft === 60) {
			react_toastify_1.toast.warning("Warning: One minute left");
		}
	}, [timeLeft]);
	(0, timeHooks_1.useCountdown)(timeLeft, isSubmitted, setTimeLeft, () =>
		handleSubmit(),
	);
	(0, timeHooks_1.usePauseOnUnmount)();
	(0, timeHooks_1.useResumeOnMount)();
	(0, timeHooks_1.useSetupVisibility)();
	const handleSubmit = (0, react_1.useCallback)(async () => {
		await (0, testSubmission_1.handleTestSubmission)(
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
			const questions = await (0, fetchQuestions_1.fetchQuestionsForParams)(
				routerData,
				total,
			);
			setData(questions);
			localStorage.setItem("testQuestions", JSON.stringify(questions));
		} catch (error) {
			logger_1.default.error("Error reloading questions:", error);
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
		const newSession = (0, timeManagement_1.resetTestSession)(
			eventName,
			Number.parseInt(timeLimit),
		);
		setTimeLeft(newSession.timeState.timeLeft);
		reloadQuestions();
	};
	const handleGetExplanation = (index, question, userAnswer) => {
		(0, questionUtils_1.getExplanation)(
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
	const handleQuestionRemoved = (questionIndex) => {
		(0, questionHandlers_1.handleQuestionRemoved)(
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
		editedQuestion,
		reason,
		originalQuestion,
		aiBypass,
		aiSuggestion,
	) => {
		return (0, questionHandlers_1.handleEditSubmit)(
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
	const closeShareModal = (0, react_1.useCallback)(() => {
		setShareModalOpen(false);
	}, []);
	const handleBackToPractice = (0, react_1.useCallback)(() => {
		router.push("/practice");
	}, [router]);
	// Wrap handleBackToMain to also navigate to practice immediately
	const handleBackToMainWithNavigation = (0, react_1.useCallback)(() => {
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
