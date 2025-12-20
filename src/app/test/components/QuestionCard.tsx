"use client";
import QuestionActions from "@/app/components/QuestionActions";
import MarkdownExplanation from "@/app/utils/MarkdownExplanation";
import type { Question } from "@/app/utils/geminiService";
import {
	calculateMCQScore,
	isMultiSelectQuestion,
} from "@/app/utils/questionUtils";
import Image from "next/image";
import { useMemo } from "react";

// Helper function to calculate option className
function getOptionClassName({
	isSubmitted,
	darkMode,
	question,
	option,
	currentAnswers,
	finalScore,
}: {
	isSubmitted: boolean;
	darkMode: boolean;
	question: Question;
	option: string;
	currentAnswers: string[];
	finalScore: number;
}): string {
	if (!isSubmitted) {
		return darkMode ? "bg-gray-700" : "bg-gray-200";
	}

	// Use the same format as normal tests: answers as numeric indices
	const correctAnswers = question.answers
		? question.answers
				.map((ans) => {
					if (typeof ans === "string") {
						if (ans === "") {
							return undefined;
						}
						return ans;
					}
					if (typeof ans === "number") {
						return question.options && ans >= 0 && ans < question.options.length
							? question.options[ans]
							: undefined;
					}
					return undefined;
				})
				.filter((text): text is string => text !== undefined)
		: [];

	const isCorrectAnswer = correctAnswers.includes(option);
	const isUserSelected = currentAnswers.includes(option);

	// Check if the question was answered correctly overall
	// Use computed score for consistency
	const isQuestionCorrect =
		finalScore === 1 || finalScore === 2 || finalScore === 3;

	// Check if the question was completely skipped (no answers provided)
	const isQuestionSkipped = !(currentAnswers.length > 0 && currentAnswers[0]);

	if (isCorrectAnswer && isUserSelected) {
		// User selected correct answer - always green
		return darkMode ? "bg-green-800" : "bg-green-200";
	}
	if (isCorrectAnswer && !isUserSelected) {
		// Correct answer that user didn't select
		if (isQuestionSkipped) {
			// If question was skipped, show correct answers in blue
			return darkMode ? "bg-blue-700" : "bg-blue-200";
		}
		if (isQuestionCorrect) {
			// If question is correct, show unselected correct answers in blue
			return darkMode ? "bg-blue-700" : "bg-blue-200";
		}
		// If question is wrong, show correct answers in green
		return darkMode ? "bg-green-800" : "bg-green-200";
	}
	if (!isCorrectAnswer && isUserSelected) {
		// User selected wrong answer - always red
		return darkMode ? "bg-red-900" : "bg-red-200";
	}
	// Neither correct nor selected - gray
	return darkMode ? "bg-gray-700" : "bg-gray-200";
}

interface QuestionCardProps {
	question: Question;
	index: number;
	userAnswers: (string | null)[];
	isSubmitted: boolean;
	darkMode: boolean;
	eventName: string;
	isBookmarked: boolean;
	gradingResults: Record<number, number>;
	explanations: Record<number, string>;
	loadingExplanation: Record<number, boolean>;
	submittedReports: Record<number, boolean>;
	submittedEdits: Record<number, boolean>;
	gradingFRQs: Record<number, boolean>;
	onAnswerChange: (
		index: number,
		answer: string | null,
		multiselect?: boolean,
	) => void;
	onBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
	onReportSubmitted: (index: number) => void;
	onEditSubmitted: (index: number) => void;
	onEdit: (question: Question) => void;
	onQuestionRemoved: (questionIndex: number) => void;
	onGetExplanation: (
		index: number,
		question: Question,
		userAnswer: (string | null)[],
	) => void;
	isOffline?: boolean;
	hideResultText?: boolean; // when true, suppress Correct/Wrong/Skipped text (used for preview)
	isAssignmentMode?: boolean;
}

export default function QuestionCard({
	question,
	index,
	userAnswers,
	isSubmitted,
	darkMode,
	eventName,
	isBookmarked,
	gradingResults,
	explanations,
	loadingExplanation,
	submittedReports,
	submittedEdits,
	gradingFRQs,
	onAnswerChange,
	onBookmarkChange,
	onReportSubmitted,
	onEditSubmitted: _onEditSubmitted,
	onEdit,
	onQuestionRemoved,
	onGetExplanation,
	isOffline,
	hideResultText = false,
	isAssignmentMode = false,
}: QuestionCardProps) {
	// Use the same format as normal tests: answers as numeric indices
	const answersForMultiSelect = question.answers || [];
	const isMultiSelect = isMultiSelectQuestion(
		question.question,
		answersForMultiSelect,
	);
	const currentAnswers = useMemo(
		() =>
			(userAnswers || []).filter((answer): answer is string => answer !== null),
		[userAnswers],
	);

	// Compute MCQ score directly from question data (single source of truth)
	// This ensures consistency between highlighting and text display
	const computedScore = useMemo(() => {
		if (!isSubmitted) {
			return undefined;
		}

		// For MCQ questions, compute score directly from question + userAnswers
		if (question.options && question.options.length > 0) {
			const score = calculateMCQScore(question, currentAnswers);
			// Validate against gradingResults if available
			const storedScore = gradingResults[index];
			if (storedScore !== undefined && Math.abs(score - storedScore) > 0.01) {
				// Score mismatch detected, using calculated score
			}
			return score;
		}

		// For FRQ questions, use gradingResults (computed asynchronously)
		return gradingResults[index] ?? undefined;
	}, [isSubmitted, question, currentAnswers, gradingResults, index]);

	// Use computed score if available, otherwise fall back to gradingResults
	const finalScore =
		computedScore !== undefined ? computedScore : (gradingResults[index] ?? 0);

	// Helper function to calculate result text and color for MCQ questions
	const calculateMCQResult = (score: number, recomputedScore: number) => {
		if (Math.abs(score - recomputedScore) > 0.01) {
			// Use recomputed score
			return getResultTextAndColor(recomputedScore);
		}
		// Scores match - use stored score
		if (!currentAnswers[0]) {
			return {
				text: isAssignmentMode ? "Wrong" : "Skipped",
				color: isAssignmentMode ? "text-red-600" : "text-blue-500",
			};
		}
		return getResultTextAndColor(score);
	};

	// Helper function to get result text and color based on score
	const getResultTextAndColor = (score: number) => {
		if (score === 1 || score === 2 || score === 3) {
			return { text: "Correct!", color: "text-green-600" };
		}
		if (score === 0) {
			return { text: "Wrong!", color: "text-red-600" };
		}
		return { text: "Partial Credit", color: "text-amber-400" };
	};

	// Helper function to calculate result for FRQ questions
	const calculateFRQResult = (score: number) => {
		if (!currentAnswers[0]) {
			return {
				text: isAssignmentMode ? "Wrong" : "Skipped",
				color: isAssignmentMode ? "text-red-600" : "text-blue-500",
			};
		}
		return getResultTextAndColor(score);
	};

	// Helper function to render result display
	const renderResultDisplay = () => {
		const isGrading = gradingFRQs[index];

		if (isGrading) {
			return <p className="mt-2 font-semibold text-blue-500">Grading...</p>;
		}

		// Use computed score for consistency with highlighting
		const score = finalScore;
		let result = { text: "", color: "" };

		// For MCQ questions, validate score matches computed value
		if (question.options && question.options.length > 0) {
			const recomputedScore = calculateMCQScore(question, currentAnswers);
			result = calculateMCQResult(score, recomputedScore);
		} else {
			result = calculateFRQResult(score);
		}

		return (
			<>
				<p className={`mt-2 font-semibold ${result.color}`}>{result.text}</p>
				{question.options?.length === 0 && (
					<p className="text-sm mt-1">
						<strong>Correct Answer(s):</strong> {(() => {
							// Handle both regular test questions and assignment questions
							if (question.answers && Array.isArray(question.answers)) {
								return question.answers.join(", ");
							}
							if ("correct_answer" in question && question.correct_answer) {
								return String(question.correct_answer);
							}
							return "No answer available";
						})()}
					</p>
				)}
			</>
		);
	};

	return (
		<div
			className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
				darkMode
					? "bg-gray-700 border-gray-600 text-white"
					: "bg-gray-50 border-gray-300 text-black"
			}`}
		>
			<div className="flex justify-between items-start">
				<h3
					className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Question {index + 1}
				</h3>
				<QuestionActions
					question={question}
					questionIndex={index}
					isBookmarked={isBookmarked}
					eventName={eventName}
					source="test"
					onBookmarkChange={onBookmarkChange}
					darkMode={darkMode}
					compact={true}
					isSubmittedReport={submittedReports[index]}
					isSubmittedEdit={submittedEdits[index]}
					onReportSubmitted={onReportSubmitted}
					_isSubmitted={isSubmitted}
					onEdit={() => onEdit(question)}
					onQuestionRemoved={onQuestionRemoved}
					isAssignmentMode={isAssignmentMode}
				/>
			</div>

			{(question.imageUrl || question.imageData) && (
				<div className="mb-4 w-full flex justify-center">
					<Image
						src={question.imageData || question.imageUrl || ""}
						alt="Mineral"
						width={512}
						height={256}
						className="max-h-64 rounded-md border object-contain"
						unoptimized
					/>
				</div>
			)}
			<p className="mb-4 break-words whitespace-normal overflow-x-auto">
				{question.question}
			</p>

			{question.options && question.options.length > 0 ? (
				<div className="space-y-2">
					{(() => {
						// Handle both regular test questions (options as strings) and assignment questions (options as objects)
						const options = question.options || [];
						const optionTexts = options.map((opt) =>
							typeof opt === "string"
								? opt
								: typeof opt === "object" && opt !== null && "text" in opt
									? (opt as { text: string }).text
									: String(opt),
						);
						return optionTexts;
					})().map((option) => (
						<label
							key={`${index}-option-${option}`}
							className={`block p-2 rounded-md ${getOptionClassName({
								isSubmitted,
								darkMode,
								question,
								option,
								currentAnswers,
								finalScore,
							})} ${!isSubmitted && (darkMode ? "hover:bg-gray-600" : "hover:bg-gray-300")}`}
						>
							<input
								type={isMultiSelect ? "checkbox" : "radio"}
								name={`question-${index}`}
								value={option}
								checked={currentAnswers.includes(option)}
								onChange={() => onAnswerChange(index, option, isMultiSelect)}
								disabled={isSubmitted}
								className="mr-2"
							/>
							{option}
						</label>
					))}
				</div>
			) : (
				<textarea
					value={currentAnswers[0] || ""}
					onChange={(e) => onAnswerChange(index, e.target.value)}
					disabled={isSubmitted}
					className={`w-full p-2 border rounded-md ${darkMode ? "bg-gray-700" : "bg-white"}`}
					rows={3}
					placeholder="Type your answer here..."
				/>
			)}

			{isSubmitted && (
				<div className="mt-2">
					{explanations[index] ? (
						<MarkdownExplanation text={explanations[index]} />
					) : (
						<button
							type="button"
							onClick={() => onGetExplanation(index, question, currentAnswers)}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
								darkMode
									? "bg-gray-700 hover:bg-gray-600 text-blue-400"
									: "bg-blue-50 hover:bg-blue-100 text-blue-600"
							}`}
							disabled={loadingExplanation[index] || isOffline}
						>
							{loadingExplanation[index] ? (
								<div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
							) : (
								<>
									<span>Explain</span>
									<svg
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<title>Get explanation</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</>
							)}
						</button>
					)}
				</div>
			)}

			{isSubmitted && !hideResultText && renderResultDisplay()}

			<br />

			{/* Difficulty Bar */}
			<div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300">
				<div
					className={`h-full rounded-full ${
						question.difficulty >= 0.66
							? "bg-red-500"
							: question.difficulty >= 0.33
								? "bg-yellow-500"
								: "bg-green-500"
					}`}
					style={{ width: `${question.difficulty * 100}%` }}
				/>
			</div>
		</div>
	);
}
