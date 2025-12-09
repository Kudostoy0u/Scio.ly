import type { QuoteData } from "@/app/codebusters/types";
import logger from "@/lib/utils/logging/logger";
import { useCallback, useEffect, useState } from "react";

// import { toast } from 'react-toastify';
import type { TestSession } from "@/app/utils/timeManagement";
import {
	getCurrentTestSession,
	initializeTestSession,
	migrateFromLegacyStorage,
	resumeTestSession,
} from "@/app/utils/timeManagement";

// localstorage keys for different event types
const NORMAL_EVENT_PREFERENCES = "scio_normal_event_preferences";
const CODEBUSTERS_PREFERENCES = "scio_codebusters_preferences";

const NORMAL_DEFAULTS = {
	questionCount: 10,
	timeLimit: 15,
};

const CODEBUSTERS_DEFAULTS = {
	questionCount: 3,
	timeLimit: 15,
};

const loadPreferences = (eventName: string) => {
	const isCodebusters = eventName === "Codebusters";
	const key = isCodebusters
		? CODEBUSTERS_PREFERENCES
		: NORMAL_EVENT_PREFERENCES;
	const defaults = isCodebusters ? CODEBUSTERS_DEFAULTS : NORMAL_DEFAULTS;

	try {
		const saved = localStorage.getItem(key);
		if (saved) {
			const preferences = JSON.parse(saved);
			return {
				questionCount: preferences.questionCount || defaults.questionCount,
				timeLimit: preferences.timeLimit || defaults.timeLimit,
			};
		}
	} catch (error) {
		logger.error("Error loading preferences:", error);
	}

	return defaults;
};

// Helper function to get or create test session (moved outside component to avoid dependency issues)
const getOrCreateTestSession = (
	eventName: string,
	timeLimit: number,
	hasShareCode: string | null,
): TestSession | null => {
	if (hasShareCode) {
		const session = getCurrentTestSession();
		if (session) {
			return resumeTestSession();
		}
		return initializeTestSession(eventName, timeLimit, true);
	}

	let session = migrateFromLegacyStorage(eventName, timeLimit);
	if (!session) {
		session = getCurrentTestSession();
		if (session) {
			return resumeTestSession();
		}
		return initializeTestSession(eventName, timeLimit, false);
	}
	return session;
};

export const useCodebustersState = (assignmentId?: string | null) => {
	const [quotes, setQuotes] = useState<QuoteData[]>([]);
	const [isTestSubmitted, setIsTestSubmitted] = useState(false);
	const [testScore, setTestScore] = useState<number | null>(null);
	const [timeLeft, setTimeLeft] = useState<number | null>(
		CODEBUSTERS_DEFAULTS.timeLimit * 60,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showPdfViewer, setShowPdfViewer] = useState(false);
	const [shareModalOpen, setShareModalOpen] = useState(false);
	const [inputCode, setInputCode] = useState<string>("");
	const [, setIsTimeSynchronized] = useState(false);
	const [, setSyncTimestamp] = useState<number | null>(null);
	const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
	const [quotesLoadedFromStorage, setQuotesLoadedFromStorage] = useState(false);
	const [activeHints, setActiveHints] = useState<{
		[questionIndex: number]: boolean;
	}>({});
	const [revealedLetters, setRevealedLetters] = useState<{
		[questionIndex: number]: { [letter: string]: string };
	}>({});
	const [hintedLetters, setHintedLetters] = useState<{
		[questionIndex: number]: { [letter: string]: boolean };
	}>({});
	const [hintCounts, setHintCounts] = useState<{
		[questionIndex: number]: number;
	}>({});
	const [infoModalOpen, setInfoModalOpen] = useState(false);
	const [selectedCipherType, setSelectedCipherType] = useState<string>("");
	const [printModalOpen, setPrintModalOpen] = useState(false);
	const [tournamentName, setTournamentName] = useState("");
	const [questionPoints, setQuestionPoints] = useState<{
		[key: number]: number;
	}>({});
	const [resetTrigger, setResetTrigger] = useState(0);

	// Helper function to clear assignment state
	const clearAssignmentState = useCallback(() => {
		setIsTestSubmitted(false);
		setTestScore(null);
		setTimeLeft(null);
		setQuotes([]);
		setQuotesLoadedFromStorage(false);
		localStorage.removeItem("codebustersIsTestSubmitted");
		localStorage.removeItem("codebustersTestScore");
		localStorage.removeItem("codebustersTimeLeft");
		localStorage.removeItem("codebustersQuotes");
		localStorage.removeItem("codebustersQuotesLoadedFromStorage");
		localStorage.removeItem("testParams");
		localStorage.removeItem("testGradingResults");
		localStorage.removeItem("currentTestSession");
		setIsLoading(false);
	}, []);

	// Helper function to update quote points
	const updateQuotePoints = useCallback((quotes: QuoteData[]): QuoteData[] => {
		return quotes.map((q) => {
			if (typeof q.points === "number" && q.points > 0) {
				return q;
			}
			const base = Math.max(5, Math.round(5 + 25 * (q.difficulty ?? 0.5)));
			return { ...q, points: base } as QuoteData;
		});
	}, []);

	// Helper function to parse and set saved state
	const parseAndSetSavedState = useCallback(
		(savedIsTestSubmitted: string | null, savedTestScore: string | null) => {
			if (savedIsTestSubmitted) {
				try {
					setIsTestSubmitted(JSON.parse(savedIsTestSubmitted));
				} catch {
					// Ignore parse errors for saved test submitted state
				}
			}
			if (savedTestScore) {
				try {
					setTestScore(JSON.parse(savedTestScore));
				} catch {
					// Ignore parse errors for saved test score
				}
			}
		},
		[],
	);

	// Helper function to load quotes from saved state
	const loadQuotesFromSavedState = useCallback(
		(
			savedQuotes: string,
			savedIsTestSubmitted: string | null,
			savedTestScore: string | null,
		): boolean => {
			try {
				const parsedQuotes: QuoteData[] = JSON.parse(savedQuotes);
				const updatedQuotes = updateQuotePoints(parsedQuotes);
				parseAndSetSavedState(savedIsTestSubmitted, savedTestScore);
				setQuotes(updatedQuotes);
				localStorage.setItem(
					"codebustersQuotes",
					JSON.stringify(updatedQuotes),
				);
				setQuotesLoadedFromStorage(true);
				localStorage.setItem("codebustersQuotesLoadedFromStorage", "true");
				setIsLoading(false);
				return true;
			} catch (e) {
				logger.error("Error parsing saved quotes:", e);
				return false;
			}
		},
		[parseAndSetSavedState, updateQuotePoints],
	);

	// Helper function to handle force refresh
	const handleForceRefresh = useCallback((): boolean => {
		logger.log("Force refresh detected, clearing quotes");
		localStorage.removeItem("codebustersQuotes");
		localStorage.removeItem("codebustersForceRefresh");
		setIsLoading(false);
		return true;
	}, []);

	// Helper function to load saved quotes with test params
	const loadSavedQuotesWithTestParams = useCallback(
		(
			savedQuotes: string,
			savedIsTestSubmitted: string | null,
			savedTestScore: string | null,
		): boolean => {
			logger.log("Found saved quotes, loading them");
			logger.log("savedIsTestSubmitted:", savedIsTestSubmitted);
			logger.log("savedTestScore:", savedTestScore);

			try {
				const parsedQuotes: QuoteData[] = JSON.parse(savedQuotes);
				const updatedQuotes = updateQuotePoints(parsedQuotes);
				parseAndSetSavedState(savedIsTestSubmitted, savedTestScore);
				setQuotes(updatedQuotes);
				try {
					localStorage.setItem(
						"codebustersQuotes",
						JSON.stringify(updatedQuotes),
					);
				} catch {
					// Ignore parse errors
				}
				setQuotesLoadedFromStorage(true);
				localStorage.setItem("codebustersQuotesLoadedFromStorage", "true");
				return true;
			} catch (error) {
				logger.error("Error parsing saved quotes:", error);
				setError("Could not load test data. It might be corrupted.");
				return false;
			}
		},
		[parseAndSetSavedState, updateQuotePoints],
	);

	// Helper function to reset hint state
	const resetHintState = useCallback(() => {
		setRevealedLetters({});
		setHintedLetters({});
		setHintCounts({});
	}, []);

	// Helper function to handle test params loading
	const handleTestParamsLoading = useCallback(
		(
			_testParamsStr: string,
			savedQuotes: string | null,
			savedIsTestSubmitted: string | null,
			savedTestScore: string | null,
			forceRefresh: string | null,
		) => {
			logger.log("Found testParams, checking for saved quotes...");

			if (forceRefresh === "true") {
				handleForceRefresh();
				return;
			}

			if (savedQuotes) {
				loadSavedQuotesWithTestParams(
					savedQuotes,
					savedIsTestSubmitted,
					savedTestScore,
				);
			} else {
				logger.log("No saved quotes found, will trigger fresh load");
				setIsLoading(false);
			}

			resetHintState();
		},
		[handleForceRefresh, loadSavedQuotesWithTestParams, resetHintState],
	);

	// Helper function to initialize test session
	const initializeTestSessionFromStorage = useCallback(
		(
			testParamsStr: string,
			hasShareCode: string | null,
			savedIsTestSubmitted: string | null,
		) => {
			const testParams = JSON.parse(testParamsStr);
			const eventName = testParams.eventName || "Codebusters";
			const preferences = loadPreferences(eventName);
			const timeLimit =
				Number.parseInt(testParams.timeLimit) || preferences.timeLimit;

			const session = getOrCreateTestSession(
				eventName,
				timeLimit,
				hasShareCode,
			);

			if (session) {
				setTimeLeft(session.timeState.timeLeft);
				setIsTimeSynchronized(session.timeState.isTimeSynchronized);
				setSyncTimestamp(session.timeState.syncTimestamp);
				if (!savedIsTestSubmitted) {
					setIsTestSubmitted(session.isSubmitted);
				}
			}
		},
		[],
	);

	useEffect(() => {
		if (hasAttemptedLoad) {
			return;
		}

		setHasAttemptedLoad(true);

		// Skip localStorage loading if we're in assignment mode
		if (assignmentId) {
			clearAssignmentState();
			return;
		}

		const testParamsStr = localStorage.getItem("testParams");
		const savedQuotes = localStorage.getItem("codebustersQuotes");
		const savedIsTestSubmitted = localStorage.getItem(
			"codebustersIsTestSubmitted",
		);
		const savedTestScore = localStorage.getItem("codebustersTestScore");
		const forceRefresh = localStorage.getItem("codebustersForceRefresh");
		const savedQuotesLoadedFromStorage = localStorage.getItem(
			"codebustersQuotesLoadedFromStorage",
		);

		setIsLoading(true);

		if (
			savedQuotes &&
			loadQuotesFromSavedState(
				savedQuotes,
				savedIsTestSubmitted,
				savedTestScore,
			)
		) {
			return;
		}

		if (testParamsStr) {
			handleTestParamsLoading(
				testParamsStr,
				savedQuotes,
				savedIsTestSubmitted,
				savedTestScore,
				forceRefresh,
			);

			const hasShareCode = localStorage.getItem("shareCode");
			initializeTestSessionFromStorage(
				testParamsStr,
				hasShareCode,
				savedIsTestSubmitted,
			);
		} else {
			setError(
				"No test parameters found. Please configure a test from the practice page.",
			);
		}

		if (savedQuotesLoadedFromStorage === "true") {
			logger.log("Restoring quotesLoadedFromStorage flag");
			setQuotesLoadedFromStorage(true);
		}

		logger.log("Setting isLoading to false");
		setIsLoading(false);
	}, [
		assignmentId,
		hasAttemptedLoad,
		clearAssignmentState,
		loadQuotesFromSavedState,
		handleTestParamsLoading,
		initializeTestSessionFromStorage,
	]);

	useEffect(() => {
		if (quotes.length > 0) {
			localStorage.setItem("codebustersQuotes", JSON.stringify(quotes));
		}
		if (testScore !== null) {
			localStorage.setItem("codebustersTestScore", JSON.stringify(testScore));
		}
	}, [quotes, testScore]);

	return {
		quotes,
		setQuotes,
		isTestSubmitted,
		setIsTestSubmitted,
		testScore,
		setTestScore,
		timeLeft,
		setTimeLeft,
		isLoading,
		setIsLoading,
		error,
		setError,
		showPDFViewer: showPdfViewer,
		setShowPDFViewer: setShowPdfViewer,
		shareModalOpen,
		setShareModalOpen,
		inputCode,
		setInputCode,
		setIsTimeSynchronized,
		setSyncTimestamp,
		hasAttemptedLoad,
		quotesLoadedFromStorage,
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
		printModalOpen,
		setPrintModalOpen,
		tournamentName,
		setTournamentName,
		questionPoints,
		setQuestionPoints,
		resetTrigger,
		setResetTrigger,

		loadPreferences,
	};
};
