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
  _isSubmitted?: boolean;
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
  _isSubmitted = false,
  onEdit,
  onQuestionRemoved,
  isRemovalFailed = false
}) => {
  const [isProcessingDirectReport, setIsProcessingDirectReport] = useState(false);
  const [hasRemovalFailed, setHasRemovalFailed] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Reset hasRemovalFailed when questionIndex changes (new question)
  useEffect(() => {
    setHasRemovalFailed(false);
  }, [questionIndex]);

  useEffect(() => {
    const apply = () => setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    apply();
    window.addEventListener('online', apply);
    window.addEventListener('offline', apply);
    return () => {
      window.removeEventListener('online', apply);
      window.removeEventListener('offline', apply);
    };
  }, []);

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
        // First mark this index as submitted (applies to the removed item only)
        onReportSubmitted?.(questionIndex);
        // Then remove the question so the next one is not affected
        onQuestionRemoved?.(questionIndex);
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

  // Detect ID questions (image-based); these should not be removable
  const isIdQuestion = !!(question as any).imageData;
  const shouldDisableActions = isOffline;

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
        <>
          <button
            onClick={onEdit}
            disabled={isSubmittedEdit || shouldDisableActions}
            className={`${buttonClass} ${(isSubmittedEdit || shouldDisableActions) ? disabledClass : 'hover:text-blue-500'}`}
            title={isSubmittedEdit ? 'Edit already submitted' : shouldDisableActions ? 'Unavailable offline' : 'Edit question'}
          >
            <FaEdit className="w-4 h-4" />
          </button>
          {!isIdQuestion && (
            <button
              onClick={handleDirectReport}
              disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions}
              className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions) ? disabledClass : 'hover:text-red-500'}`}
              title={isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : shouldDisableActions ? 'Unavailable offline' : 'Remove question'}
            >
              {isProcessingDirectReport ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              ) : (
                <FaTrash className="w-4 h-4" />
              )}
            </button>
          )}
        </>
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
      <>
        <button
          onClick={onEdit}
          disabled={isSubmittedEdit || shouldDisableActions}
          className={`${buttonClass} ${(isSubmittedEdit || shouldDisableActions) ? disabledClass : 'hover:text-blue-500'}`}
          title={isSubmittedEdit ? 'Edit already submitted' : shouldDisableActions ? 'Unavailable offline' : 'Edit question'}
        >
          <div className="flex items-center space-x-1">
            <FaEdit className="w-4 h-4" />
            <span className="text-sm">
              {isSubmittedEdit ? 'Edit Submitted' : 'Edit'}
            </span>
          </div>
        </button>
        {!isIdQuestion && (
          <button
            onClick={handleDirectReport}
            disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions}
            className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions) ? disabledClass : 'hover:text-red-600'}`}
            title={isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : shouldDisableActions ? 'Unavailable offline' : 'Quick remove question'}
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
        )}
      </>
    </div>
  );
};

export default QuestionActions;