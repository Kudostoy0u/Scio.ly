'use client';
import React from 'react';
import QuestionActions from '@/app/components/QuestionActions';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';
import { Question } from '@/app/utils/geminiService';
import { isMultiSelectQuestion } from '@/app/utils/questionUtils';

type Props = {
  question: Question;
  questionIndex: number;
  darkMode: boolean;
  isSubmitted: boolean;
  gradingScore: number | undefined;
  currentAnswers: (string | null)[];
  isLoadingId: boolean;
  showIdSpinner: boolean;
  onAnswerToggle: (answer: string | null, multiselect: boolean) => void;
  onGetExplanation: () => void;
  explanation?: string;
  loadingExplanation: boolean;
  // Actions
  isBookmarked: boolean;
  eventName: string;
  onBookmarkChange: (key: string, isBookmarked: boolean) => void;
  isSubmittedReport: boolean;
  isSubmittedEdit: boolean;
  onEdit: () => void;
  onQuestionRemoved: (questionIndex: number) => void;
};

export default function QuestionCard(props: Props) {
  const {
    question,
    questionIndex,
    darkMode,
    isSubmitted,
    gradingScore,
    currentAnswers,
    isLoadingId,
    showIdSpinner,
    onAnswerToggle,
    onGetExplanation,
    explanation,
    loadingExplanation,
    isBookmarked,
    eventName,
    onBookmarkChange,
    isSubmittedReport,
    isSubmittedEdit,
    onEdit,
    onQuestionRemoved,
  } = props;

  const isMultiSelect = isMultiSelectQuestion(question.question, question.answers);
  // Key used by parent for bookmarking; not needed here

  const correctAnswersText = question.options?.length
    ? question.answers
        .map((ans) => question.options?.[ans as number])
        .join(', ')
    : question.answers.join(', ');

  return (
    <div className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out ${
      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-black'
    }`}>
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-lg">Question</h3>
        <QuestionActions
          question={question}
          questionIndex={questionIndex}
          isBookmarked={isBookmarked}
          eventName={eventName}
          source="unlimited"
          onBookmarkChange={onBookmarkChange}
          darkMode={darkMode}
          compact={true}
          isSubmittedReport={isSubmittedReport}
          isSubmittedEdit={isSubmittedEdit}
          onReportSubmitted={() => {}}
          _isSubmitted={isSubmitted}
          onEdit={onEdit}
          onQuestionRemoved={onQuestionRemoved}
        />
      </div>

      {isLoadingId && showIdSpinner ? (
        <div className="flex items-center justify-center h-32 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {question.imageData && (
            <div className="mb-4 w-full flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={question.imageData} alt="Question image" className="max-h-64 rounded-md border" />
            </div>
          )}
          <p className="mb-4 break-words whitespace-normal overflow-x-auto">{question.question}</p>
        </>
      )}

      {question.options && question.options.length > 0 ? (
        <div className="space-y-2">
          {question.options.map((option, idx) => {
            const correctAnswers = question.answers
              .map((ans) => (typeof ans === 'number' ? question.options?.[ans] : ans))
              .filter((text): text is string => !!text && text !== '');
            const isCorrectAnswer = correctAnswers.includes(option);
            const isUserSelected = currentAnswers.includes(option);

            const bgClass = (() => {
              if (isSubmitted && isUserSelected) {
                return gradingScore && gradingScore >= 1
                  ? darkMode ? 'bg-green-800' : 'bg-green-200'
                  : isCorrectAnswer
                    ? darkMode ? 'bg-green-800' : 'bg-green-200'
                    : darkMode ? 'bg-red-900' : 'bg-red-200';
              } else if (isSubmitted && isCorrectAnswer && !isUserSelected) {
                return darkMode ? 'bg-green-800' : 'bg-green-200';
              }
              return darkMode ? 'bg-gray-700' : 'bg-gray-200';
            })();

            return (
              <label key={idx} className={`block p-2 rounded-md ${bgClass} ${!isSubmitted && (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300')}`}>
                <input
                  type={isMultiSelect ? 'checkbox' : 'radio'}
                  name={`question-${questionIndex}`}
                  value={option}
                  checked={isUserSelected}
                  onChange={() => onAnswerToggle(option, isMultiSelect)}
                  disabled={isSubmitted}
                  className="mr-2"
                />
                {option}
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          value={currentAnswers[0] || ''}
          onChange={(e) => onAnswerToggle(e.target.value, false)}
          disabled={isSubmitted}
          className={`w-full p-2 border rounded-md  ${
            isSubmitted 
              ? gradingScore === 1
                ? darkMode ? 'bg-green-800 border-green-700' : 'bg-green-200 border-green-300'
                : gradingScore === 0
                ? darkMode ? 'bg-red-900 border-red-800' : 'bg-red-200 border-red-300'
                : darkMode ? 'bg-amber-400 border-amber-500' : 'bg-amber-400 border-amber-500'
              : darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
          }`}
          rows={3}
          placeholder="Type your answer here..."
        />
      )}

      {isSubmitted && (
        <>
          {(() => {
            const score = gradingScore ?? 0;
            let resultText = '';
            let resultColor = '';
            if (!currentAnswers[0]) {
              resultText = 'Skipped';
              resultColor = 'text-blue-500';
            } else if (score === 1 || score === 2 || score === 3) {
              resultText = 'Correct!';
              resultColor = 'text-green-600';
            } else if (score === 0) {
              resultText = 'Wrong!';
              resultColor = 'text-red-600';
            } else {
              resultText = 'Partial Credit';
              resultColor = 'text-amber-400';
            }
            return (
              <p className={`mt-2 font-semibold ${resultColor}`}>{resultText}</p>
            );
          })()}
          <p className="text-sm mt-1">
            <strong>Correct Answer(s):</strong> {correctAnswersText}
          </p>
          <div className="mt-2">
            {!explanation ? (
              <button
                onClick={onGetExplanation}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
                disabled={loadingExplanation}
              >
                {loadingExplanation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                ) : (
                  <>
                    <span>Explain</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <MarkdownExplanation text={explanation} />
            )}
          </div>
        </>
      )}

      <br />
      <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300 ">
        <div
          className={`h-full rounded-full  ${
            question.difficulty >= 0.66
              ? 'bg-red-500'
              : question.difficulty >= 0.33
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${question.difficulty * 100}%` }}
        ></div>
      </div>
    </div>
  );
}


