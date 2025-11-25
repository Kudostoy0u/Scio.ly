"use client";
import logger from "@/lib/utils/logger";

import { type EditSuggestion, type Question, geminiService } from "@/app/utils/geminiService";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

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
    }
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

const DIGIT_REGEX = /^\d+$/;

// Helper function to compute correct answer indices (moved outside component for stability)
function computeCorrectAnswerIndices(options: string[], answers: unknown[]): number[] {
  if (!Array.isArray(options) || options.length === 0 || !Array.isArray(answers)) {
    return [];
  }

  logger.log("🔍 [COMPUTE-INDICES] Input:", { options, answers });

  const zeroBasedNums = answers
    .map((a) =>
      typeof a === "number"
        ? a
        : typeof a === "string" && DIGIT_REGEX.test(a)
          ? Number.parseInt(a, 10)
          : null
    )
    .filter((n): n is number => n !== null && n >= 0 && n < options.length);

  logger.log("🔍 [COMPUTE-INDICES] Output:", zeroBasedNums);
  return zeroBasedNums;
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
          const indices = computeCorrectAnswerIndices(q.options || [], q.answers ?? []);
          setCorrectAnswers(indices);
        } else {
          setCorrectAnswers([]);
        }
      };

      // Helper function to initialize FRQ question
      const initializeFrqQuestion = (q: Question) => {
        const answer = Array.isArray(q.answers) && q.answers.length > 0 ? String(q.answers[0]) : "";
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
      setOriginalOptionCount(Array.isArray(question.options) ? question.options.length : 0);

      initializeQuestionImage(question);

      const hasMcqOptions = question.options && question.options.length > 0;
      setIsFrq(!hasMcqOptions);

      if (hasMcqOptions) {
        initializeMcqQuestion(question, canEditAnswers);
      } else {
        initializeFrqQuestion(question);
      }

      setDifficulty(question.difficulty === 0 ? 0.1 : question.difficulty || 0.5);
    }
  }, [question, isOpen, canEditAnswers]);

  // Detect when user tampers with AI suggestions
  useEffect(() => {
    if (aiSuggestionsApplied && suggestions && !suggestionsTampered) {
      // Helper function to check if options changed
      const checkOptionsChangedLocal = (suggestedOptions?: string[]): boolean => {
        if (!suggestedOptions) {
          return false;
        }
        return (
          editedOptions.length !== suggestedOptions.length ||
          editedOptions.some((opt, i) => opt !== suggestedOptions[i])
        );
      };

      // Helper function to check if FRQ answers changed
      const checkFrqAnswersChangedLocal = (suggestedAnswers: unknown[]): boolean => {
        return frqAnswer !== String(suggestedAnswers[0] || "");
      };

      // Helper function to check if MCQ answers changed
      const checkMcqAnswersChangedLocal = (
        suggestedOptions: string[],
        suggestedAnswers: unknown[]
      ): boolean => {
        const expectedIndices = computeCorrectAnswerIndices(suggestedOptions, suggestedAnswers);
        return !(
          correctAnswers.every((idx) => expectedIndices.includes(idx)) &&
          expectedIndices.every((idx) => correctAnswers.includes(idx))
        );
      };

      // Helper function to check if answers changed
      const checkAnswersChangedLocal = (
        suggestedOptions?: string[],
        suggestedAnswers?: unknown[]
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
      const optionsChanged = checkOptionsChangedLocal(suggestions.suggestedOptions);
      const answersChanged = checkAnswersChangedLocal(
        suggestions.suggestedOptions,
        suggestions.suggestedAnswers
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
              suggestions.suggestedAnswers as unknown[]
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
    if (!suggestion.suggestedOptions || suggestion.suggestedOptions.length === 0) {
      return;
    }
    setEditedOptions([...suggestion.suggestedOptions]);
    setIsFrq(false);
    if (canEditAnswers) {
      const indices = computeCorrectAnswerIndices(
        suggestion.suggestedOptions,
        suggestion.suggestedAnswers as unknown[]
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
      setDifficulty(suggestion.suggestedDifficulty === 0 ? 0.1 : suggestion.suggestedDifficulty);
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

      const suggestion = await geminiService.suggestQuestionEdit(questionWithImage, reason);
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
      options: isFrq ? undefined : editedOptions.length > 0 ? editedOptions : undefined,
      answers: canEditAnswers ? (isFrq ? [frqAnswer] : correctAnswers) : q.answers,
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
            suggestions.suggestedAnswers as unknown[]
          )
        : undefined,
    };
  };

  // Helper function to handle submit result
  const handleSubmitResult = (result: { success: boolean; message: string }) => {
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
        aiSuggestionPayload
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
    if (originalOptionCount > 0 && editedOptions.length >= originalOptionCount) {
      toast.info(`You cannot add more than ${originalOptionCount} options for this question.`);
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

  const hasImage = currentImageUrl || question?.imageData || question?.imageUrl;

  // Helper function to render applied suggestions display
  const renderAppliedSuggestions = () => (
    <div
      className={`mb-6 p-4 rounded-lg border ${
        darkMode ? "bg-gray-700/50 border-gray-600" : "bg-white/80 border-blue-200"
      }`}
    >
      <div className="flex items-start space-x-3 mb-3">
        <div className={`p-1.5 rounded-full ${darkMode ? "bg-green-600/20" : "bg-green-100"}`}>
          <svg
            className="w-4 h-4 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="AI Suggestion"
          >
            <title>AI Suggestion</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">
            Suggested Improvements:
          </p>
          <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
            Suggestions generated for this question.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Suggestions have been auto-applied
        </div>
      </div>
    </div>
  );

  // Helper function to render AI suggestions prompt
  const renderAiSuggestionsPrompt = () => (
    <div
      className={`mb-6 p-4 rounded-xl border-2 shadow-sm ${
        darkMode
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600"
          : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div
            className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
              darkMode ? "bg-blue-600/20" : "bg-blue-100"
            }`}
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="AI Bot"
            >
              <title>AI Bot</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
              AI-Powered Suggestions
            </h4>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {hasImage
                ? "Get intelligent recommendations for improving this image-based question"
                : "Get intelligent recommendations for improving this question"}
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={handleGetSuggestions}
          disabled={isLoadingSuggestions || !question}
          className={`relative overflow-hidden rounded-lg border-2 flex-shrink-0 ml-2 p-2 flex items-center justify-center ${
            darkMode
              ? "bg-transparent text-blue-400 border-blue-400 hover:text-blue-300 hover:border-blue-300"
              : "bg-transparent text-blue-600 border-blue-600 hover:text-blue-500 hover:border-blue-500"
          } ${isLoadingSuggestions ? "cursor-not-allowed" : ""}`}
        >
          {isLoadingSuggestions ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          ) : (
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );

  // Helper function to render AI suggestions section
  const renderAiSuggestionsSection = () => {
    if (showSuggestions && suggestions) {
      return renderAppliedSuggestions();
    }
    return renderAiSuggestionsPrompt();
  };

  // Helper function to render image section
  const renderImageSection = () => {
    if (!hasImage) {
      return null;
    }
    return (
      <div className="mb-6">
        <div className="block mb-2 font-medium">Question Image</div>
        <div
          className={`p-4 rounded-lg border-2 border-dashed ${
            darkMode ? "border-gray-600 bg-gray-700/50" : "border-gray-300 bg-gray-50"
          }`}
        >
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImageUrl || question?.imageData || question?.imageUrl}
              alt="Question"
              className="max-h-64 rounded-md mx-auto"
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Image is permanent and cannot be changed
          </p>
        </div>
      </div>
    );
  };

  // Helper function to render question text input
  const renderQuestionTextInput = () => (
    <div>
      <label htmlFor="edit-question-text" className="block mb-2 font-medium">
        Question
      </label>
      <textarea
        id="edit-question-text"
        className={`w-full p-3 border rounded-md  ${
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
  );

  // Helper function to get difficulty color
  const getDifficultyColor = (diff: number): string => {
    if (diff < 0.3) {
      return "rgb(34, 197, 94)";
    }
    if (diff < 0.7) {
      return "rgb(234, 179, 8)";
    }
    return "rgb(239, 68, 68)";
  };

  // Helper function to get difficulty label
  const getDifficultyLabel = (diff: number): string => {
    if (diff < 0.3) {
      return "Easy";
    }
    if (diff < 0.7) {
      return "Medium";
    }
    return "Hard";
  };

  // Helper function to get difficulty badge classes
  const getDifficultyBadgeClasses = (diff: number): string => {
    if (diff < 0.3) {
      return darkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800";
    }
    if (diff < 0.7) {
      return darkMode ? "bg-yellow-800 text-yellow-200" : "bg-yellow-100 text-yellow-800";
    }
    return darkMode ? "bg-red-800 text-red-200" : "bg-red-100 text-red-800";
  };

  // Helper function to render difficulty slider
  const renderDifficultySlider = () => {
    const diffColor = getDifficultyColor(difficulty);
    return (
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
    );
  };

  // Helper function to render question type toggle
  const renderQuestionTypeToggle = () => (
    <div>
      <div className="block mb-2 font-medium">Question Type</div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => setIsFrq(false)}
          className={`px-4 py-2 rounded-md  ${
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
          className={`px-4 py-2 rounded-md  ${
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
  );

  // Helper function to render FRQ answer input
  const renderFrqAnswerInput = () => (
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
  );

  // Helper function to render MCQ answer options
  const renderMcqAnswerOptions = () => (
    <div>
      <div className="block mb-2 font-medium">Answer Options</div>
      {!canEditAnswers && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
          💡 Answers are hidden during test
        </p>
      )}
      <div className="space-y-2">
        {editedOptions.map((option, index) => (
          <div key={`option-${index}-${option.slice(0, 10)}`} className="flex items-center gap-2">
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
              className={`flex-1 p-2 border rounded-md  ${
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
        <p className="mt-2 text-sm text-gray-500">Check the boxes next to the correct answer(s)</p>
      )}
    </div>
  );

  // Helper function to render answers section
  const renderAnswersSection = () => {
    if (isFrq) {
      return renderFrqAnswerInput();
    }
    return renderMcqAnswerOptions();
  };

  // Helper function to render reason for edit input
  const renderReasonInput = () => (
    <div>
      <label htmlFor="edit-reason" className="block mb-2 font-medium">
        Reason for Edit (optional)
      </label>
      <textarea
        id="edit-reason"
        className={`w-full p-3 border rounded-md  ${
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
  );

  // Helper function to render submit buttons
  const renderSubmitButtons = () => (
    <div className="flex justify-end space-x-3 mt-6">
      <button
        type="button"
        onClick={handleClose}
        className={`px-4 py-2 rounded-md  ${
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
        className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600  flex items-center space-x-2"
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
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", display: isOpen ? "flex" : "none" }}
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
          {/* AI Suggestions Section */}
          {renderAiSuggestionsSection()}

          {/* Image Section (read-only) */}
          {renderImageSection()}

          <div className="space-y-4">
            {/* Question Text */}
            {renderQuestionTextInput()}

            {/* Difficulty Slider */}
            {renderDifficultySlider()}

            {/* Question Type Toggle */}
            {renderQuestionTypeToggle()}

            {/* Answers Section */}
            {renderAnswersSection()}

            {/* Reason for Edit */}
            {renderReasonInput()}
          </div>

          {/* Submit Buttons */}
          {renderSubmitButtons()}
        </form>
      </div>
    </div>
  );
};

export default EditQuestionModal;
