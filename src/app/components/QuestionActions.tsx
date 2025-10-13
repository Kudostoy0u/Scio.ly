'use client';
import logger from '@/lib/utils/logger';


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
      if (result.success && result.data.removed) {
        toast.success(result.data.reason || 'Question removed successfully!');

        onReportSubmitted?.(questionIndex);

        onQuestionRemoved?.(questionIndex);
      } else if (result.success && !result.data.removed) {
        toast.error(result.data.reason || 'Question removal not justified by AI');
        setHasRemovalFailed(true);
      } else {
        toast.error(result.data.reason || 'Failed to remove question');
        setHasRemovalFailed(true);
      }
    } catch (error) {
      logger.error('Error submitting direct report:', error);
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
          <div className="relative group">
            <button
              onClick={onEdit}
              disabled={isSubmittedEdit || shouldDisableActions}
              className={`${buttonClass} ${(isSubmittedEdit || shouldDisableActions) ? disabledClass : 'hover:text-blue-500'}`}
            >
              <FaEdit className="w-4 h-4" />
            </button>
            {/* Custom tooltip */}
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
              darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
            }`}>
              {isSubmittedEdit ? 'Edit already submitted' : shouldDisableActions ? 'Unavailable offline' : 'Edit this question?'}
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                darkMode ? 'border-t-gray-800' : 'border-t-white'
              }`}></div>
            </div>
          </div>
          {!isIdQuestion && (
            <div className="relative group">
              <button
                onClick={handleDirectReport}
                disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions}
                className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions) ? disabledClass : 'hover:text-red-500'}`}
              >
                {isProcessingDirectReport ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                ) : (
                  <FaTrash className="w-4 h-4" />
                )}
              </button>
              {/* Custom tooltip */}
              <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
              }`}>
                {isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : shouldDisableActions ? 'Unavailable offline' : 'Delete this question from our database?'}
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                  darkMode ? 'border-t-gray-800' : 'border-t-white'
                }`}></div>
              </div>
            </div>
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
        <div className="relative group">
          <button
            onClick={onEdit}
            disabled={isSubmittedEdit || shouldDisableActions}
            className={`${buttonClass} ${(isSubmittedEdit || shouldDisableActions) ? disabledClass : 'hover:text-blue-500'}`}
          >
            <div className="flex items-center space-x-1">
              <FaEdit className="w-4 h-4" />
              <span className="text-sm">
                {isSubmittedEdit ? 'Edit Submitted' : 'Edit'}
              </span>
            </div>
          </button>
          {/* Custom tooltip */}
          <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
            darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
          }`}>
            {isSubmittedEdit ? 'Edit already submitted' : shouldDisableActions ? 'Unavailable offline' : 'Edit this question?'}
            <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
              darkMode ? 'border-t-gray-800' : 'border-t-white'
            }`}></div>
          </div>
        </div>
        {!isIdQuestion && (
          <div className="relative group">
            <button
              onClick={handleDirectReport}
              disabled={isProcessingDirectReport || isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions}
              className={`${buttonClass} ${(isSubmittedReport || hasRemovalFailed || isRemovalFailed || shouldDisableActions) ? disabledClass : 'hover:text-red-600'}`}
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
            {/* Custom tooltip */}
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
              darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
            }`}>
              {isSubmittedReport ? 'Already reported' : hasRemovalFailed || isRemovalFailed ? 'Removal failed' : shouldDisableActions ? 'Unavailable offline' : 'Delete this question from our database?'}
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                darkMode ? 'border-t-gray-800' : 'border-t-white'
              }`}></div>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default QuestionActions;