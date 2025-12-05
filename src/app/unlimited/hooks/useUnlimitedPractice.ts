import { fetchQuestionsForParams } from "@/app/test/hooks/utils/fetchQuestions";
import type { Question } from "@/app/utils/geminiService";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { useCallback, useRef, useState } from "react";
import { deduplicateQuestions, shuffleQuestions } from "../utils/batchHelpers";

export const useUnlimitedPractice = (batchSize: number) => {
	const [data, setData] = useState<Question[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answeredInBatch, setAnsweredInBatch] = useState(0);
	const fetchStartedRef = useRef(false);

	const loadBatch = useCallback(
		async (routerParams: Record<string, unknown>) => {
			try {
				fetchStartedRef.current = true;
				let questions = await fetchQuestionsForParams(routerParams, batchSize);

				const arr = shuffleQuestions(questions);
				const deduped = deduplicateQuestions(arr);

				questions = deduped;
				setData(questions);
				setCurrentQuestionIndex(0);
				setAnsweredInBatch(0);
				const serialized = JSON.stringify(questions, (key, value) =>
					key === "imageData" ? undefined : value,
				);
				SyncLocalStorage.setItem("unlimitedQuestions", serialized);
				setIsLoading(false);
			} catch {
				setFetchError("Failed to load questions. Please try again later.");
				setIsLoading(false);
			} finally {
				fetchStartedRef.current = true;
			}
		},
		[batchSize],
	);

	return {
		data,
		setData,
		isLoading,
		setIsLoading,
		fetchError,
		setFetchError,
		currentQuestionIndex,
		setCurrentQuestionIndex,
		answeredInBatch,
		setAnsweredInBatch,
		fetchStartedRef,
		loadBatch,
	};
};
