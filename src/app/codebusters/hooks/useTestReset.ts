import {
	clearTestSession,
	initializeTestSession,
} from "@/app/utils/timeManagement";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { useCallback } from "react";
import type React from "react";
import { loadQuestionsFromDatabase } from "../services/questionLoader";
import type { QuoteData } from "../types";

interface UseTestResetProps {
	setIsResetting: (resetting: boolean) => void;
	setIsTestSubmitted: (submitted: boolean) => void;
	setTestScore: (score: number | null) => void;
	setTimeLeft: (time: number) => void;
	setActiveHints: (hints: { [key: number]: boolean }) => void;
	setRevealedLetters: (letters: {
		[key: number]: { [letter: string]: string };
	}) => void;
	setHintedLetters: React.Dispatch<
		React.SetStateAction<{ [key: number]: { [letter: string]: boolean } }>
	>;
	setHintCounts: (counts: { [key: number]: number }) => void;
	setQuotes: (quotes: QuoteData[]) => void;
	setIsLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	loadPreferences: (eventName: string) => {
		questionCount: number;
		timeLimit: number;
	};
}

export function useTestReset({
	setIsResetting,
	setIsTestSubmitted,
	setTestScore,
	setTimeLeft,
	setActiveHints,
	setRevealedLetters,
	setHintedLetters,
	setHintCounts,
	setQuotes,
	setIsLoading,
	setError,
	loadPreferences,
}: UseTestResetProps) {
	const clearCodebustersStorage = useCallback(() => {
		const itemsToRemove = [
			"codebustersQuotes",
			"codebustersQuoteIndices",
			"codebustersQuoteUUIDs",
			"codebustersShareData",
			"codebustersIsTestSubmitted",
			"codebustersTestScore",
			"codebustersTimeLeft",
			"codebustersRevealedLetters",
			"codebustersHintedLetters",
			"codebustersHintCounts",
			"shareCode",
		];
		for (const item of itemsToRemove) {
			SyncLocalStorage.removeItem(item);
		}
		SyncLocalStorage.setItem("codebustersForceRefresh", "true");
	}, []);

	const resetTestState = useCallback(
		(timeLimit: number) => {
			setIsResetting(true);
			setIsTestSubmitted(false);
			setTestScore(null);
			setTimeLeft(timeLimit * 60);
			setActiveHints({});
			setRevealedLetters({});
			setHintedLetters({});
			setHintCounts({});
		},
		[
			setIsResetting,
			setIsTestSubmitted,
			setTestScore,
			setTimeLeft,
			setActiveHints,
			setRevealedLetters,
			setHintedLetters,
			setHintCounts,
		],
	);

	const handleReset = useCallback(() => {
		const testParams = JSON.parse(
			SyncLocalStorage.getItem("testParams") || "{}",
		);
		const eventName = testParams.eventName || "Codebusters";
		const preferences = loadPreferences(eventName);
		const timeLimit =
			Number.parseInt(testParams.timeLimit) || preferences.timeLimit;
		clearCodebustersStorage();
		clearTestSession();
		initializeTestSession(eventName, timeLimit, false);
		resetTestState(timeLimit);
		const customSetLoading = (loading: boolean) => {
			if (!loading) {
				setIsLoading(false);
			}
		};
		const customSetQuotes = (newQuotes: QuoteData[]) => {
			setQuotes(newQuotes);
			setIsResetting(false);
		};
		loadQuestionsFromDatabase(
			customSetLoading,
			setError,
			customSetQuotes,
			setTimeLeft,
			setIsTestSubmitted,
			setTestScore,
			loadPreferences,
		);
	}, [
		loadPreferences,
		clearCodebustersStorage,
		resetTestState,
		setQuotes,
		setIsLoading,
		setError,
		setTimeLeft,
		setIsTestSubmitted,
		setTestScore,
		setIsResetting,
	]);

	return {
		handleReset,
	};
}
