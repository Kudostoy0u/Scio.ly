import type { Question } from "@/app/utils/geminiService";
import type {
	Explanations,
	GradingResults,
	LoadingExplanation,
	RouterParams,
} from "@/app/utils/questionUtils";
import logger from "@/lib/utils/logging/logger";
import type React from "react";
import { removeQuestionAtIndex } from "../hooks/utils/questionMaintenance";
import { fetchReplacementQuestion } from "../hooks/utils/replacement";

export interface QuestionHandlersCallbacks {
	setData: React.Dispatch<React.SetStateAction<Question[]>>;
	setUserAnswers: React.Dispatch<
		React.SetStateAction<Record<number, (string | null)[] | null>>
	>;
	setGradingResults: React.Dispatch<React.SetStateAction<GradingResults>>;
	setExplanations: React.Dispatch<React.SetStateAction<Explanations>>;
	setLoadingExplanation: React.Dispatch<
		React.SetStateAction<LoadingExplanation>
	>;
	setSubmittedReports: React.Dispatch<
		React.SetStateAction<Record<number, boolean>>
	>;
	setSubmittedEdits: React.Dispatch<
		React.SetStateAction<Record<number, boolean>>
	>;
}

export async function handleQuestionRemoved(
	questionIndex: number,
	data: Question[],
	routerData: RouterParams,
	userAnswers: Record<number, (string | null)[] | null>,
	gradingResults: GradingResults,
	explanations: Explanations,
	loadingExplanation: LoadingExplanation,
	callbacks: QuestionHandlersCallbacks,
): Promise<void> {
	const {
		setData,
		setUserAnswers,
		setGradingResults,
		setExplanations,
		setLoadingExplanation,
		setSubmittedReports,
		setSubmittedEdits,
	} = callbacks;

	const fetchReplacement = async (): Promise<Question | null> =>
		fetchReplacementQuestion(routerData as Record<string, unknown>, data);

	const replacement = await fetchReplacement();
	if (replacement) {
		setData((prevData) => {
			const newData = [...prevData];
			newData[questionIndex] = replacement;
			setTimeout(() => {
				localStorage.setItem("testQuestions", JSON.stringify(newData));
			}, 0);
			return newData;
		});

		setUserAnswers((prev) => ({ ...prev, [questionIndex]: null }));
		setGradingResults((prev) => ({ ...prev, [questionIndex]: 0 }));
		setExplanations((prev) => {
			const c = { ...prev };
			delete c[questionIndex];
			return c;
		});
		setLoadingExplanation((prev) => {
			const c = { ...prev };
			delete c[questionIndex];
			return c;
		});
		setSubmittedReports((prev) => {
			const c = { ...prev };
			delete c[questionIndex];
			return c;
		});
		setSubmittedEdits((prev) => {
			const c = { ...prev };
			delete c[questionIndex];
			return c;
		});
	} else {
		const { newData, newAnswers, newResults, newExplanations, newLoading } =
			removeQuestionAtIndex(
				data,
				questionIndex,
				userAnswers,
				gradingResults,
				explanations,
				loadingExplanation,
			);
		setData(newData);
		setUserAnswers(newAnswers);
		setGradingResults(newResults);
		setExplanations(newExplanations);
		setLoadingExplanation(newLoading);
		setTimeout(() => {
			localStorage.setItem("testQuestions", JSON.stringify(newData));
			localStorage.setItem("testUserAnswers", JSON.stringify(newAnswers));
		}, 0);
	}
}

export async function handleEditSubmit(
	editedQuestion: Question,
	reason: string,
	originalQuestion: Question,
	data: Question[],
	editingQuestion: Question | null,
	routerData: RouterParams,
	callbacks: {
		setData: React.Dispatch<React.SetStateAction<Question[]>>;
		handleEditSubmitted: (index: number) => void;
	},
	aiBypass?: boolean,
	aiSuggestion?: {
		question: string;
		options?: string[];
		answers: string[];
		answerIndices?: number[];
	},
): Promise<{ success: boolean; message: string; reason: string }> {
	try {
		logger.log(
			"🔍 [TEST] Edit submit with aiBypass:",
			aiBypass,
			"aiSuggestion:",
			aiSuggestion,
		);
		const apiModule = await import("@/app/api");
		const api = apiModule.default;
		const response = await fetch(api.reportEdit, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				originalQuestion: originalQuestion,
				editedQuestion: editedQuestion,
				reason: reason,
				event: routerData.eventName,
				bypass: !!aiBypass,
				aiSuggestion,
			}),
		});

		const result = await response.json();

		if (result.success) {
			if (editingQuestion) {
				const questionIndex = data.findIndex(
					(q) => q.question === editingQuestion.question,
				);
				if (questionIndex !== -1) {
					callbacks.setData((prevData) => {
						const newData = [...prevData];
						newData[questionIndex] = editedQuestion;
						return newData;
					});

					localStorage.setItem(
						"testQuestions",
						JSON.stringify(
							data.map((q, idx) =>
								idx === questionIndex ? editedQuestion : q,
							),
						),
					);

					callbacks.handleEditSubmitted(questionIndex);
				}
			}
			return {
				success: true,
				message: result.message || "Edit submitted successfully!",
				reason: result.message || "Edit submitted successfully!",
			};
		}
		return {
			success: false,
			message: result.message || "Failed to submit edit",
			reason: result.message || "Failed to submit edit",
		};
	} catch (error) {
		logger.error("Error submitting edit:", error);
		return {
			success: false,
			message: "An unexpected error occurred. Please try again.",
			reason: "An unexpected error occurred. Please try again.",
		};
	}
}
