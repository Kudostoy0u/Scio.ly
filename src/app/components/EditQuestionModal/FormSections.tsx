"use client";
import type { Question } from "@/app/utils/geminiService";
import Image from "next/image";

interface FormSectionsProps {
	darkMode: boolean;
	editedQuestion: string;
	setEditedQuestion: (value: string) => void;
	difficulty: number;
	setDifficulty: (value: number) => void;
	isFrq: boolean;
	setIsFrq: (value: boolean) => void;
	editedOptions: string[];
	correctAnswers: number[];
	canEditAnswers: boolean;
	frqAnswer: string;
	setFrqAnswer: (value: string) => void;
	addOption: () => void;
	removeOption: (index: number) => void;
	updateOption: (index: number, value: string) => void;
	toggleCorrectAnswer: (index: number) => void;
	reason: string;
	setReason: (value: string) => void;
	currentImageUrl: string;
	question?: Question;
}

export function FormSections({
	darkMode,
	editedQuestion,
	setEditedQuestion,
	difficulty,
	setDifficulty,
	isFrq,
	setIsFrq,
	editedOptions,
	correctAnswers,
	canEditAnswers,
	frqAnswer,
	setFrqAnswer,
	addOption,
	removeOption,
	updateOption,
	toggleCorrectAnswer,
	reason,
	setReason,
	currentImageUrl,
	question,
}: FormSectionsProps) {
	const hasImage = currentImageUrl || question?.imageData || question?.imageUrl;

	const getDifficultyColor = (diff: number): string => {
		if (diff < 0.3) {
			return "rgb(34, 197, 94)";
		}
		if (diff < 0.7) {
			return "rgb(234, 179, 8)";
		}
		return "rgb(239, 68, 68)";
	};

	const getDifficultyLabel = (diff: number): string => {
		if (diff < 0.3) {
			return "Easy";
		}
		if (diff < 0.7) {
			return "Medium";
		}
		return "Hard";
	};

	const getDifficultyBadgeClasses = (diff: number): string => {
		if (diff < 0.3) {
			return darkMode
				? "bg-green-800 text-green-200"
				: "bg-green-100 text-green-800";
		}
		if (diff < 0.7) {
			return darkMode
				? "bg-yellow-800 text-yellow-200"
				: "bg-yellow-100 text-yellow-800";
		}
		return darkMode ? "bg-red-800 text-red-200" : "bg-red-100 text-red-800";
	};

	const diffColor = getDifficultyColor(difficulty);

	return (
		<div className="space-y-4">
			{/* Image Section */}
			{hasImage && (
				<div className="mb-6">
					<div className="block mb-2 font-medium">Question Image</div>
					<div
						className={`p-4 rounded-lg border-2 border-dashed ${
							darkMode
								? "border-gray-600 bg-gray-700/50"
								: "border-gray-300 bg-gray-50"
						}`}
					>
						<div className="mb-2">
							{(currentImageUrl ||
								question?.imageData ||
								question?.imageUrl) && (
								<Image
									src={
										currentImageUrl ||
										question?.imageData ||
										question?.imageUrl ||
										""
									}
									alt="Question"
									width={512}
									height={256}
									className="max-h-64 rounded-md mx-auto object-contain"
									unoptimized
								/>
							)}
						</div>
						<p className="text-xs text-gray-500 text-center">
							Image is permanent and cannot be changed
						</p>
					</div>
				</div>
			)}

			{/* Question Text */}
			<div>
				<label htmlFor="edit-question-text" className="block mb-2 font-medium">
					Question
				</label>
				<textarea
					id="edit-question-text"
					className={`w-full p-3 border rounded-md ${
						darkMode
							? "bg-gray-700 text-white border-gray-600 focus:border-blue-500"
							: "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
					}`}
					rows={4}
					placeholder="Enter your edited version of the question..."
					value={editedQuestion}
					onChange={(e) => setEditedQuestion(e.target.value)}
					required={true}
				/>
			</div>

			{/* Difficulty Slider */}
			<div>
				<div className="block mb-2 font-medium">Difficulty</div>
				<div className="flex items-center">
					<span className="text-sm w-10">Easy</span>
					<div className="relative w-48 mx-2 h-6">
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={difficulty}
							onChange={(e) => {
								const value = Number.parseFloat(e.target.value);
								setDifficulty(value === 0 ? 0.1 : value);
							}}
							className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
							style={{
								background: `linear-gradient(to right, 
                    ${diffColor} 0%, 
                    ${diffColor} ${difficulty * 100}%, 
                    rgb(209, 213, 219) ${difficulty * 100}%, 
                    rgb(209, 213, 219) 100%)`,
							}}
						/>
					</div>
					<span className="text-sm w-10">Hard</span>
					<div className="ml-2">
						<div
							className={`w-16 text-center px-2 py-1 rounded text-xs ${getDifficultyBadgeClasses(difficulty)}`}
						>
							{getDifficultyLabel(difficulty)}
						</div>
					</div>
				</div>
			</div>

			{/* Question Type Toggle */}
			<div>
				<div className="block mb-2 font-medium">Question Type</div>
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={() => setIsFrq(false)}
						className={`px-4 py-2 rounded-md ${
							isFrq
								? darkMode
									? "bg-gray-700 text-gray-300 hover:bg-gray-600"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
								: "bg-blue-500 text-white"
						}`}
					>
						Multiple Choice
					</button>
					<button
						type="button"
						onClick={() => setIsFrq(true)}
						className={`px-4 py-2 rounded-md ${
							isFrq
								? "bg-blue-500 text-white"
								: darkMode
									? "bg-gray-700 text-gray-300 hover:bg-gray-600"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
					>
						Free Response
					</button>
				</div>
			</div>

			{/* Answers Section */}
			{isFrq ? (
				<div>
					<label htmlFor="edit-frq-answer" className="block mb-2 font-medium">
						Correct Answer
					</label>
					{!canEditAnswers && (
						<p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
							💡 Answers are hidden during test
						</p>
					)}
					<textarea
						id="edit-frq-answer"
						className={`w-full p-3 border rounded-md ${
							canEditAnswers
								? darkMode
									? "bg-gray-700 text-white border-gray-600 focus:border-blue-500"
									: "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
								: darkMode
									? "bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed"
									: "bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed"
						}`}
						rows={3}
						placeholder={
							canEditAnswers
								? "Enter the correct answer for this free response question..."
								: "Answer editing disabled during test"
						}
						value={frqAnswer}
						onChange={(e) => canEditAnswers && setFrqAnswer(e.target.value)}
						required={canEditAnswers}
						disabled={!canEditAnswers}
					/>
				</div>
			) : (
				<div>
					<div className="block mb-2 font-medium">Answer Options</div>
					{!canEditAnswers && (
						<p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
							💡 Answers are hidden during test
						</p>
					)}
					<div className="space-y-2">
						{editedOptions.map((option, index) => (
							<div
								key={`option-${index}-${option.slice(0, 10)}`}
								className="flex items-center gap-2"
							>
								<input
									type="checkbox"
									checked={correctAnswers.includes(index)}
									onChange={() => canEditAnswers && toggleCorrectAnswer(index)}
									className={`mr-2 ${canEditAnswers ? "" : "cursor-not-allowed opacity-50"}`}
									disabled={!canEditAnswers}
								/>
								<input
									type="text"
									value={option}
									onChange={(e) => updateOption(index, e.target.value)}
									className={`flex-1 p-2 border rounded-md ${
										darkMode
											? "bg-gray-700 text-white border-gray-600"
											: "bg-white text-gray-900 border-gray-300"
									}`}
									placeholder={`Option ${index + 1}`}
								/>
								<button
									type="button"
									onClick={() => removeOption(index)}
									className="text-red-500 hover:text-red-700 px-2"
								>
									×
								</button>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={addOption}
						className={`mt-2 px-3 py-1 rounded-md text-sm ${
							darkMode
								? "bg-gray-700 hover:bg-gray-600 text-white"
								: "bg-gray-100 hover:bg-gray-200 text-gray-900"
						}`}
					>
						+ Add Option
					</button>
					{editedOptions.length > 0 && canEditAnswers && (
						<p className="mt-2 text-sm text-gray-500">
							Check the boxes next to the correct answer(s)
						</p>
					)}
				</div>
			)}

			{/* Reason for Edit */}
			<div>
				<label htmlFor="edit-reason" className="block mb-2 font-medium">
					Reason for Edit (optional)
				</label>
				<textarea
					id="edit-reason"
					className={`w-full p-3 border rounded-md ${
						darkMode
							? "bg-gray-700 text-white border-gray-600 focus:border-blue-500"
							: "bg-white text-gray-900 border-gray-300 focus:border-blue-400"
					}`}
					rows={3}
					placeholder="Please explain why you're making this edit... (optional)"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
				/>
			</div>
		</div>
	);
}
