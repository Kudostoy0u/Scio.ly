'use client';

import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BookmarkManager from './BookmarkManager';
import { Question } from '@/app/utils/geminiService';
import api from '@/app/api';


interface QuestionActionsProps {
  question: Question;
  questionIndex: number;
  isBookmarked: boolean;
  eventName: string;
  source: 'test' | 'unlimited' | 'practice';
  onBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
  darkMode?: boolean;
  compact?: boolean;
  isSubmittedReport?: boolean;
  isSubmittedEdit?: boolean;
  onReportSubmitted?: (index: number) => void;
  onEditSubmitted?: (index: number) => void;
  isSubmitted?: boolean;
  onEdit?: () => void;
  onQuestionRemoved?: (questionIndex: number) => void;
  isRemovalFailed?: boolean;
}

const QuestionActions: React.FC<QuestionActionsProps> = ({
  question,
  questionIndex,
  isBookmarked,
  eventName,
  source,
  onBookmarkChange,
  darkMode = false,
  compact = false,
  isSubmittedReport = false,
  isSubmittedEdit = false,
  onReportSubmitted,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEditSubmitted,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSubmitted = false,
  onEdit,
  onQuestionRemoved,
  isRemovalFailed = false
}) => {
  const [isProcessingDirectReport, setIsProcessingDirectReport] = useState(false);
  const [hasRemovalFailed, setHasRemovalFailed] = useState(false);

  // Reset hasRemovalFailed when questionIndex changes (new question)
  useEffect(() => {
    setHasRemovalFailed(false);
  }, [questionIndex]);

  const handleDirectReport = async () => {
    if (isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed) return;

    setIsProcessingDirectReport(true);

    try {
      // Prepare the complete question data with all fields
      const completeQuestionData = {
        id: question.id,
        question: question.question,
        options: question.options || [],
        answers: question.answers,
        difficulty: question.difficulty,
        tournament: question.tournament,
        division: question.division,
        subject: question.subject,
        subtopic: question.subtopic,
        event: question.event || eventName
      };

      const response = await fetch(api.reportRemove, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: completeQuestionData,
          reason: 'Direct report from ' + source + ' page',
          event: eventName,
          questionIndex: questionIndex
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.data.reason || 'Question removed successfully!');
        // Call the callback to remove the question from the list
        onQuestionRemoved?.(questionIndex);
        // Call the report submitted callback
        onReportSubmitted?.(questionIndex);
      } else {
        toast.error(result.data.reason || 'Failed to remove question');
        setHasRemovalFailed(true);
      }
    } catch (error) {
      console.error('Error submitting direct report:', error);
      toast.error('Failed to submit report. Please try again.');
      setHasRemovalFailed(true);
    } finally {
      setIsProcessingDirectReport(false);
    }
  };

  const buttonClass = `p-2 rounded-md transition-all duration-200 ${
    darkMode
      ? 'hover:bg-gray-700 text-gray-300'
      : 'hover:bg-gray-100 text-gray-600'
  }`;

  const disabledClass = `opacity-50 cursor-not-allowed ${
    darkMode ? 'text-gray-500' : 'text-gray-400'
  }`;

      // Detect ID questions (questions with imageData)
    const isIdQuestion = !!(question as any).imageData;
  
  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <BookmarkManager
          question={question}
          isBookmarked={isBookmarked}
          eventName={eventName}
          source={source}
          onBookmarkChange={onBookmarkChange}
          darkMode={darkMode}
          size="sm"
        />
        {!isIdQuestion && (
          <>
            <button
              onClick={onEdit}
              disabled={isSubmittedEdit}
              className={`${buttonClass} ${isSubmittedEdit ? disabledClass : 'hover:text-blue-500'}`}
              title={isSubmittedEdit ? 'Edit already submitted' : 'Edit question'}
            >
              <FaEdit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDirectReport}
              disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed}
              className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed) ? disabledClass : 'hover:text-red-500'}`}
              title={isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : 'Remove question'}
            >
              {isProcessingDirectReport ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <FaTrash className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <BookmarkManager
        question={question}
        isBookmarked={isBookmarked}
        eventName={eventName}
        source={source}
        onBookmarkChange={onBookmarkChange}
        darkMode={darkMode}
        showLabel={true}
      />
      {!isIdQuestion && (
        <>
          <button
            onClick={onEdit}
            disabled={isSubmittedEdit}
            className={`${buttonClass} ${isSubmittedEdit ? disabledClass : 'hover:text-blue-500'}`}
            title={isSubmittedEdit ? 'Edit already submitted' : 'Edit question'}
          >
            <div className="flex items-center space-x-1">
              <FaEdit className="w-4 h-4" />
              <span className="text-sm">
                {isSubmittedEdit ? 'Edit Submitted' : 'Edit'}
              </span>
            </div>
          </button>
          <button
            onClick={handleDirectReport}
            disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed}
            className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed) ? disabledClass : 'hover:text-red-600'}`}
            title={isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : 'Quick remove question'}
          >
            <div className="flex items-center space-x-1">
              {isProcessingDirectReport ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <FaTrash className="w-4 h-4" />
              )}
              <span className="text-sm">
                {isProcessingDirectReport ? 'Removing...' : hasRemovalFailed || isRemovalFailed ? 'Failed' : 'Remove'}
              </span>
            </div>
          </button>
        </>
      )}
    </div>
  );
};

export default QuestionActions;