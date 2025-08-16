'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService, EditSuggestion, Question } from '@/app/utils/geminiService';
// Removed in-modal success/failure icons for optimistic flow

interface EditQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (editedQuestion: Question, reason: string, originalQuestion: Question) => Promise<{
    reason: string; success: boolean; message: string; 
}>;
  darkMode: boolean;
  question?: Question;
  eventName: string;
  canEditAnswers?: boolean; // Whether user can edit answers (true after test submission, false during test)
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  darkMode,
  question,
  canEditAnswers = true // Default to true for backward compatibility
}) => {

  const [editedQuestion, setEditedQuestion] = useState('');
  const [editedOptions, setEditedOptions] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]); // zero-based indices for MCQ
  const [frqAnswer, setFrqAnswer] = useState('');
  const [difficulty, setDifficulty] = useState(0.5);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFRQ, setIsFRQ] = useState(false);
  // Optimistic flow: no in-modal success/failure screen
  const [originalOptionCount, setOriginalOptionCount] = useState(0);
  
  // AI suggestion states
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<EditSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (question && isOpen) {
      resetForm();
      setEditedQuestion(question.question);
      setOriginalOptionCount(Array.isArray(question.options) ? question.options.length : 0);
      
      // Determine if this is a free response question
      const hasMCQOptions = question.options && question.options.length > 0;
      setIsFRQ(!hasMCQOptions);
      
      if (hasMCQOptions) {
        setEditedOptions([...question.options!]);
        // If answers are editable (test submitted), pre-select correct answers (zero-based indices)
        if (canEditAnswers) {
          const indices = computeCorrectAnswerIndices(question.options!, question.answers ?? []);
          setCorrectAnswers(indices);
        } else {
          setCorrectAnswers([]);
        }
      } else {
        const answer = Array.isArray(question.answers) && question.answers.length > 0
          ? String(question.answers[0])
          : '';
        setFrqAnswer(answer);
      }
      
      setDifficulty(question.difficulty === 0 ? 0.1 : question.difficulty || 0.5);
    }
  }, [question, isOpen, canEditAnswers]);

  const resetForm = () => {
    setEditedQuestion('');
    setEditedOptions([]);
    setCorrectAnswers([]);
    setFrqAnswer('');
    setDifficulty(0.5);
    setReason('');
    setIsProcessing(false);
    setIsFRQ(false);
    setSuggestions(null);
    setShowSuggestions(false);
    setIsLoadingSuggestions(false);
    // No in-modal status when optimistic
    setOriginalOptionCount(0);
  };

  const computeCorrectAnswerIndices = (options: string[], answers: unknown[]): number[] => {
    if (!Array.isArray(options) || options.length === 0 || !Array.isArray(answers)) return [];
    // Strict zero-based: accept numeric (or numeric-string) indices within [0, options.length)
    const zeroBasedNums = answers
      .map(a => (typeof a === 'number' ? a : (typeof a === 'string' && /^\d+$/.test(a) ? parseInt(a, 10) : null)))
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < options.length);
    if (zeroBasedNums.length > 0) {
      return Array.from(new Set(zeroBasedNums)).sort((a, b) => a - b);
    }
    // Otherwise, match by exact option text (case-insensitive)
    const lowerOptions = options.map(o => o.toLowerCase());
    const indices = answers
      .map(a => {
        const idx = lowerOptions.indexOf(String(a).toLowerCase());
        return idx >= 0 ? idx : null;
      })
      .filter((x): x is number => typeof x === 'number');
    return Array.from(new Set(indices)).sort((a, b) => a - b);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGetSuggestions = async () => {
    if (!question) return;

    setIsLoadingSuggestions(true);
    try {
      const suggestion = await geminiService.suggestQuestionEdit(question, reason);
      setSuggestions(suggestion);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      toast.error('Failed to generate suggestions. Please continue manually.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions) return;

    setEditedQuestion(suggestions.suggestedQuestion);
    
    if (suggestions.suggestedOptions) {
      setEditedOptions([...suggestions.suggestedOptions]);
      setIsFRQ(false);
      
      // Only set correct answers if user can edit them (test has been submitted)
      if (canEditAnswers) {
        const indices = computeCorrectAnswerIndices(
          suggestions.suggestedOptions,
          suggestions.suggestedAnswers as unknown[]
        );
        setCorrectAnswers(indices);
      }
    } else {
      setIsFRQ(true);
      // Only set FRQ answer if user can edit them (test has been submitted)
      if (canEditAnswers) {
        setFrqAnswer(String(suggestions.suggestedAnswers[0] || ''));
      }
    }

    // Add AI reasoning to user's reason
    const aiReason = `${suggestions.reasoning || 'No reasoning provided'}`;
    setReason(prev => prev + aiReason);
    
    toast.success('AI suggestions applied! Please review and adjust as needed.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setIsProcessing(true);

    try {
      const editedQuestionData: Question = {
        question: editedQuestion,
        options: isFRQ ? undefined : editedOptions.length > 0 ? editedOptions : undefined,
        answers: canEditAnswers 
          ? (isFRQ ? [frqAnswer] : correctAnswers)
          : question.answers,
        difficulty: difficulty === 0 ? 0.1 : difficulty,
        subject: question.subject,
        tournament: question.tournament,
        division: question.division,
        subtopic: question.subtopic
      };

      toast.info('Judging edits');
      // Fire-and-forget submission; close modal immediately
      const submitPromise = onSubmit(editedQuestionData, reason.trim() || "User did not specify a reason", question);
      handleClose();
      submitPromise
        .then((result) => {
          if (result.success) {
            toast.success(result.message || 'Edit accepted');
          } else {
            toast.error(result.message || 'Edit rejected');
          }
        })
        .catch((error) => {
          console.error('Error processing edit:', error);
          toast.error('An unexpected error occurred.');
        });
    } catch (error) {
      console.error('Error processing edit:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addOption = () => {
    if (originalOptionCount > 0 && editedOptions.length >= originalOptionCount) {
      toast.info(`You cannot add more than ${originalOptionCount} options for this question.`);
      return;
    }
    setEditedOptions([...editedOptions, '']);
  };

  const removeOption = (index: number) => {
    const newOptions = editedOptions.filter((_, i) => i !== index);
    setEditedOptions(newOptions);
    // Adjust zero-based correct answer indices after removal
    const adjusted = correctAnswers
      .filter(ans => ans !== index)
      .map(ans => (ans > index ? ans - 1 : ans));
    setCorrectAnswers(Array.from(new Set(adjusted)).sort((a, b) => a - b));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...editedOptions];
    newOptions[index] = value;
    setEditedOptions(newOptions);
  };

  const toggleCorrectAnswer = (index: number) => {
    if (correctAnswers.includes(index)) {
      setCorrectAnswers(correctAnswers.filter(a => a !== index));
    } else {
      setCorrectAnswers([...correctAnswers, index].sort((a, b) => a - b));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={handleClose}
    >
      <div
        className={`rounded-lg p-6 w-[90%] sm:w-[900px] max-h-[90vh] overflow-y-auto mx-4  ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Question</h3>
          <button 
            onClick={handleClose} 
            className={`text-gray-500 hover:${darkMode ? 'text-gray-300' : 'text-gray-700'} `}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

          <form onSubmit={handleSubmit}>
            {/* AI Suggestions Section */}
            {!showSuggestions ? (
              <div className={`mb-6 p-4 rounded-xl border-2 shadow-sm ${
                darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                      darkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                    }`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm sm:text-base">AI-Powered Suggestions</h4>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Get intelligent recommendations for improving this question</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={handleGetSuggestions}
                    disabled={isLoadingSuggestions || !question}
                    className={`relative overflow-hidden rounded-lg border-2 flex-shrink-0 ml-2 p-2 flex items-center justify-center ${
                      darkMode
                        ? 'bg-transparent text-blue-400 border-blue-400 hover:text-blue-300 hover:border-blue-300'
                        : 'bg-transparent text-blue-600 border-blue-600 hover:text-blue-500 hover:border-blue-500'
                    } ${isLoadingSuggestions ? 'cursor-not-allowed' : ''}`}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Bot className={`w-5 h-5 ${isLoadingSuggestions ? 'animate-spin' : ''} ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </motion.button>
                </div>
              </div>
            ) : (
              suggestions && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/80 border-blue-200'
                }`}>
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`p-1.5 rounded-full ${
                      darkMode ? 'bg-green-600/20' : 'bg-green-100'
                    }`}>
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">Suggested Improvements:</p>
                      <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {suggestions.reasoning || 'No reasoning provided'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
                        (suggestions.confidence || 0) > 0.8
                          ? darkMode 
                            ? 'bg-green-800/30 text-green-300 border-green-600' 
                            : 'bg-transparent text-green-700 border-green-600'
                          : (suggestions.confidence || 0) > 0.6
                            ? darkMode 
                              ? 'bg-yellow-800/30 text-yellow-300 border-yellow-600' 
                              : 'bg-transparent text-yellow-700 border-yellow-600'
                            : darkMode 
                              ? 'bg-red-800/30 text-red-300 border-red-600' 
                              : 'bg-transparent text-red-700 border-red-600'
                      }`}>
                        {Math.round((suggestions.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={applySuggestions}
                      className="px-4 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Apply Suggestions</span>
                    </button>
                  </div>
                </div>
              )
            )}

            <div className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block mb-2 font-medium">Question</label>
                <textarea
                  className={`w-full p-3 border rounded-md  ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                      : 'bg-white text-gray-900 border-gray-300 focus:border-blue-400'
                  }`}
                  rows={4}
                  placeholder="Enter your edited version of the question..."
                  value={editedQuestion}
                  onChange={(e) => setEditedQuestion(e.target.value)}
                  required
                />
              </div>

              {/* Difficulty Slider */}
              <div>
                <label className="block mb-2 font-medium">Difficulty</label>
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
                        const value = parseFloat(e.target.value);
                        setDifficulty(value === 0 ? 0.1 : value);
                      }}
                      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, 
                          ${difficulty < 0.3 ? 'rgb(34, 197, 94)' : difficulty < 0.7 ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)'} 0%, 
                          ${difficulty < 0.3 ? 'rgb(34, 197, 94)' : difficulty < 0.7 ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)'} ${difficulty * 100}%, 
                          rgb(209, 213, 219) ${difficulty * 100}%, 
                          rgb(209, 213, 219) 100%)`
                      }}
                    />
                  </div>
                  <span className="text-sm w-10">Hard</span>
                  <div className="ml-2">
                    <div className={`w-16 text-center px-2 py-1 rounded text-xs ${
                      difficulty < 0.3 
                        ? darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
                        : difficulty < 0.7 
                          ? darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                          : darkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
                    }`}>
                      {difficulty < 0.3 ? 'Easy' : difficulty < 0.7 ? 'Medium' : 'Hard'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Type Toggle */}
              <div>
                <label className="block mb-2 font-medium">Question Type</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsFRQ(false)}
                    className={`px-4 py-2 rounded-md  ${
                      !isFRQ
                        ? 'bg-blue-500 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFRQ(true)}
                    className={`px-4 py-2 rounded-md  ${
                      isFRQ
                        ? 'bg-blue-500 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Free Response
                  </button>
                </div>
              </div>

              {/* Answers Section */}
              {isFRQ ? (
                <div>
                  <label className="block mb-2 font-medium">Correct Answer</label>
                  {!canEditAnswers && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                      💡 Answers are hidden during test
                    </p>
                  )}
                  <textarea
                    className={`w-full p-3 border rounded-md ${
                      !canEditAnswers 
                        ? darkMode 
                          ? 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                        : darkMode 
                          ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                          : 'bg-white text-gray-900 border-gray-300 focus:border-blue-400'
                    }`}
                    rows={3}
                    placeholder={canEditAnswers ? "Enter the correct answer for this free response question..." : "Answer editing disabled during test"}
                    value={frqAnswer}
                    onChange={(e) => canEditAnswers && setFrqAnswer(e.target.value)}
                    required={canEditAnswers}
                    disabled={!canEditAnswers}
                  />
                </div>
              ) : (
                <div>
                  <label className="block mb-2 font-medium">Answer Options</label>
                  {!canEditAnswers && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
                      💡 Answers are hidden during test
                    </p>
                  )}
                  <div className="space-y-2">
                      {editedOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={correctAnswers.includes(index)}
                          onChange={() => canEditAnswers && toggleCorrectAnswer(index)}
                          className={`mr-2 ${!canEditAnswers ? 'cursor-not-allowed opacity-50' : ''}`}
                          disabled={!canEditAnswers}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className={`flex-1 p-2 border rounded-md  ${
                            darkMode 
                              ? 'bg-gray-700 text-white border-gray-600' 
                              : 'bg-white text-gray-900 border-gray-300'
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
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
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
                <label className="block mb-2 font-medium">Reason for Edit (optional)</label>
                <textarea
                  className={`w-full p-3 border rounded-md  ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' 
                      : 'bg-white text-gray-900 border-gray-300 focus:border-blue-400'
                  }`}
                  rows={3}
                  placeholder="Please explain why you're making this edit... (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 rounded-md  ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
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
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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