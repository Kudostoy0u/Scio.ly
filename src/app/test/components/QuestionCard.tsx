'use client';
import React from 'react';
import { Question } from '@/app/utils/geminiService';
import { isMultiSelectQuestion } from '@/app/utils/questionUtils';
import QuestionActions from '@/app/components/QuestionActions';
import MarkdownExplanation from '@/app/utils/MarkdownExplanation';

interface QuestionCardProps {
  question: Question;
  index: number;
  userAnswers: (string | null)[];
  isSubmitted: boolean;
  darkMode: boolean;
  eventName: string;
  isBookmarked: boolean;
  gradingResults: Record<number, number>;
  explanations: Record<number, string>;
  loadingExplanation: Record<number, boolean>;
  submittedReports: Record<number, boolean>;
  submittedEdits: Record<number, boolean>;
  gradingFRQs: Record<number, boolean>;
  onAnswerChange: (index: number, answer: string | null, multiselect?: boolean) => void;
  onBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
  onReportSubmitted: (index: number) => void;
  onEditSubmitted: (index: number) => void;
  onEdit: (question: Question) => void;
  onQuestionRemoved: (questionIndex: number) => void;
  onGetExplanation: (index: number, question: Question, userAnswer: (string | null)[]) => void;
}

export default function QuestionCard({
  question,
  index,
  userAnswers,
  isSubmitted,
  darkMode,
  eventName,
  isBookmarked,
  gradingResults,
  explanations,
  loadingExplanation,
  submittedReports,
  submittedEdits,
  gradingFRQs,
  onAnswerChange,
  onBookmarkChange,
  onReportSubmitted,
  onEditSubmitted,
  onEdit,
  onQuestionRemoved,
  onGetExplanation
}: QuestionCardProps) {
  const isMultiSelect = isMultiSelectQuestion(question.question, question.answers);
  const currentAnswers = userAnswers || [];

  return (
    <div
      className={`relative border p-4 rounded-lg shadow-sm transition-all duration-500 ease-in-out mb-6 ${
        darkMode
          ? 'bg-gray-700 border-gray-600 text-white'
          : 'bg-gray-50 border-gray-300 text-black'
      }`}
    >
      <div className="flex justify-between items-start">
        <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Question {index + 1}
        </h3>
        <QuestionActions
          question={question}
          questionIndex={index}
          isBookmarked={isBookmarked}
          eventName={eventName}
          source="test"
          onBookmarkChange={onBookmarkChange}
          darkMode={darkMode}
          compact={true}
          isSubmittedReport={submittedReports[index]}
          isSubmittedEdit={submittedEdits[index]}
          onReportSubmitted={onReportSubmitted}
          onEditSubmitted={onEditSubmitted}
          isSubmitted={isSubmitted}
          onEdit={() => onEdit(question)}
          onQuestionRemoved={onQuestionRemoved}
        />
      </div>
      
      {question.imageData && (
        <div className="mb-4 w-full flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.imageData} alt="Mineral" className="max-h-64 rounded-md border" />
        </div>
      )}
      <p className="mb-4 break-words whitespace-normal overflow-x-auto">{question.question}</p>

      {question.options && question.options.length > 0 ? (
        <div className="space-y-2">
          {question.options.map((option, optionIndex) => (
            <label
              key={optionIndex}
              className={`block p-2 rounded-md ${
                (() => {
                  if (!isSubmitted) {
                    return darkMode ? 'bg-gray-700' : 'bg-gray-200';
                  }
                  
                  const correctAnswers = question.answers.map(ans => {
                    if (typeof ans === 'string') {
                      if (ans === "") return undefined;
                      return ans;
                    } else if (typeof ans === 'number') {
                      return question.options && ans >= 0 && ans < question.options.length 
                        ? question.options[ans] 
                        : undefined;
                    }
                    return undefined;
                  }).filter((text): text is string => text !== undefined);
                  
                  const isCorrectAnswer = correctAnswers.includes(option);
                  const isUserSelected = currentAnswers.includes(option);
                  
                  // Check if the question was answered correctly overall
                  const score = gradingResults[index] ?? 0;
                  const isQuestionCorrect = score === 1 || score === 2 || score === 3;
                  
                  // Check if the question was completely skipped (no answers provided)
                  const isQuestionSkipped = !currentAnswers.length || !currentAnswers[0];
                  
                  if (isCorrectAnswer && isUserSelected) {
                    // User selected correct answer - always green
                    return darkMode ? 'bg-green-800' : 'bg-green-200';
                  } else if (isCorrectAnswer && !isUserSelected) {
                    // Correct answer that user didn't select
                    if (isQuestionSkipped) {
                      // If question was skipped, show correct answers in blue
                      return darkMode ? 'bg-blue-700' : 'bg-blue-200';
                    } else if (isQuestionCorrect) {
                      // If question is correct, show unselected correct answers in blue
                      return darkMode ? 'bg-blue-700' : 'bg-blue-200';
                    } else {
                      // If question is wrong, show correct answers in green
                      return darkMode ? 'bg-green-800' : 'bg-green-200';
                    }
                  } else if (!isCorrectAnswer && isUserSelected) {
                    // User selected wrong answer - always red
                    return darkMode ? 'bg-red-900' : 'bg-red-200';
                  } else {
                    // Neither correct nor selected - gray
                    return darkMode ? 'bg-gray-700' : 'bg-gray-200';
                  }
                })()
              } ${!isSubmitted && (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300')}`}
            >
              <input
                type={isMultiSelect ? "checkbox" : "radio"}
                name={`question-${index}`}
                value={option}
                checked={currentAnswers.includes(option)}
                onChange={() => onAnswerChange(index, option, isMultiSelect)}
                disabled={isSubmitted}
                className="mr-2"
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={currentAnswers[0] || ''}
          onChange={(e) => onAnswerChange(index, e.target.value)}
          disabled={isSubmitted}
          className={`w-full p-2 border rounded-md ${
            darkMode ? 'bg-gray-700' : 'bg-white'
          }`}
          rows={3}
          placeholder="Type your answer here..."
        />
      )}

      {isSubmitted && (
        <>
                     {(() => {
             const score = gradingResults[index] ?? 0;
             const isGrading = gradingFRQs[index];
             
             if (isGrading) {
               return (
                 <p className="mt-2 font-semibold text-blue-500">
                   Grading...
                 </p>
               );
             }
             
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
               <>
                 <p className={`mt-2 font-semibold ${resultColor}`}>
                   {resultText}
                 </p>
                 {!question.options?.length && (
                   <p className="text-sm mt-1">
                     <strong>Correct Answer(s):</strong>{' '}
                     {question.answers.join(', ')}
                   </p>
                 )}
               </>
             );
           })()}
          
          <div className="mt-2">
            {!explanations[index] ? (
              <button
                onClick={() => onGetExplanation(index, question, currentAnswers)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
                disabled={loadingExplanation[index]}
              >
                {loadingExplanation[index] ? (
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
              <MarkdownExplanation text={explanations[index]} />
            )}
          </div>
        </>
      )}
      
      <br />
      
      {/* Difficulty Bar */}
      <div className="absolute bottom-2 right-2 w-20 h-2 rounded-full bg-gray-300">
        <div
          className={`h-full rounded-full ${
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
