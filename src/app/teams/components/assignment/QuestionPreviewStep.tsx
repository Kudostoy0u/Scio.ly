'use client';

import { motion } from 'framer-motion';
import { QuestionPreviewStepProps } from './assignmentTypes';

export default function QuestionPreviewStep({
  darkMode,
  onNext,
  onBack,
  questions,
  showAnswers,
  onShowAnswersChange,
  onReplaceQuestion
}: QuestionPreviewStepProps) {
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
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs font-medium text-green-800 mb-1">Correct Answer:</p>
                <p className="text-sm text-green-700">{question.correct_answer}</p>
              </div>
            )}
            
            {question.options && (
              <div className="mt-2 space-y-1">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className={`text-xs p-2 rounded ${
                    showAnswers && option.isCorrect
                      ? 'bg-green-100 text-green-800'
                      : darkMode 
                        ? 'bg-gray-600 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {String.fromCharCode(65 + optIndex)}. {option.text}
                    {showAnswers && option.isCorrect && (
                      <span className="ml-2 text-green-600 font-medium">✓</span>
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
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
