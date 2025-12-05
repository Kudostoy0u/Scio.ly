"use client";
import {
	type EditSuggestion,
	type Question,
	geminiService,
} from "@/app/utils/geminiService";
import logger from "@/lib/utils/logger";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AISuggestionsSection } from "./EditQuestionModal/AISuggestionsSection";
import { FormSections } from "./EditQuestionModal/FormSections";
import { computeCorrectAnswerIndices } from "./EditQuestionModal/utils";

interface EditQuestionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (
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
	) => Promise<{
		reason: string;
		success: boolean;
		message: string;
	}>;
	darkMode: boolean;
	question?: Question;
	eventName: string;
	canEditAnswers?: boolean;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	darkMode,
	question,
	canEditAnswers = true,
}) => {
	const [editedQuestion, setEditedQuestion] = useState("");
	const [editedOptions, setEditedOptions] = useState<string[]>([]);
	const [correctAnswers, setCorrectAnswers] = useState<number[]>([]); // zero-based indices for mcq
	const [frqAnswer, setFrqAnswer] = useState("");
	const [difficulty, setDifficulty] = useState(0.5);
	const [reason, setReason] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [isFrq, setIsFrq] = useState(false);

	const [originalOptionCount, setOriginalOptionCount] = useState(0);

	const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
	const [suggestions, setSuggestions] = useState<EditSuggestion | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(false);

	// Track if AI suggestions have been tampered with
	const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(false);
	const [suggestionsTampered, setSuggestionsTampered] = useState(false);

	const [currentImageUrl, setCurrentImageUrl] = useState<string>("");

	useEffect(() => {
		if (question && isOpen) {
			// Helper function to initialize MCQ question
			const initializeMcqQuestion = (q: Question, canEdit: boolean) => {
				setEditedOptions([...(q.options || [])]);
				if (canEdit) {
					const indices = computeCorrectAnswerIndices(
						q.options || [],
						q.answers ?? [],
					);
					setCorrectAnswers(indices);
				} else {
					setCorrectAnswers([]);
				}
			};

			// Helper function to initialize FRQ question
			const initializeFrqQuestion = (q: Question) => {
				const answer =
					Array.isArray(q.answers) && q.answers.length > 0
						? String(q.answers[0])
						: "";
				setFrqAnswer(answer);
			};

			// Helper function to initialize question image
			const initializeQuestionImage = (q: Question) => {
				if (q.imageData || ("imageUrl" in q && q.imageUrl)) {
					setCurrentImageUrl(q.imageData || (q.imageUrl as string));
				}
			};

			resetForm();
			setEditedQuestion(question.question);
			setOriginalOptionCount(
				Array.isArray(question.options) ? question.options.length : 0,
			);

			initializeQuestionImage(question);

			const hasMcqOptions = question.options && question.options.length > 0;
			setIsFrq(!hasMcqOptions);

			if (hasMcqOptions) {
				initializeMcqQuestion(question, canEditAnswers);
			} else {
				initializeFrqQuestion(question);
			}

			setDifficulty(
				question.difficulty === 0 ? 0.1 : question.difficulty || 0.5,
			);
		}
	}, [question, isOpen, canEditAnswers]);

	// Detect when user tampers with AI suggestions
	useEffect(() => {
		if (aiSuggestionsApplied && suggestions && !suggestionsTampered) {
			// Helper function to check if options changed
			const checkOptionsChangedLocal = (
				suggestedOptions?: string[],
			): boolean => {
				if (!suggestedOptions) {
					return false;
				}
				return (
					editedOptions.length !== suggestedOptions.length ||
					editedOptions.some((opt, i) => opt !== suggestedOptions[i])
				);
			};

			// Helper function to check if FRQ answers changed
			const checkFrqAnswersChangedLocal = (
				suggestedAnswers: unknown[],
			): boolean => {
				return frqAnswer !== String(suggestedAnswers[0] || "");
			};

			// Helper function to check if MCQ answers changed
			const checkMcqAnswersChangedLocal = (
				suggestedOptions: string[],
				suggestedAnswers: unknown[],
			): boolean => {
				const expectedIndices = computeCorrectAnswerIndices(
					suggestedOptions,
					suggestedAnswers,
				);
				return !(
					correctAnswers.every((idx) => expectedIndices.includes(idx)) &&
					expectedIndices.every((idx) => correctAnswers.includes(idx))
				);
			};

			// Helper function to check if answers changed
			const checkAnswersChangedLocal = (
				suggestedOptions?: string[],
				suggestedAnswers?: unknown[],
			): boolean => {
				if (!(canEditAnswers && suggestedAnswers)) {
					return false;
				}
				if (isFrq) {
					return checkFrqAnswersChangedLocal(suggestedAnswers);
				}
				return suggestedOptions
					? checkMcqAnswersChangedLocal(suggestedOptions, suggestedAnswers)
					: false;
			};

			const questionChanged = editedQuestion !== suggestions.suggestedQuestion;
			const optionsChanged = checkOptionsChangedLocal(
				suggestions.suggestedOptions,
			);
			const answersChanged = checkAnswersChangedLocal(
				suggestions.suggestedOptions,
				suggestions.suggestedAnswers,
			);

			logger.log("🔍 [TAMPER-CHECK]", {
				questionChanged,
				optionsChanged,
				answersChanged,
				currentAnswers: correctAnswers,
				suggestedAnswers: suggestions.suggestedAnswers,
				expectedIndices: suggestions.suggestedOptions
					? computeCorrectAnswerIndices(
							suggestions.suggestedOptions,
							suggestions.suggestedAnswers as unknown[],
						)
					: [],
			});

			if (questionChanged || optionsChanged || answersChanged) {
				logger.log("🚨 [TAMPER-DETECTED] Setting suggestionsTampered to true");
				setSuggestionsTampered(true);
			}
		}
	}, [
		aiSuggestionsApplied,
		suggestions,
		suggestionsTampered,
		editedQuestion,
		editedOptions,
		correctAnswers,
		frqAnswer,
		isFrq,
		canEditAnswers,
	]);

	const resetForm = () => {
		setEditedQuestion("");
		setEditedOptions([]);
		setCorrectAnswers([]);
		setFrqAnswer("");
		setDifficulty(0.5);
		setReason("");
		setIsProcessing(false);
		setIsFrq(false);
		setSuggestions(null);
		setShowSuggestions(false);
		setIsLoadingSuggestions(false);
		setAiSuggestionsApplied(false);
		setSuggestionsTampered(false);

		setCurrentImageUrl("");

		setOriginalOptionCount(0);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	// Helper function to apply MCQ suggestions
	const applyMcqSuggestions = (suggestion: EditSuggestion) => {
		if (
			!suggestion.suggestedOptions ||
			suggestion.suggestedOptions.length === 0
		) {
			return;
		}
		setEditedOptions([...suggestion.suggestedOptions]);
		setIsFrq(false);
		if (canEditAnswers) {
			const indices = computeCorrectAnswerIndices(
				suggestion.suggestedOptions,
				suggestion.suggestedAnswers as unknown[],
			);
			setCorrectAnswers(indices);
		}
	};

	// Helper function to apply FRQ suggestions
	const applyFrqSuggestions = (suggestion: EditSuggestion) => {
		setIsFrq(true);
		if (canEditAnswers) {
			setFrqAnswer(String(suggestion.suggestedAnswers[0] || ""));
		}
	};

	// Helper function to apply difficulty suggestion
	const applyDifficultySuggestion = (suggestion: EditSuggestion) => {
		if (typeof suggestion.suggestedDifficulty === "number") {
			setDifficulty(
				suggestion.suggestedDifficulty === 0
					? 0.1
					: suggestion.suggestedDifficulty,
			);
		}
	};

	// Helper function to apply all suggestions
	const applySuggestions = (suggestion: EditSuggestion) => {
		setEditedQuestion(suggestion.suggestedQuestion);
		if (suggestion.suggestedOptions && suggestion.suggestedOptions.length > 0) {
			applyMcqSuggestions(suggestion);
		} else {
			applyFrqSuggestions(suggestion);
		}
		applyDifficultySuggestion(suggestion);
		setAiSuggestionsApplied(true);
		setSuggestionsTampered(false);
	};

	const handleGetSuggestions = async () => {
		if (!question) {
			return;
		}

		setIsLoadingSuggestions(true);
		try {
			const questionWithImage = {
				...question,
				imageData: currentImageUrl || question.imageData || question.imageUrl,
			};

			const suggestion = await geminiService.suggestQuestionEdit(
				questionWithImage,
				reason,
			);
			setSuggestions(suggestion);
			setShowSuggestions(true);
			applySuggestions(suggestion);
			toast.success("AI suggestions applied automatically");
		} catch (error) {
			logger.error("Failed to get suggestions:", error);
			toast.error("Failed to generate suggestions. Please continue manually.");
		} finally {
			setIsLoadingSuggestions(false);
		}
	};

	// Helper function to build edited question data
	const buildEditedQuestionData = (q: Question): Question => {
		const finalImageUrl = currentImageUrl || q.imageData || q.imageUrl;
		return {
			question: editedQuestion,
			options: isFrq
				? undefined
				: editedOptions.length > 0
					? editedOptions
					: undefined,
			answers: canEditAnswers
				? isFrq
					? [frqAnswer]
					: correctAnswers
				: q.answers,
			difficulty: difficulty === 0 ? 0.1 : difficulty,
			subject: q.subject,
			tournament: q.tournament,
			division: q.division,
			subtopic: q.subtopic,
			...(finalImageUrl && { imageData: finalImageUrl }),
		};
	};

	// Helper function to build AI suggestion payload
	const buildAiSuggestionPayload = () => {
		if (!suggestions) {
			return undefined;
		}
		if (!aiSuggestionsApplied) {
			return undefined;
		}
		if (suggestionsTampered) {
			return undefined;
		}
		return {
			question: suggestions.suggestedQuestion,
			options: suggestions.suggestedOptions,
			answers: (suggestions.suggestedAnswers as unknown[]).map(String),
			answerIndices: suggestions.suggestedOptions
				? computeCorrectAnswerIndices(
						suggestions.suggestedOptions,
						suggestions.suggestedAnswers as unknown[],
					)
				: undefined,
		};
	};

	// Helper function to handle submit result
	const handleSubmitResult = (result: {
		success: boolean;
		message: string;
	}) => {
		if (result.success) {
			toast.success(result.message || "Edit accepted");
		} else {
			toast.error(result.message || "Edit rejected");
		}
	};

	// applySuggestions removed; auto-apply happens in handleGetSuggestions

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!question) {
			return;
		}

		setIsProcessing(true);

		try {
			const editedQuestionData = buildEditedQuestionData(question);
			const canBypassValidation = aiSuggestionsApplied && !suggestionsTampered;

			if (!canBypassValidation) {
				toast.info("Judging edits");
			}

			logger.log("🔍 [EDIT-MODAL] Bypass check:", {
				aiSuggestionsApplied,
				suggestionsTampered,
				canBypassValidation,
			});

			const aiSuggestionPayload = buildAiSuggestionPayload();

			const submitPromise = onSubmit(
				editedQuestionData,
				reason.trim() || "User did not specify a reason",
				question,
				canBypassValidation,
				aiSuggestionPayload,
			);
			handleClose();
			submitPromise.then(handleSubmitResult).catch((error) => {
				logger.error("Error processing edit:", error);
				toast.error("An unexpected error occurred.");
			});
		} catch (error) {
			logger.error("Error processing edit:", error);
			toast.error("An unexpected error occurred.");
		} finally {
			setIsProcessing(false);
		}
	};

	const addOption = () => {
		if (
			originalOptionCount > 0 &&
			editedOptions.length >= originalOptionCount
		) {
			toast.info(
				`You cannot add more than ${originalOptionCount} options for this question.`,
			);
			return;
		}
		setEditedOptions([...editedOptions, ""]);
	};

	const removeOption = (index: number) => {
		const newOptions = editedOptions.filter((_, i) => i !== index);
		setEditedOptions(newOptions);

		const adjusted = correctAnswers
			.filter((ans) => ans !== index)
			.map((ans) => (ans > index ? ans - 1 : ans));
		setCorrectAnswers(Array.from(new Set(adjusted)).sort((a, b) => a - b));
	};

	const updateOption = (index: number, value: string) => {
		const newOptions = [...editedOptions];
		newOptions[index] = value;
		setEditedOptions(newOptions);
	};

	const toggleCorrectAnswer = (index: number) => {
		if (correctAnswers.includes(index)) {
			setCorrectAnswers(correctAnswers.filter((a) => a !== index));
		} else {
			setCorrectAnswers([...correctAnswers, index].sort((a, b) => a - b));
		}
	};

	const hasImage: boolean = !!(
		currentImageUrl ||
		question?.imageData ||
		question?.imageUrl
	);

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50"
			style={{
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				display: isOpen ? "flex" : "none",
			}}
			onClick={handleClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					handleClose();
				}
			}}
		>
			<div
				className={`rounded-lg p-6 w-[90%] sm:w-[900px] max-h-[90vh] overflow-y-auto mx-4  ${
					darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
				}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						handleClose();
					}
					e.stopPropagation();
				}}
			>
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">Edit Question</h3>
					<button
						type="button"
						onClick={handleClose}
						className={`text-gray-500 hover:${darkMode ? "text-gray-300" : "text-gray-700"} `}
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-label="Close"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<AISuggestionsSection
						darkMode={darkMode}
						hasImage={hasImage}
						isLoadingSuggestions={isLoadingSuggestions}
						showSuggestions={showSuggestions}
						suggestions={suggestions}
						onGetSuggestions={handleGetSuggestions}
					/>

					<FormSections
						darkMode={darkMode}
						editedQuestion={editedQuestion}
						setEditedQuestion={setEditedQuestion}
						difficulty={difficulty}
						setDifficulty={setDifficulty}
						isFrq={isFrq}
						setIsFrq={setIsFrq}
						editedOptions={editedOptions}
						correctAnswers={correctAnswers}
						canEditAnswers={canEditAnswers}
						frqAnswer={frqAnswer}
						setFrqAnswer={setFrqAnswer}
						addOption={addOption}
						removeOption={removeOption}
						updateOption={updateOption}
						toggleCorrectAnswer={toggleCorrectAnswer}
						reason={reason}
						setReason={setReason}
						currentImageUrl={currentImageUrl}
						question={question}
					/>

					<div className="flex justify-end space-x-3 mt-6">
						<button
							type="button"
							onClick={handleClose}
							className={`px-4 py-2 rounded-md ${
								darkMode
									? "bg-gray-700 hover:bg-gray-600 text-white"
									: "bg-gray-200 hover:bg-gray-300 text-gray-900"
							}`}
							disabled={isProcessing}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 flex items-center space-x-2"
							disabled={isProcessing}
						>
							{isProcessing ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
									<span>Processing...</span>
								</>
							) : (
								<span>Submit Edit</span>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditQuestionModal;
