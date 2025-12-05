Object.defineProperty(exports, "__esModule", { value: true });
exports.initLoad = initLoad;
const questionMedia_1 = require("@/app/test/utils/questionMedia");
const bookmarks_1 = require("@/app/utils/bookmarks");
const timeManagement_1 = require("@/app/utils/timeManagement");
const localStorageReplacement_1 = require("@/lib/database/localStorageReplacement");
const supabase_1 = require("@/lib/supabase");
const logger_1 = require("@/lib/utils/logger");
const fetchQuestions_1 = require("./fetchQuestions");
// Helper function to get router parameters from storage or initial data
function getRouterParams(stableRouterData) {
	const storedParams = localStorageReplacement_1.default.getItem("testParams");
	const hasInitial =
		stableRouterData && Object.keys(stableRouterData).length > 0;
	const routerParams = hasInitial
		? stableRouterData
		: storedParams
			? JSON.parse(storedParams)
			: {};
	logger_1.default.log("init routerParams", {
		hasInitial,
		routerParams,
		hasStoredParams: !!storedParams,
	});
	return routerParams;
}
// Helper function to handle session management and timer setup
function handleSessionManagement(routerParams, setTimeLeft) {
	const eventName = String(routerParams.eventName || "Unknown Event");
	const timeLimit = Number.parseInt(String(routerParams.timeLimit || "30"));
	try {
		const existingSession = (0, timeManagement_1.getCurrentTestSession)();
		if (
			existingSession &&
			((existingSession.eventName && existingSession.eventName !== eventName) ||
				(existingSession.timeLimit && existingSession.timeLimit !== timeLimit))
		) {
			// Reset and adopt new session
			const newSession = (0, timeManagement_1.resetTestSession)(
				eventName,
				timeLimit,
			);
			try {
				setTimeLeft(newSession.timeState.timeLeft);
			} catch (_a) {
				// Ignore setState errors
			}
			localStorageReplacement_1.default.removeItem("testQuestions");
			localStorageReplacement_1.default.removeItem("testUserAnswers");
			localStorageReplacement_1.default.removeItem("testGradingResults");
		}
	} catch (_b) {
		// Ignore session initialization errors
	}
	let session = (0, timeManagement_1.migrateFromLegacyStorage)(
		eventName,
		timeLimit,
	);
	if (!session) {
		session = (0, timeManagement_1.getCurrentTestSession)();
		if (session) {
			session = (0, timeManagement_1.resumeTestSession)();
		} else {
			session = (0, timeManagement_1.initializeTestSession)(
				eventName,
				timeLimit,
				false,
			);
		}
	}
	// Ensure timer is visible immediately
	try {
		if (session) {
			setTimeLeft(session.timeState.timeLeft);
		}
	} catch (_c) {
		// Ignore setState errors
	}
	return { session, eventName, timeLimit };
}
// Helper function to load questions from localStorage
function loadQuestionsFromLocalStorage(
	setData,
	setIsLoading,
	fetchCompletedRef,
	logMessage,
) {
	const storedQuestions =
		localStorageReplacement_1.default.getItem("testQuestions");
	if (storedQuestions) {
		try {
			const parsedQuestions = JSON.parse(storedQuestions);
			const hasQuestions =
				Array.isArray(parsedQuestions) && parsedQuestions.length > 0;
			if (hasQuestions) {
				setData((0, questionMedia_1.normalizeQuestionMedia)(parsedQuestions));
				setIsLoading(false);
				fetchCompletedRef.current = true;
				logger_1.default.log(logMessage, { count: parsedQuestions.length });
				return true;
			}
			logger_1.default.warn("ignoring empty testQuestions cache");
			localStorageReplacement_1.default.removeItem("testQuestions");
		} catch (_a) {
			// Ignore JSON parse errors
		}
	}
	return false;
}
// Helper function to load bookmarked questions from Supabase
async function loadBookmarkedQuestionsFromSupabase(
	eventName,
	setData,
	setFetchError,
	setIsLoading,
	fetchCompletedRef,
) {
	const {
		data: { user },
	} = await supabase_1.supabase.auth.getUser();
	if (user) {
		try {
			const bookmarks = await (0, bookmarks_1.loadBookmarksFromSupabase)(
				user.id,
			);
			const eventBookmarks = bookmarks.filter((b) => b.eventName === eventName);
			if (eventBookmarks.length > 0) {
				const questions = eventBookmarks.map((b) => b.question);
				setData(questions);
				localStorageReplacement_1.default.setItem(
					"testQuestions",
					JSON.stringify(questions),
				);
			} else {
				setFetchError("No bookmarked questions found for this event.");
			}
		} catch (error) {
			logger_1.default.error("Error loading bookmarked questions:", error);
			setFetchError("Failed to load bookmarked questions.");
		} finally {
			setIsLoading(false);
			fetchCompletedRef.current = true;
		}
	}
}
async function initLoad({
	initialData,
	stableRouterData,
	setRouterData,
	setFetchError,
	setIsLoading,
	setData,
	setTimeLeft,
	fetchCompletedRef,
}) {
	localStorageReplacement_1.default.removeItem("testFromBookmarks");
	if (fetchCompletedRef.current) {
		return;
	}
	const routerParams = getRouterParams(stableRouterData);
	if (!routerParams || Object.keys(routerParams).length === 0) {
		logger_1.default.warn(
			"empty routerParams; staying on page with friendly message",
		);
		setFetchError("No test parameters found. Go to Practice to start a test.");
		setIsLoading(false);
		fetchCompletedRef.current = true;
		return;
	}
	setRouterData(routerParams);
	const { session } = handleSessionManagement(routerParams, setTimeLeft);
	if (session === null || session === void 0 ? void 0 : session.isSubmitted) {
		const storedGrading =
			localStorageReplacement_1.default.getItem("testGradingResults");
		if (storedGrading) {
			try {
				/* touch parse to validate */ JSON.parse(storedGrading);
			} catch (_a) {
				// Ignore JSON parse errors
			}
		}
		if (
			loadQuestionsFromLocalStorage(
				setData,
				setIsLoading,
				fetchCompletedRef,
				"resume submitted test from localStorage",
			)
		) {
			return;
		}
	}
	const isFromBookmarks =
		localStorageReplacement_1.default.getItem("testFromBookmarks") === "true";
	if (
		loadQuestionsFromLocalStorage(
			setData,
			setIsLoading,
			fetchCompletedRef,
			"loaded questions from localStorage",
		)
	) {
		return;
	}
	if (Array.isArray(initialData) && initialData.length > 0) {
		setData((0, questionMedia_1.normalizeQuestionMedia)(initialData));
		setIsLoading(false);
		fetchCompletedRef.current = true;
		logger_1.default.log("using initialData from SSR", {
			count: initialData.length,
		});
		return;
	}
	if (isFromBookmarks) {
		await loadBookmarkedQuestionsFromSupabase(
			routerParams.eventName,
			setData,
			setFetchError,
			setIsLoading,
			fetchCompletedRef,
		);
		return;
	}
	// Fallback to API fetch
	try {
		const total = Number.parseInt(String(routerParams.questionCount || "10"));
		const questions = await (0, fetchQuestions_1.fetchQuestionsForParams)(
			routerParams,
			total,
		);
		localStorageReplacement_1.default.setItem(
			"testQuestions",
			JSON.stringify(questions),
		);
		setData(questions);
	} catch (error) {
		logger_1.default.error("Failed to load questions:", error);
		const errorMessage =
			routerParams.eventName === "Anatomy & Physiology"
				? "Failed to load Anatomy & Physiology questions. Check console for details."
				: "Failed to load questions. Please try again later.";
		setFetchError(errorMessage);
	} finally {
		setIsLoading(false);
		fetchCompletedRef.current = true;
	}
}
