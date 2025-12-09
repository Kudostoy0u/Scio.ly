"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type { Event, Settings } from "@/app/practice/types";
import { useEffect, useRef, useState } from "react";
import DifficultyDropdown from "./DifficultyDropdown";
import DivisionToggle from "./DivisionToggle";
import FavoriteHeart from "./FavoriteHeart";
import QuoteLengthSlider from "./QuoteLengthSlider";
import SubtopicDropdown from "./SubtopicDropdown";
import TestActions from "./TestActions";
import { useClickOutside } from "./hooks/useClickOutside";
import { SliderStyles } from "./styles/sliderStyles";
import {
	getDifficultyDisplayText,
	getSubtopicDisplayText,
} from "./utils/displayTextUtils";
import {
	supportsIdentificationOnly,
	supportsPictureQuestions,
} from "./utils/eventSelection";
import {
	calculateIdPercentageFromValue,
	calculateIdPercentageValue,
	getPictureQuestionsDisplay,
	getSliderBackground,
} from "./utils/idPercentageSlider";
import {
	createSettingsChangeHandler,
	saveCharLengthRange,
	saveIdPercentage,
	savePureIdOnly,
	saveQuestionTypes,
	saveRmTypeFilter,
	validateTimeLimit,
} from "./utils/settingsHandlers";
import { persistDivisionAndTypes } from "./utils/settingsPersistence";

interface TestConfigurationProps {
	selectedEvent: Event | null;
	settings: Settings;
	onSettingsChange: (settings: Settings) => void;
	onGenerateTest: () => void;
	onUnlimited: () => void;
	generateLabel?: string;
	hideUnlimited?: boolean;
	forceBothDivision?: boolean;
}

export default function TestConfiguration({
	selectedEvent,
	settings,
	onSettingsChange,
	onGenerateTest,
	onUnlimited,
	generateLabel = "Generate Test",
	hideUnlimited = false,
	forceBothDivision = false,
}: TestConfigurationProps) {
	const { darkMode } = useTheme();
	const [isSubtopicDropdownOpen, setIsSubtopicDropdownOpen] = useState(false);
	const [isDifficultyDropdownOpen, setIsDifficultyDropdownOpen] =
		useState(false);
	const subtopicDropdownRef = useRef<HTMLDivElement | null>(null);
	const difficultyDropdownRef = useRef<HTMLDivElement | null>(null);

	const handleChange = createSettingsChangeHandler(
		selectedEvent,
		settings,
		onSettingsChange,
	);
	const handleSubtopicChange = (subtopic: string) => {
		const newSubtopics = settings.subtopics.includes(subtopic)
			? settings.subtopics.filter((s: string) => s !== subtopic)
			: [...settings.subtopics, subtopic];
		onSettingsChange({ ...settings, subtopics: newSubtopics });
	};
	const handleDifficultyChange = (difficultyId: string) => {
		const newDifficulties = settings.difficulties.includes(difficultyId)
			? settings.difficulties.filter((d: string) => d !== difficultyId)
			: [...settings.difficulties, difficultyId];
		onSettingsChange({ ...settings, difficulties: newDifficulties });
	};

	useClickOutside(
		[subtopicDropdownRef, difficultyDropdownRef],
		[
			() => setIsSubtopicDropdownOpen(false),
			() => setIsDifficultyDropdownOpen(false),
		],
	);

	useEffect(() => {
		persistDivisionAndTypes(selectedEvent, settings);
	}, [selectedEvent, settings]);

	const isCodebusters = selectedEvent?.name === "Codebusters";
	const eventName = selectedEvent?.name || "";
	const supportsPicture = supportsPictureQuestions(eventName);
	const supportsIdOnly = supportsIdentificationOnly(eventName);
	const isRocksAndMinerals = eventName === "Rocks and Minerals";

	return (
		<div
			data-test-config={true}
			className={`w-full lg:w-96 rounded-xl flex-shrink-0 flex flex-col ${
				darkMode ? "bg-gray-800" : "bg-white shadow-md"
			}`}
		>
			<div className="p-6 flex-1 flex flex-col min-h-0 overflow-visible">
				<div className="flex items-start justify-between mb-6">
					<h3
						className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						Test Configuration
					</h3>
					<FavoriteHeart
						darkMode={!!darkMode}
						selectedEventName={selectedEvent?.name || null}
						settings={settings}
					/>
				</div>
				<div className="space-y-5 flex-1">
					{/* Number of Questions and Time Limit on same line */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="questionCount"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Number of Questions
							</label>
							<input
								type="number"
								id="questionCount"
								min="1"
								max="200"
								value={
									Number.isNaN(settings.questionCount)
										? ""
										: settings.questionCount
								}
								onChange={handleChange}
								className={`block w-full rounded-md border-0 py-1.5 px-3 ${
									darkMode
										? "bg-gray-700 text-white focus:ring-blue-500"
										: "bg-gray-50 text-gray-900 focus:ring-blue-600"
								} shadow-sm focus:ring-1 focus:outline-none`}
							/>
						</div>
						<div>
							<label
								htmlFor="timeLimit"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Time Limit (minutes)
							</label>
							<input
								type="number"
								id="timeLimit"
								min="1"
								max="120"
								value={
									Number.isNaN(settings.timeLimit) ? "" : settings.timeLimit
								}
								onChange={handleChange}
								onBlur={() => validateTimeLimit(settings, onSettingsChange)}
								className={`block w-full rounded-md border-0 py-1.5 px-3 ${
									darkMode
										? "bg-gray-700 text-white focus:ring-blue-500"
										: "bg-gray-50 text-gray-900 focus:ring-blue-600"
								} shadow-sm focus:ring-1 focus:outline-none`}
							/>
						</div>
					</div>

					{/* Question Types Toggle */}
					<fieldset>
						<legend
							className={`block text-sm font-medium mb-2 ${
								darkMode ? "text-gray-300" : "text-gray-700"
							}`}
						>
							Question Types
						</legend>
						<div
							className={`flex rounded-md border ${darkMode ? "border-gray-600" : "border-gray-300"}`}
						>
							<button
								type="button"
								onClick={() => {
									onSettingsChange({ ...settings, types: "multiple-choice" });
									saveQuestionTypes(selectedEvent, "multiple-choice");
								}}
								disabled={isCodebusters}
								className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md border ${
									isCodebusters
										? `opacity-50 cursor-not-allowed ${darkMode ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"}`
										: settings.types === "multiple-choice"
											? darkMode
												? "border-blue-500 bg-blue-500 text-white"
												: "border-blue-500 bg-blue-500 text-white"
											: darkMode
												? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
												: "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
								}`}
							>
								MCQ only
							</button>
							<button
								type="button"
								onClick={() => {
									onSettingsChange({ ...settings, types: "both" });
									saveQuestionTypes(selectedEvent, "both");
								}}
								disabled={isCodebusters}
								className={`px-3 py-2 text-sm font-medium border-t border-b border-l border-r ${
									isCodebusters
										? `opacity-50 cursor-not-allowed ${darkMode ? "border-gray-600 text-gray-500" : "border-gray-300 text-gray-400"}`
										: settings.types === "both"
											? darkMode
												? "border-green-500 bg-green-500 text-white"
												: "border-green-500 bg-green-500 text-white"
											: darkMode
												? "border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400"
												: "border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600"
								}`}
							>
								MCQ + FRQ
							</button>
							<button
								type="button"
								onClick={() => {
									onSettingsChange({ ...settings, types: "free-response" });
									saveQuestionTypes(selectedEvent, "free-response");
								}}
								disabled={isCodebusters}
								className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md border ${
									isCodebusters
										? settings.types === "free-response" ||
											settings.types === "frq-only"
											? darkMode
												? "border-blue-500 bg-blue-500 text-white"
												: "border-blue-500 bg-blue-500 text-white"
											: `opacity-50 cursor-not-allowed ${
													darkMode
														? "border-gray-600 text-gray-500"
														: "border-gray-300 text-gray-400"
												}`
										: settings.types === "free-response"
											? darkMode
												? "border-blue-500 bg-blue-500 text-white"
												: "border-blue-500 bg-blue-500 text-white"
											: darkMode
												? "border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400"
												: "border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600"
								}`}
							>
								FRQ only
							</button>
						</div>
					</fieldset>

					{/* Identification slider for events with image ID */}
					{supportsPicture && (
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
									max={
										Number.isNaN(settings.questionCount)
											? 1
											: Math.max(1, settings.questionCount)
									}
									step={1}
									value={calculateIdPercentageValue(settings)}
									onChange={(e) => {
										const questionCount = Number.isNaN(settings.questionCount)
											? 1
											: Math.max(1, settings.questionCount);
										const pictureQuestions = Number.parseInt(e.target.value);
										const percentage = calculateIdPercentageFromValue(
											pictureQuestions,
											questionCount,
										);
										onSettingsChange({ ...settings, idPercentage: percentage });
										saveIdPercentage(percentage);
									}}
									className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
										darkMode
											? "bg-gray-600 slider-thumb-dark"
											: "bg-gray-200 slider-thumb-light"
									}`}
									style={{
										background: getSliderBackground(darkMode, settings),
									}}
								/>
								<span
									className={`text-sm font-medium min-w-[3rem] text-center ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									{getPictureQuestionsDisplay(settings)}
								</span>
							</div>

							{/* Identification Only checkbox */}
							{supportsIdOnly && (
								<div className="mt-3 flex items-center gap-2">
									<input
										type="checkbox"
										id="pureIdOnly"
										checked={settings.pureIdOnly}
										onChange={(e) => {
											onSettingsChange({
												...settings,
												pureIdOnly: e.target.checked,
											});
											savePureIdOnly(e.target.checked);
										}}
										className={`w-4 h-4 rounded border ${
											darkMode
												? "bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
												: "bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-600"
										} focus:ring-2 focus:ring-offset-0 cursor-pointer`}
									/>
									<label
										htmlFor="pureIdOnly"
										className={`text-sm cursor-pointer ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Identification Only
									</label>
								</div>
							)}

							{/* Rocks and Minerals type filter */}
							{isRocksAndMinerals && (
								<div className="mt-3">
									<label
										htmlFor="rmTypeFilter"
										className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Specimen Type
									</label>
									<select
										id="rmTypeFilter"
										value={settings.rmTypeFilter || "both"}
										onChange={(e) => {
											const value = e.target.value as
												| "rock"
												| "mineral"
												| "both";
											const rmTypeFilter = value === "both" ? undefined : value;
											onSettingsChange({ ...settings, rmTypeFilter });
											saveRmTypeFilter(rmTypeFilter);
										}}
										className={`block w-full rounded-md border-0 py-1.5 px-3 ${
											darkMode
												? "bg-gray-700 text-white focus:ring-blue-500"
												: "bg-gray-50 text-gray-900 focus:ring-blue-600"
										} shadow-sm focus:ring-1 focus:outline-none`}
									>
										<option value="both">Rocks & Minerals</option>
										<option value="rock">Rocks Only</option>
										<option value="mineral">Minerals Only</option>
									</select>
								</div>
							)}
						</div>
					)}

					{/* Character Length Range - Only for Codebusters */}
					{selectedEvent?.name === "Codebusters" && (
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
									settings.charLengthMin || 1,
									settings.charLengthMax || 100,
								]}
								onValueChange={([min, max]) => {
									onSettingsChange({
										...settings,
										charLengthMin: min,
										charLengthMax: max,
									});
									saveCharLengthRange(min, max);
								}}
							/>
						</div>
					)}

					<DivisionToggle
						darkMode={!!darkMode}
						selectedEvent={selectedEvent}
						settings={settings}
						onSettingsChange={onSettingsChange}
						forceBothDivision={forceBothDivision}
					/>

					{/* Difficulty and Subtopic on same line */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								htmlFor="difficulty-dropdown"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Difficulty
							</label>
							<DifficultyDropdown
								id="difficulty-dropdown"
								darkMode={!!darkMode}
								isCodebusters={!!isCodebusters}
								settings={settings}
								isOpen={isDifficultyDropdownOpen}
								onToggleOpen={() =>
									setIsDifficultyDropdownOpen(!isDifficultyDropdownOpen)
								}
								onToggleDifficulty={handleDifficultyChange}
								displayText={getDifficultyDisplayText(settings.difficulties)}
								dropdownRef={difficultyDropdownRef}
							/>
						</div>

						<div>
							<label
								htmlFor="subtopic-dropdown"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								{isCodebusters ? "Cipher Types" : "Subtopics"}
							</label>
							<SubtopicDropdown
								id="subtopic-dropdown"
								darkMode={!!darkMode}
								isCodebusters={!!isCodebusters}
								selectedEvent={selectedEvent}
								settings={settings}
								isOpen={isSubtopicDropdownOpen}
								onToggleOpen={() =>
									setIsSubtopicDropdownOpen(!isSubtopicDropdownOpen)
								}
								onToggleSubtopic={handleSubtopicChange}
								displayText={getSubtopicDisplayText(settings.subtopics)}
								dropdownRef={subtopicDropdownRef}
							/>
						</div>
					</div>

					<TestActions
						darkMode={!!darkMode}
						selectedEvent={selectedEvent}
						generateLabel={generateLabel}
						hideUnlimited={hideUnlimited}
						onGenerateTest={onGenerateTest}
						onUnlimited={onUnlimited}
					/>
				</div>
			</div>

			<SliderStyles darkMode={!!darkMode} />
		</div>
	);
}
