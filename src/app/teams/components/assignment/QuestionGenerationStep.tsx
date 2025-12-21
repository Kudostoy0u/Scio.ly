"use client";

import { getAvailableCipherTypes } from "@/app/codebusters/services/utils/cipherMapping";
import QuoteLengthSlider from "@/app/practice/components/QuoteLengthSlider";
import { getEventSubtopics } from "@/lib/constants/subtopics";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { QuestionGenerationStepProps } from "./assignmentTypes";

export default function QuestionGenerationStep({
	darkMode,
	onNext,
	onBack,
	onError,
	settings,
	onSettingsChange,
	supportsPictureQuestions,
	supportsIdentificationOnly,
	onGenerateQuestions: _onGenerateQuestions,
	generatingQuestions,
	eventName,
}: QuestionGenerationStepProps) {
	const [availableSubtopics, setAvailableSubtopics] = useState<string[]>([]);
	const [loadingSubtopics, setLoadingSubtopics] = useState(false);
	const isCodebusters = eventName === "Codebusters";
	const isRocksAndMinerals =
		eventName === "Rocks and Minerals" ||
		eventName?.split(" - ")[0] === "Rocks and Minerals";

	// Load subtopics when event name changes (now synchronous, no API call)
	useEffect(() => {
		if (eventName && !isCodebusters) {
			setLoadingSubtopics(false); // No loading needed since it's synchronous
			const subtopics = getEventSubtopics(eventName);
			setAvailableSubtopics(subtopics);
			return;
		}
		setAvailableSubtopics([]);
	}, [eventName, isCodebusters]);

	const availableCipherTypes = isCodebusters
		? getAvailableCipherTypes([], settings.division || "any")
		: [];
	const handleNext = () => {
		const error = validateSettings();
		if (error) {
			onError(error);
			return;
		}

		// The parent component will handle question generation
		onNext();
	};

	const validateSettings = () => {
		if (settings.questionCount < 1 || settings.questionCount > 50) {
			return "Question count must be between 1 and 50";
		}
		if (settings.difficulties.length === 0) {
			return "Please select at least one difficulty level";
		}
		return null;
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			className="space-y-4"
		>
			<h3
				className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Question Generation
			</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="question-count"
						className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Question Count
					</label>
					<input
						id="question-count"
						type="number"
						value={settings.questionCount}
						onChange={(e) =>
							onSettingsChange({
								questionCount: Number.parseInt(e.target.value) || 0,
							})
						}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
						min="1"
						max="50"
					/>
				</div>
				<div>
					<label
						htmlFor="division"
						className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Division
					</label>
					<select
						id="division"
						value={settings.division || "any"}
						onChange={(e) =>
							onSettingsChange({
								division: e.target.value as "B" | "C" | "any",
							})
						}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
					>
						<option value="any">Any</option>
						<option value="B">Division B</option>
						<option value="C">Division C</option>
					</select>
				</div>
			</div>

			{/* Question Type / Difficulty / Codebusters length */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{!isCodebusters && (
					<div>
						<label
							htmlFor="question-type-mcq"
							className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Question Type
						</label>
						<div className="flex gap-4">
							{[
								{ value: "mcq", label: "MCQ" },
								{ value: "both", label: "Both" },
								{ value: "frq", label: "FRQ" },
							].map((type) => (
								<label key={type.value} className="flex items-center">
									<input
										id={type.value === "mcq" ? "question-type-mcq" : undefined}
										type="radio"
										name="questionType"
										value={type.value}
										checked={settings.questionType === type.value}
										onChange={(e) => {
											const value = e.target.value;
											if (
												value === "mcq" ||
												value === "frq" ||
												value === "both"
											) {
												onSettingsChange({
													questionType: value as "mcq" | "frq" | "both",
												});
											}
										}}
										className="mr-2"
									/>
									<span className={darkMode ? "text-white" : "text-gray-900"}>
										{type.label}
									</span>
								</label>
							))}
						</div>
					</div>
				)}

				<div>
					<label
						htmlFor="difficulty-any"
						className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Difficulty Levels
					</label>
					<div className="flex gap-4">
						{[
							{ value: "any", label: "Any" },
							{ value: "easy", label: "Easy" },
							{ value: "medium", label: "Medium" },
							{ value: "hard", label: "Hard" },
						].map((difficulty) => (
							<label key={difficulty.value} className="flex items-center">
								<input
									id={difficulty.value === "any" ? "difficulty-any" : undefined}
									type="checkbox"
									checked={settings.difficulties.includes(difficulty.value)}
									onChange={(e) => {
										if (e.target.checked) {
											if (difficulty.value === "any") {
												// If "Any" is selected, clear all other selections
												onSettingsChange({ difficulties: ["any"] });
											} else {
												// If a specific difficulty is selected, remove "any" and add the difficulty
												const newDifficulties = settings.difficulties.filter(
													(d) => d !== "any",
												);
												onSettingsChange({
													difficulties: [...newDifficulties, difficulty.value],
												});
											}
										} else {
											onSettingsChange({
												difficulties: settings.difficulties.filter(
													(d) => d !== difficulty.value,
												),
											});
										}
									}}
									className="mr-2"
								/>
								<span className={darkMode ? "text-white" : "text-gray-900"}>
									{difficulty.label}
								</span>
							</label>
						))}
					</div>
					{settings.difficulties.length === 0 && (
						<p
							className={`text-sm mt-1 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}
						>
							Please select at least one difficulty level
						</p>
					)}
				</div>

				{isCodebusters && (
					<div>
						<label
							htmlFor="quote-length-slider"
							className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Quote Character Length Range
						</label>
						<QuoteLengthSlider
							id="quote-length-slider"
							min={1}
							max={200}
							value={[
								settings.charLengthMin ?? 1,
								settings.charLengthMax ?? 100,
							]}
							onValueChange={([minValue, maxValue]) => {
								onSettingsChange({
									charLengthMin: minValue,
									charLengthMax: maxValue,
								});
							}}
						/>
					</div>
				)}
			</div>

			{/* Picture Questions slider for events with image ID */}
			{supportsPictureQuestions && (
				<div>
					<label
						htmlFor="idPercentage"
						className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Picture Questions
					</label>
					<div className="flex items-center gap-3">
						<input
							type="range"
							id="idPercentage"
							min={0}
							max={settings.questionCount}
							value={settings.idPercentage}
							onChange={(e) =>
								onSettingsChange({
									idPercentage: Number.parseInt(e.target.value),
								})
							}
							className="flex-1"
						/>
						<span
							className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							{settings.idPercentage} questions
						</span>
					</div>
				</div>
			)}

			{/* Identification Only checkbox */}
			{supportsIdentificationOnly && (
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="pureIdOnly"
						checked={settings.pureIdOnly}
						onChange={(e) => onSettingsChange({ pureIdOnly: e.target.checked })}
						className="rounded"
					/>
					<label
						htmlFor="pureIdOnly"
						className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Identification Only Mode
					</label>
				</div>
			)}

			{/* Rocks and Minerals filter */}
			{isRocksAndMinerals && (
				<div>
					<label
						htmlFor="rmTypeFilter"
						className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Rock/Mineral Filter
					</label>
					<select
						id="rmTypeFilter"
						value={settings.rmTypeFilter || ""}
						onChange={(e) =>
							onSettingsChange({
								rmTypeFilter: e.target.value
									? (e.target.value as "rock" | "mineral")
									: undefined,
							})
						}
						className={`w-full px-3 py-2 border rounded-lg ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white"
								: "bg-white border-gray-300 text-gray-900"
						}`}
					>
						<option value="">Any</option>
						<option value="rock">Rock</option>
						<option value="mineral">Mineral</option>
					</select>
				</div>
			)}

			{/* Subtopics selection */}
			{!isCodebusters && availableSubtopics.length > 0 && (
				<div>
					<label
						htmlFor="subtopics"
						className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Subtopics {loadingSubtopics && "(Loading...)"}
					</label>
					<div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
						{availableSubtopics.map((subtopic) => (
							<label key={subtopic} className="flex items-center">
								<input
									type="checkbox"
									checked={settings.subtopics?.includes(subtopic) || false}
									onChange={(e) => {
										const currentSubtopics = settings.subtopics || [];
										if (e.target.checked) {
											onSettingsChange({
												subtopics: [...currentSubtopics, subtopic],
											});
										} else {
											onSettingsChange({
												subtopics: currentSubtopics.filter(
													(s) => s !== subtopic,
												),
											});
										}
									}}
									className="mr-2"
								/>
								<span
									className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{subtopic}
								</span>
							</label>
						))}
					</div>
				</div>
			)}

			{isCodebusters && (
				<div>
					<label
						htmlFor="cipher-types"
						className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Cipher Types
					</label>
					<div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
						{availableCipherTypes.map((cipherType) => (
							<label key={cipherType} className="flex items-center">
								<input
									type="checkbox"
									checked={settings.subtopics?.includes(cipherType) || false}
									onChange={(e) => {
										const current = settings.subtopics || [];
										if (e.target.checked) {
											onSettingsChange({
												subtopics: [...current, cipherType],
											});
										} else {
											onSettingsChange({
												subtopics: current.filter((c) => c !== cipherType),
											});
										}
									}}
									className="mr-2"
								/>
								<span
									className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{cipherType}
								</span>
							</label>
						))}
					</div>
					<p
						className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
					>
						Leave empty to allow all cipher types.
					</p>
				</div>
			)}

			<div className="flex justify-between">
				<button
					type="button"
					onClick={onBack}
					className={`px-4 py-2 border rounded-lg ${
						darkMode
							? "border-gray-600 text-gray-300 hover:bg-gray-700"
							: "border-gray-300 text-gray-700 hover:bg-gray-50"
					}`}
				>
					Back
				</button>
				<button
					type="button"
					onClick={handleNext}
					disabled={generatingQuestions}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
				>
					{generatingQuestions
						? "Generating Questions..."
						: "Next: Preview Questions"}
				</button>
			</div>
		</motion.div>
	);
}
