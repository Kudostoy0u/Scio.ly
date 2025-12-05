import { updateMetrics } from "@/app/utils/metrics";
import { markTestSubmitted } from "@/app/utils/timeManagement";
import { supabase } from "@/lib/supabase";
import { useCallback } from "react";
import { toast } from "react-toastify";
import type { QuoteData } from "../types";
import { isSubstitutionCipher } from "../utils/cipherUtils";
import { calculateCipherGrade } from "../utils/gradingUtils";

interface UseTestSubmissionProps {
	quotes: QuoteData[];
	setTestScore: (score: number) => void;
	setIsTestSubmitted: (submitted: boolean) => void;
	checkSubstitutionAnswer: (index: number) => boolean;
	checkHillAnswer: (index: number) => boolean;
	checkPortaAnswer: (index: number) => boolean;
	checkBaconianAnswer: (index: number) => boolean;
	checkCheckerboardAnswer: (index: number) => boolean;
	calculateQuoteProgress: (quote: QuoteData) => number;
	assignmentId: string | null;
}

export function useTestSubmission({
	quotes,
	setTestScore,
	setIsTestSubmitted,
	checkSubstitutionAnswer,
	checkHillAnswer,
	checkPortaAnswer,
	checkBaconianAnswer,
	checkCheckerboardAnswer,
	calculateQuoteProgress,
	assignmentId,
}: UseTestSubmissionProps) {
	const checkQuoteCorrectness = useCallback(
		(quote: QuoteData, index: number): boolean => {
			if (isSubstitutionCipher(quote.cipherType)) {
				return checkSubstitutionAnswer(index);
			}
			if (quote.cipherType === "Hill 2x2" || quote.cipherType === "Hill 3x3") {
				return checkHillAnswer(index);
			}
			if (quote.cipherType === "Porta") {
				return checkPortaAnswer(index);
			}
			if (quote.cipherType === "Baconian") {
				return checkBaconianAnswer(index);
			}
			if (quote.cipherType === "Checkerboard") {
				return checkCheckerboardAnswer(index);
			}
			return false;
		},
		[
			checkSubstitutionAnswer,
			checkHillAnswer,
			checkPortaAnswer,
			checkBaconianAnswer,
			checkCheckerboardAnswer,
		],
	);

	const calculateTestScore = useCallback((): number => {
		let correctCount = 0;
		quotes.forEach((quote: QuoteData, index: number) => {
			if (checkQuoteCorrectness(quote, index)) {
				correctCount++;
			}
		});
		return (correctCount / Math.max(1, quotes.length)) * 100;
	}, [quotes, checkQuoteCorrectness]);

	const calculateCodebustersPoints = useCallback(() => {
		let totalPointsEarned = 0;
		let totalPointsAttempted = 0;
		let totalInputs = 0;
		quotes.forEach((quote: QuoteData, quoteIndex: number) => {
			const gradeResult = calculateCipherGrade(quote, quoteIndex, {}, {});
			totalPointsEarned += gradeResult.score;
			totalPointsAttempted += gradeResult.attemptedScore;
			totalInputs += gradeResult.totalInputs;
		});
		return {
			totalPointsEarned: Math.round(totalPointsEarned),
			totalPointsAttempted: Math.round(totalPointsAttempted),
			totalInputs: totalInputs,
		};
	}, [quotes]);

	const updateUserMetrics = useCallback(
		async (codebustersPoints: {
			totalPointsEarned: number;
			totalPointsAttempted: number;
			totalInputs: number;
		}) => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				await updateMetrics(user?.id || null, {
					questionsAttempted: Math.round(
						codebustersPoints.totalPointsAttempted,
					),
					correctAnswers: Math.round(codebustersPoints.totalPointsEarned),
					eventName: "Codebusters",
				});
			} catch {
				// Ignore errors when saving test state
			}
		},
		[],
	);

	const submitAssignmentResults = useCallback(
		async (
			assignmentId: string,
			quotes: QuoteData[],
			score: number,
			codebustersPoints: {
				totalPointsEarned: number;
				totalPointsAttempted: number;
				totalInputs: number;
			},
		) => {
			try {
				const submissionData = {
					assignmentId: assignmentId,
					answers: quotes.map((quote: QuoteData, index: number) => ({
						questionId: quote.id,
						answer: quote.solution || "",
						isCorrect: checkQuoteCorrectness(quote, index),
						points: quote.points || 10,
						timeSpent: 0,
						progress: calculateQuoteProgress(quote),
						difficulty:
							typeof quote.difficulty === "number" ? quote.difficulty : 0.5,
					})),
					totalScore: score,
					timeSpent: 0,
					submittedAt: new Date().toISOString(),
					isDynamicCodebusters: true,
					codebustersPoints: codebustersPoints,
				};

				const response = await fetch(
					`/api/assignments/${assignmentId}/submit`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(submissionData),
					},
				);

				if (response.ok) {
					toast.success("Assignment submitted successfully!");
					const url = new URL(window.location.href);
					url.searchParams.delete("assignment");
					window.history.replaceState({}, "", url.pathname + url.search);
				} else {
					toast.error("Failed to submit assignment");
				}
			} catch (_error) {
				toast.error("Error submitting assignment");
			}
		},
		[checkQuoteCorrectness, calculateQuoteProgress],
	);

	const handleSubmitTest = useCallback(async () => {
		const score = calculateTestScore();
		setTestScore(score);
		setIsTestSubmitted(true);
		setTimeout(() => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}, 200);
		markTestSubmitted();
		const codebustersPoints = calculateCodebustersPoints();
		await updateUserMetrics(codebustersPoints);
		if (assignmentId) {
			await submitAssignmentResults(
				assignmentId,
				quotes,
				score,
				codebustersPoints,
			);
		}
	}, [
		calculateTestScore,
		setTestScore,
		setIsTestSubmitted,
		calculateCodebustersPoints,
		updateUserMetrics,
		assignmentId,
		quotes,
		submitAssignmentResults,
	]);

	return {
		handleSubmitTest,
		checkQuoteCorrectness,
		calculateTestScore,
		calculateCodebustersPoints,
	};
}
