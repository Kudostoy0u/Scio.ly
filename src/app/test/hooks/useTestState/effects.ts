import { initLoad } from "@/app/test/hooks/utils/initLoad";
import { normalizeQuestionsFull } from "@/app/test/hooks/utils/normalize";
import { buildPreviewAutofill } from "@/app/test/hooks/utils/preview";
import { resolveRouterParams } from "@/app/test/hooks/utils/ssr";
import {
	loadAssignment,
	loadViewResultsData,
} from "@/app/test/utils/assignmentLoader";
import type { Question } from "@/app/utils/geminiService";
import type { GradingResults, RouterParams } from "@/app/utils/questionUtils";
import {
	getCurrentTestSession,
	resumeTestSession,
} from "@/app/utils/timeManagement";
import logger from "@/lib/utils/logging/logger";
import { useEffect } from "react";
import { toast } from "react-toastify";
import {
	handleLocalStorageRestore,
	restoreStoredAnswersAndGrades,
	validateAndSetGradingResults,
	validateAndSetUserAnswers,
} from "./helpers";

export function useViewResultsAndAssignmentEffect({
	initialData,
	initialRouterData,
	stableRouterData,
	isSubmitted,
	setIsSubmitted,
	setData,
	setUserAnswers,
	setGradingResults,
	setRouterData,
	setIsLoading,
	setTimeLeft,
	setFetchError,
	fetchCompletedRef,
	ssrAppliedRef,
	routerData,
	clearAssignmentData,
}: {
	initialData?: unknown[];
	initialRouterData?: Record<string, unknown>;
	stableRouterData: Record<string, unknown>;
	isSubmitted: boolean;
	setIsSubmitted: (submitted: boolean) => void;
	setData: (data: Question[]) => void;
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void;
	setGradingResults: (results: GradingResults) => void;
	setRouterData: (data: RouterParams) => void;
	setIsLoading: (loading: boolean) => void;
	setTimeLeft: (value: number | null) => void;
	setFetchError: (value: string | null) => void;
	fetchCompletedRef: React.MutableRefObject<boolean>;
	ssrAppliedRef: React.MutableRefObject<boolean>;
	routerData: RouterParams;
	clearAssignmentData: (
		currentAssignmentId: string | null,
		newAssignmentId: string,
	) => void;
}) {
	useEffect(() => {
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

		if (!ssrAppliedRef.current) {
			try {
				const restored = handleLocalStorageRestore({
					stableRouterData,
					routerData,
					setData,
					setUserAnswers,
					setGradingResults,
					setIsSubmitted,
					setIsLoading,
					fetchCompletedRef,
					clearAssignmentData,
					restoreStoredAnswersAndGrades,
				});
				if (restored) {
					return;
				}
			} catch {
				// Ignore errors
			}
		}

		if (ssrAppliedRef.current) {
			return;
		}

		if (
			Array.isArray(initialData) &&
			initialData.length > 0 &&
			setIsLoading &&
			!fetchCompletedRef.current
		) {
			ssrAppliedRef.current = true;
			logger.info("short-circuit: applying SSR initialData", {
				count: initialData.length,
			});
			const paramsStr = localStorage.getItem("testParams");
			resolveRouterParams(initialRouterData ?? {}, paramsStr);
			const normalized = normalizeQuestionsFull(initialData as Question[]);
			setData(normalized);
			setIsLoading(false);
			fetchCompletedRef.current = true;
		}
	}, [
		initialData,
		initialRouterData,
		stableRouterData,
		isSubmitted,
		routerData,
		setIsSubmitted,
		setData,
		setUserAnswers,
		setGradingResults,
		setRouterData,
		setIsLoading,
		setTimeLeft,
		setFetchError,
		fetchCompletedRef,
		ssrAppliedRef,
		clearAssignmentData,
	]);
}

export function useMountRestoreEffect({
	initialData,
	initialRouterData,
	routerData,
	setIsMounted,
	setUserAnswers,
	setGradingResults,
}: {
	initialData?: unknown[];
	initialRouterData?: Record<string, unknown>;
	routerData: RouterParams;
	setIsMounted: (value: boolean) => void;
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void;
	setGradingResults: (results: GradingResults) => void;
}) {
	useEffect(() => {
		logger.info("useTestState mount", {
			initialDataLen: Array.isArray(initialData) ? initialData.length : 0,
			hasInitialRouterData:
				!!initialRouterData && Object.keys(initialRouterData || {}).length > 0,
		});
		setIsMounted(true);
		if (localStorage.getItem("loaded")) {
			localStorage.removeItem("testUserAnswers");
			localStorage.removeItem("testGradingResults");
			localStorage.removeItem("loaded");
		}

		import("@/app/test/hooks/utils/storageRestore")
			.then(({ restoreStoredState }) => {
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
				// Ignore errors
			});
	}, [
		initialData,
		initialRouterData,
		routerData,
		setUserAnswers,
		setGradingResults,
		setIsMounted,
	]);
}

export function usePreviewAutofillEffect({
	isPreviewMode,
	data,
	isSubmitted,
	setUserAnswers,
	setGradingResults,
	setIsSubmitted,
}: {
	isPreviewMode: boolean;
	data: Question[];
	isSubmitted: boolean;
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void;
	setGradingResults: (results: GradingResults) => void;
	setIsSubmitted: (submitted: boolean) => void;
}) {
	useEffect(() => {
		if (!isPreviewMode) return;
		if (!Array.isArray(data) || data.length === 0) return;
		if (isSubmitted) return;
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
	}, [
		isPreviewMode,
		data,
		isSubmitted,
		setUserAnswers,
		setGradingResults,
		setIsSubmitted,
	]);
}

export function useSessionTimeSyncEffect({
	setTimeLeft,
}: {
	setTimeLeft: (value: number | null) => void;
}) {
	useEffect(() => {
		try {
			const session = resumeTestSession() || getCurrentTestSession();
			if (session) {
				setTimeLeft(session.timeState.timeLeft);
			}
		} catch {
			// Ignore errors
		}
	}, [setTimeLeft]);
}

export function useInitLoadEffect({
	stableRouterData,
	dataLength,
	isLoading,
	setTimeLeft,
	initialData,
	fetchStartedRef,
	fetchCompletedRef,
	setRouterData,
	setFetchError,
	setIsLoading,
	setData,
}: {
	stableRouterData: Record<string, unknown>;
	dataLength: number;
	isLoading: boolean;
	setTimeLeft: (value: number | null) => void;
	initialData?: unknown[];
	fetchStartedRef: React.MutableRefObject<boolean>;
	fetchCompletedRef: React.MutableRefObject<boolean>;
	setRouterData: (data: RouterParams) => void;
	setFetchError: (value: string | null) => void;
	setIsLoading: (loading: boolean) => void;
	setData: (value: Question[]) => void;
}) {
	useEffect(() => {
		if (stableRouterData.assignmentId) {
			return;
		}

		if (
			fetchStartedRef.current ||
			fetchCompletedRef.current ||
			dataLength > 0 ||
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
	}, [
		initialData,
		stableRouterData,
		dataLength,
		isLoading,
		setTimeLeft,
		setRouterData,
		setFetchError,
		setIsLoading,
		setData,
		fetchStartedRef,
		fetchCompletedRef,
	]);
}

export function useWarningToastEffect(timeLeft: number) {
	useEffect(() => {
		if (timeLeft === 30) {
			toast.warning("Warning: Thirty seconds left");
		}
		if (timeLeft === 60) {
			toast.warning("Warning: One minute left");
		}
	}, [timeLeft]);
}
