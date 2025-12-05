import type { Question } from "@/app/utils/geminiService";
import type { RouterParams } from "@/app/utils/questionUtils";
import logger from "@/lib/utils/logger";
import type React from "react";
import { normalizeQuestionsFull } from "../hooks/utils/normalize";

function validateAssignmentQuestions(questions: unknown[]): void {
	for (const [index, question] of questions.entries()) {
		const q = question as { answers?: unknown; question?: string };
		if (!q.answers) {
			throw new Error(
				`Assignment question ${index + 1} (${q.question ?? "unknown"}) missing required answers field`,
			);
		}

		if (q.answers === undefined) {
			throw new Error(
				`Assignment question ${index + 1} (${q.question ?? "unknown"}) has undefined answers field`,
			);
		}

		if (q.answers === null) {
			throw new Error(
				`Assignment question ${index + 1} (${q.question ?? "unknown"}) has null answers field`,
			);
		}

		if (Array.isArray(q.answers) && q.answers.length === 0) {
			throw new Error(
				`Assignment question ${index + 1} (${q.question ?? "unknown"}) has empty answers array`,
			);
		}
	}
}

export interface AssignmentLoaderCallbacks {
	setData: (data: Question[]) => void;
	setUserAnswers: (answers: Record<number, (string | null)[] | null>) => void;
	setGradingResults: (results: Record<number, number>) => void;
	setRouterData: (data: RouterParams) => void;
	setIsLoading: (loading: boolean) => void;
	setTimeLeft: (time: number) => void;
	setIsSubmitted: (submitted: boolean) => void;
	setFetchError: (error: string | null) => void;
	fetchCompletedRef: React.MutableRefObject<boolean>;
}

function hasInvalidQuestions(questions: Question[]): boolean {
	return questions.some(
		(q: Question) =>
			!(q.answers && Array.isArray(q.answers)) || q.answers.length === 0,
	);
}

function clearLegacyLocalStorage(answersKey: string, gradesKey: string): void {
	localStorage.removeItem("testQuestions");
	localStorage.removeItem(answersKey);
	localStorage.removeItem(gradesKey);
	localStorage.removeItem("testSubmitted");
	localStorage.removeItem("testParams");
	localStorage.removeItem("currentTestSession");
}

function clearNewLocalStorage(assignmentKey: string): void {
	localStorage.removeItem(`${assignmentKey}_questions`);
	localStorage.removeItem(`${assignmentKey}_answers`);
	localStorage.removeItem(`${assignmentKey}_session`);
	localStorage.removeItem(`${assignmentKey}_grading`);
}

function clearTestLocalStorage(): void {
	localStorage.removeItem("testSubmitted");
	localStorage.removeItem("testUserAnswers");
	localStorage.removeItem("testQuestions");
	localStorage.removeItem("testParams");
	localStorage.removeItem("testGradingResults");
	localStorage.removeItem("currentTestSession");
}

function loadFromLegacyFormat(
	stableRouterData: RouterParams,
	callbacks: AssignmentLoaderCallbacks,
): boolean {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setRouterData,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;

	if (
		!(
			stableRouterData.teamsAssign === "1" || stableRouterData.teamsAssign === 1
		)
	) {
		return false;
	}

	const assignmentId = stableRouterData.assignmentId;
	const storedQuestions = localStorage.getItem("testQuestions");
	const answersKey = assignmentId
		? `assignment_${assignmentId}_answers`
		: "testUserAnswers";
	const gradesKey = assignmentId
		? `assignment_${assignmentId}_grading`
		: "testGradingResults";

	if (!storedQuestions) {
		return false;
	}

	try {
		const questions = JSON.parse(storedQuestions);
		const answersStr = localStorage.getItem(answersKey);
		const answers = answersStr ? JSON.parse(answersStr) : {};
		const gradingStr = localStorage.getItem(gradesKey);
		const grading = gradingStr ? JSON.parse(gradingStr) : {};

		if (hasInvalidQuestions(questions)) {
			clearLegacyLocalStorage(answersKey, gradesKey);
			return false;
		}

		setData(normalizeQuestionsFull(questions));
		setUserAnswers(answers);
		setGradingResults(grading);
		setRouterData({
			...stableRouterData,
			eventName:
				(stableRouterData.eventName as string | undefined) || "Assignment",
			timeLimit: (stableRouterData.timeLimit as string | undefined) || "60",
			assignmentMode: true,
		});
		setIsLoading(false);
		fetchCompletedRef.current = true;
		return true;
	} catch {
		return false;
	}
}

function loadFromNewFormat(
	assignmentId: string,
	stableRouterData: RouterParams,
	callbacks: AssignmentLoaderCallbacks,
): boolean {
	const {
		setData,
		setUserAnswers,
		setRouterData,
		setIsLoading,
		setTimeLeft,
		setIsSubmitted,
		fetchCompletedRef,
	} = callbacks;

	const assignmentKey = `assignment_${assignmentId}`;
	const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
	const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
	const storedSession = localStorage.getItem(`${assignmentKey}_session`);

	if (!(storedQuestions && storedAnswers)) {
		return false;
	}

	try {
		const questions = JSON.parse(storedQuestions);
		const answers = JSON.parse(storedAnswers);
		const session = storedSession ? JSON.parse(storedSession) : null;

		if (hasInvalidQuestions(questions)) {
			clearNewLocalStorage(assignmentKey);
			return false;
		}

		setData(normalizeQuestionsFull(questions));
		setUserAnswers(answers);

		if (session) {
			setIsSubmitted(session.isSubmitted);
			if (session.timeLeft !== undefined) {
				setTimeLeft(session.timeLeft);
			}
		}

		setRouterData({
			...stableRouterData,
			eventName: session?.eventName || "Assignment",
			timeLimit: session?.timeLimit || "60",
			assignmentMode: true,
		});

		setIsLoading(false);
		fetchCompletedRef.current = true;
		return true;
	} catch {
		return false;
	}
}

async function loadFromApi(
	assignmentId: string,
	stableRouterData: RouterParams,
	callbacks: AssignmentLoaderCallbacks,
): Promise<boolean> {
	const { setData, setRouterData, setIsLoading, fetchCompletedRef } = callbacks;

	clearTestLocalStorage();

	const response = await fetch(`/api/assignments/${assignmentId}`);
	if (!response.ok) {
		return false;
	}

	const data = await response.json();
	const assignment = data.assignment;
	const questions = assignment.questions;
	const normalized = normalizeQuestionsFull(questions);
	const assignmentKey = `assignment_${assignmentId}`;

	setData(normalized);
	setRouterData({
		...stableRouterData,
		eventName: assignment.title,
		timeLimit: "60",
		assignmentMode: true,
	});
	localStorage.setItem(
		`${assignmentKey}_questions`,
		JSON.stringify(normalized),
	);
	localStorage.setItem(
		`${assignmentKey}_session`,
		JSON.stringify({
			eventName: assignment.title,
			timeLimit: "60",
			assignmentMode: true,
			isSubmitted: false,
			timeLeft: 60 * 60,
		}),
	);

	setIsLoading(false);
	fetchCompletedRef.current = true;
	logger.log("loaded assignment questions", { count: normalized.length });
	return true;
}

export async function loadAssignment(
	stableRouterData: RouterParams,
	callbacks: AssignmentLoaderCallbacks,
): Promise<void> {
	const {
		setUserAnswers,
		setGradingResults,
		setIsSubmitted,
		setFetchError,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;

	try {
		const assignmentId = stableRouterData.assignmentId;

		// Try loading from legacy format first
		if (loadFromLegacyFormat(stableRouterData, callbacks)) {
			return;
		}

		// Try loading from new format
		if (
			assignmentId &&
			loadFromNewFormat(assignmentId, stableRouterData, callbacks)
		) {
			return;
		}

		// Fall back to API
		if (assignmentId) {
			setIsSubmitted(false);
			setUserAnswers({});
			setGradingResults({});

			if (await loadFromApi(assignmentId, stableRouterData, callbacks)) {
				return;
			}
		}
	} catch (_error) {
		setFetchError("Failed to load assignment");
		setIsLoading(false);
		fetchCompletedRef.current = true;
	}
}

export function loadViewResultsData(
	stableRouterData: RouterParams,
	callbacks: AssignmentLoaderCallbacks,
): void {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setIsLoading,
		fetchCompletedRef,
	} = callbacks;

	if (stableRouterData.viewResults === "true") {
		const assignmentKey = `assignment_${stableRouterData.assignmentId}`;
		const storedQuestions = localStorage.getItem(`${assignmentKey}_questions`);
		const storedAnswers = localStorage.getItem(`${assignmentKey}_answers`);
		const storedGrading = localStorage.getItem(`${assignmentKey}_grading`);

		if (storedQuestions) {
			try {
				const parsedQuestions = JSON.parse(storedQuestions);

				if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
					validateAssignmentQuestions(parsedQuestions);
					setData(parsedQuestions);
					setIsLoading(false);
					fetchCompletedRef.current = true;
				}
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("Assignment question")
				) {
					localStorage.removeItem(`${assignmentKey}_questions`);
					localStorage.removeItem(`${assignmentKey}_answers`);
					localStorage.removeItem(`${assignmentKey}_grading`);
				}
			}
		}

		if (storedAnswers) {
			try {
				const parsedAnswers = JSON.parse(storedAnswers);
				setUserAnswers(parsedAnswers);
			} catch (_error) {
				// Ignore errors
			}
		}

		if (storedGrading) {
			try {
				const parsedGrading = JSON.parse(storedGrading);
				setGradingResults(parsedGrading);
			} catch (_error) {
				// Ignore errors
			}
		}
	}
}
