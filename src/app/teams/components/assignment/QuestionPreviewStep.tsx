'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { QuestionPreviewStepProps } from './assignmentTypes';

export default function QuestionPreviewStep({
  onNext,
  onBack,
  questions,
  showAnswers,
  onShowAnswersChange,
  onReplaceQuestion
}: Omit<QuestionPreviewStepProps, 'darkMode'>) {
  const { darkMode } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Question Preview ({questions.length} questions)
        </h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showAnswers}
            onChange={(e) => onShowAnswersChange(e.target.checked)}
            className="rounded"
          />
          <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Show Answers
          </span>
        </label>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {questions.map((question, index) => (
          <div key={index} className={`p-3 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Q{index + 1} ({question.question_type})
              </span>
              <button
                onClick={() => onReplaceQuestion(index)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Replace
              </button>
            </div>
            
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {question.question_text}
            </p>
            
            {question.imageData && (
              <div className="mt-3 w-full flex justify-center">
                <img 
                  src={question.imageData} 
                  alt="Question Image" 
                  className="max-h-48 max-w-full rounded-md border object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {showAnswers && question.correct_answer && (
              <div className="mt-2">
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  {question.correct_answer}
                </p>
              </div>
            )}
            
            {question.options && (
              <div className="mt-2 space-y-1">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className={`text-xs p-2 rounded flex items-center ${
                    showAnswers && option.isCorrect
                      ? darkMode 
                        ? 'bg-green-800/40 text-green-300' 
                        : 'bg-green-100 text-green-700'
                      : darkMode 
                        ? 'bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    <span className="flex-grow">{option.text}</span>
                    {showAnswers && option.isCorrect && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className={`px-4 py-2 border rounded-lg ${
            darkMode 
              ? 'border-gray-600 text-gray-300 hover:bg-gray-800' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next: Select Roster
        </button>
      </div>
    </motion.div>
  );
}
