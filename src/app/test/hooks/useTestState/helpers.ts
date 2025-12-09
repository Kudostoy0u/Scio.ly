import type { Question } from "@/app/utils/geminiService";
import type { GradingResults, RouterParams } from "@/app/utils/questionUtils";
import { getCurrentTestSession } from "@/app/utils/timeManagement";
import logger from "@/lib/utils/logging/logger";
import type React from "react";
import { fetchQuestionsForParams } from "../utils/fetchQuestions";
import { normalizeQuestionsFull } from "../utils/normalize";

export function createReloadQuestions({
	getRouterData,
	setIsResetting,
	setFetchError,
	setData,
}: {
	getRouterData: () => RouterParams;
	setIsResetting: (value: boolean) => void;
	setFetchError: (value: string | null) => void;
	setData: (data: Question[]) => void;
}) {
	return async () => {
		setIsResetting(true);
		setFetchError(null);

		try {
			const currentRouter = getRouterData();
			const total = Number.parseInt(currentRouter.questionCount || "10");
			const questions = await fetchQuestionsForParams(
				currentRouter as Record<string, unknown>,
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
}

export function clearAssignmentData(
	currentAssignmentId: string | null,
	newAssignmentId: string,
) {
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
}

export function restoreStoredAnswersAndGrades(
	routerData: RouterParams,
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void,
	setGradingResults: (results: GradingResults) => void,
	setIsSubmitted: (submitted: boolean) => void,
) {
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
}

export function handleLocalStorageRestore({
	stableRouterData,
	routerData,
	setData,
	setUserAnswers,
	setGradingResults,
	setIsSubmitted,
	setIsLoading,
	fetchCompletedRef,
	clearAssignmentData: clearAssignmentDataFn,
	restoreStoredAnswersAndGrades: restoreStoredAnswersAndGradesFn,
}: {
	stableRouterData: Record<string, unknown>;
	routerData: RouterParams;
	setData: (data: Question[]) => void;
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void;
	setGradingResults: (results: GradingResults) => void;
	setIsSubmitted: (submitted: boolean) => void;
	setIsLoading: (loading: boolean) => void;
	fetchCompletedRef: React.MutableRefObject<boolean>;
	clearAssignmentData: (
		currentAssignmentId: string | null,
		newAssignmentId: string,
	) => void;
	restoreStoredAnswersAndGrades: (
		routerData: RouterParams,
		setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void,
		setGradingResults: (results: GradingResults) => void,
		setIsSubmitted: (submitted: boolean) => void,
	) => void;
}) {
	const currentAssignmentId = localStorage.getItem("currentAssignmentId");
	const isAssignmentMode = !!stableRouterData.assignmentId;
	const newAssignmentId = stableRouterData.assignmentId;

	if (
		isAssignmentMode &&
		newAssignmentId &&
		newAssignmentId !== currentAssignmentId
	) {
		clearAssignmentDataFn(currentAssignmentId, newAssignmentId as string);
	}

	const stored = localStorage.getItem("testQuestions");
	if (stored && !isAssignmentMode) {
		const parsed = JSON.parse(stored);
		const hasQs = Array.isArray(parsed) && parsed.length > 0;
		if (hasQs) {
			const normalized = normalizeQuestionsFull(parsed as Question[]);
			setData(normalized);
			restoreStoredAnswersAndGradesFn(
				routerData,
				setUserAnswers,
				setGradingResults,
				setIsSubmitted,
			);
			setIsLoading(false);
			fetchCompletedRef.current = true;
			logger.info("resume from localStorage before SSR", {
				count: normalized.length,
			});
			return true;
		}
	}
	return false;
}

export function validateAndSetUserAnswers(
	restored: { userAnswers?: Record<string, unknown> },
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void,
) {
	if (restored.userAnswers) {
		const validAnswers: Record<number, (string | null)[] | null> = {};
		for (const [key, value] of Object.entries(restored.userAnswers)) {
			const index = Number.parseInt(key, 10);
			if (!Number.isNaN(index) && (Array.isArray(value) || value === null)) {
				validAnswers[index] = value;
			}
		}
		setUserAnswers(validAnswers);
	}
}

export function validateAndSetGradingResults(
	restored: { gradingResults?: Record<string, unknown> },
	setGradingResults: (results: GradingResults) => void,
) {
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
}
