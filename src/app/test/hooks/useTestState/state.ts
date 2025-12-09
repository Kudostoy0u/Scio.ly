"use client";

import {
	handleEditSubmit as handleEditSubmitUtil,
	handleQuestionRemoved as handleQuestionRemovedUtil,
} from "@/app/test/utils/questionHandlers";
import { handleTestSubmission } from "@/app/test/utils/testSubmission";
import type { Question } from "@/app/utils/geminiService";
import {
	type Explanations,
	type LoadingExplanation,
	type RouterParams,
	getExplanation,
} from "@/app/utils/questionUtils";
import { resetTestSession } from "@/app/utils/timeManagement";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTestAnswers } from "../useTestAnswers";
import { useTestBookmarks } from "../useTestBookmarks";
import { useTestEdit } from "../useTestEdit";
import { useTestGrading } from "../useTestGrading";
import { useTestTimer } from "../useTestTimer";
import {
	useCountdown,
	usePauseOnUnmount,
	useResumeOnMount,
	useSetupVisibility,
} from "../utils/timeHooks";
import {
	useInitLoadEffect,
	useMountRestoreEffect,
	usePreviewAutofillEffect,
	useSessionTimeSyncEffect,
	useViewResultsAndAssignmentEffect,
	useWarningToastEffect,
} from "./effects";
import { clearAssignmentData } from "./helpers";
import { createReloadQuestions } from "./helpers";

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
	const { gradingResults, setGradingResults, gradingFRQs, setGradingFrQs } =
		useTestGrading(data, userAnswers, isSubmitted, routerData);

	// Use ref to store handleSubmit so it can be accessed before declaration
	const handleSubmitRef = useRef<(() => Promise<void>) | undefined>(undefined);
	const { timeLeft, setTimeLeft } = useTestTimer({
		routerData,
		isSubmitted,
		onTimeUp: () => {
			handleSubmitRef.current?.();
		},
	});

	useEffect(() => {
		if (data.length > 0) {
			// Debug logging placeholder
		}
	}, [data]);

	useViewResultsAndAssignmentEffect({
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
	});

	useMountRestoreEffect({
		initialData,
		initialRouterData,
		routerData,
		setIsMounted,
		setUserAnswers,
		setGradingResults,
	});

	usePreviewAutofillEffect({
		isPreviewMode,
		data,
		isSubmitted,
		setUserAnswers,
		setGradingResults,
		setIsSubmitted,
	});

	useSessionTimeSyncEffect({ setTimeLeft });

	useInitLoadEffect({
		stableRouterData,
		dataLength: data.length,
		isLoading,
		setTimeLeft,
		initialData,
		fetchStartedRef,
		fetchCompletedRef,
		setRouterData,
		setFetchError,
		setIsLoading,
		setData,
	});

	useWarningToastEffect(timeLeft ?? 0);

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

	// Update ref when handleSubmit changes
	useEffect(() => {
		handleSubmitRef.current = handleSubmit;
	}, [handleSubmit]);

	useCountdown(timeLeft, isSubmitted, setTimeLeft, () =>
		handleSubmitRef.current?.(),
	);
	usePauseOnUnmount();
	useResumeOnMount();
	useSetupVisibility();

	const reloadQuestions = useMemo(
		() =>
			createReloadQuestions({
				getRouterData: () => routerData,
				setIsResetting,
				setFetchError,
				setData,
			}),
		[routerData],
	);

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

	const handleBackToMainWithNavigation = useCallback(() => {
		handleBackToMain();
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
