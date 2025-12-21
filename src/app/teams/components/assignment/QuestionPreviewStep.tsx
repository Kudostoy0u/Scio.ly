"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Question, QuestionPreviewStepProps } from "./assignmentTypes";

export default function QuestionPreviewStep({
	onNext,
	onBack,
	questions,
	showAnswers,
	onShowAnswersChange,
	onReplaceQuestion,
}: Omit<QuestionPreviewStepProps, "darkMode">) {
	const { darkMode } = useTheme();

	// Helper functions to reduce cognitive complexity
	const getDifficultyBadge = (difficulty: number) => {
		if (difficulty <= 0.4) {
			return {
				text: "Easy",
				className: darkMode
					? "bg-green-800/40 text-green-300"
					: "bg-green-100 text-green-700",
			};
		}
		if (difficulty <= 0.7) {
			return {
				text: "Medium",
				className: darkMode
					? "bg-yellow-800/40 text-yellow-300"
					: "bg-yellow-100 text-yellow-700",
			};
		}
		return {
			text: "Hard",
			className: darkMode
				? "bg-red-800/40 text-red-300"
				: "bg-red-100 text-red-700",
		};
	};

	const renderQuestionHeader = (question: Question, index: number) => (
		<div className="flex justify-between items-start mb-2">
			<div className="flex items-center gap-2">
				<span
					className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					Q{index + 1} ({question.question_type})
				</span>
				{question.difficulty && (
					<span
						className={`text-xs px-2 py-1 rounded-full ${getDifficultyBadge(question.difficulty).className}`}
					>
						{getDifficultyBadge(question.difficulty).text}
					</span>
				)}
			</div>
			<button
				type="button"
				onClick={() => onReplaceQuestion(index)}
				className="text-xs text-blue-600 hover:text-blue-800"
			>
				Replace
			</button>
		</div>
	);

	const renderQuestionContent = (question: Question) => (
		<>
			<p
				className={`text-sm mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				{question.question_text}
			</p>
			{question.question_type === "codebusters" && question.author && (
				<div
					className={`text-xs mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
				>
					- {question.author}
				</div>
			)}
			{question.question_type === "codebusters" && question.cipherType && (
				<div
					className={`text-xs mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					Cipher: {question.cipherType}
				</div>
			)}
			{question.imageData && (
				<Image
					src={question.imageData}
					alt="Question"
					width={800}
					height={400}
					className="max-h-48 max-w-full rounded-md border object-contain"
				/>
			)}
		</>
	);

	const renderOptions = (question: Question) => {
		if (!question.options) {
			return null;
		}

		return (
			<div className="mt-2 space-y-1">
				{question.options.map(
					(
						option: { id: string; text: string; isCorrect: boolean } | string,
						optIndex: number,
					) => {
						// Handle both old format (objects with isCorrect) and new format (strings with answers array)
						let isCorrect = false;
						if (showAnswers) {
							if (typeof option === "object" && option.isCorrect) {
								isCorrect = true;
							} else if (question.answers) {
								// Check if answers array contains this option index
								const answersArray = Array.isArray(question.answers)
									? question.answers
									: [question.answers];
								// Check both string and number formats
								isCorrect =
									answersArray.includes(optIndex) ||
									answersArray.includes(optIndex.toString()) ||
									answersArray.includes(String(optIndex));
							}
						}

						const optionText =
							typeof option === "object" ? option.text : option;

						return (
							<div
								key={`option-${optIndex}-${optionText?.slice(0, 10)}`}
								className={`text-xs p-2 rounded flex items-center ${
									isCorrect
										? darkMode
											? "bg-green-800/20 text-green-300"
											: "bg-green-50 text-green-700"
										: darkMode
											? "bg-gray-600 text-gray-300"
											: "bg-gray-100 text-gray-700"
								}`}
							>
								<span className="flex-grow">{optionText}</span>
								{isCorrect && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className={`h-4 w-4 ml-2 ${darkMode ? "text-green-400" : "text-green-600"}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										role="img"
										aria-label="Correct answer"
									>
										<title>Correct answer</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								)}
							</div>
						);
					},
				)}
			</div>
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			className="space-y-4"
		>
			<div className="flex justify-between items-center">
				<h3
					className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Question Preview ({questions.length} questions)
				</h3>
				<label className="flex items-center space-x-2">
					<input
						type="checkbox"
						checked={showAnswers}
						onChange={(e) => onShowAnswersChange(e.target.checked)}
						className="rounded"
					/>
					<span
						className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Show Answers
					</span>
				</label>
			</div>

			<div className="max-h-96 overflow-y-auto space-y-3">
				{questions.map((question, index) => (
					<div
						key={`question-${index}-${question.question_text?.slice(0, 20)}`}
						className={`p-3 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}
					>
						{renderQuestionHeader(question, index)}

						{renderQuestionContent(question)}

						{renderOptions(question)}

						{question.question_type === "free_response" &&
							showAnswers &&
							question.answers &&
							(Array.isArray(question.answers)
								? question.answers.length > 0
								: Boolean(question.answers)) && (
								<div
									className={`mt-3 p-3 rounded-lg border ${
										darkMode
											? "bg-green-800/20 border-green-600/30"
											: "bg-green-50 border-green-200"
									}`}
								>
									<div
										className={`text-xs font-medium mb-1 ${
											darkMode ? "text-green-300" : "text-green-700"
										}`}
									>
										Correct Answer:
									</div>
									<div
										className={`text-sm ${darkMode ? "text-green-200" : "text-green-800"}`}
									>
										{Array.isArray(question.answers)
											? question.answers.join(", ")
											: String(question.answers)}
									</div>
								</div>
							)}
					</div>
				))}
			</div>

			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					className={`px-4 py-2 border rounded-lg ${
						darkMode
							? "border-gray-600 text-gray-300 hover:bg-gray-800"
							: "border-gray-300 text-gray-700 hover:bg-gray-50"
					}`}
				>
					Back
				</button>
				<button
					type="button"
					onClick={onNext}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Next: Select Roster
				</button>
			</div>
		</motion.div>
	);
}
