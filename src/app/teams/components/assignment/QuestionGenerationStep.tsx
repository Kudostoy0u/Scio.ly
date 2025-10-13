'use client';

import { motion } from 'framer-motion';
import { QuestionGenerationStepProps } from './assignmentTypes';

export default function QuestionGenerationStep({
  darkMode,
  onNext,
  onBack,
  onError,
  settings,
  onSettingsChange,
  availableSubtopics,
  supportsPictureQuestions,
  supportsIdentificationOnly,
  onGenerateQuestions: _onGenerateQuestions,
  generatingQuestions
}: QuestionGenerationStepProps) {
  const handleNext = () => {
    const error = validateSettings();
    if (error) {
      onError(error);
      return;
    }
    
    // The parent component will handle question generation
    onNext();
  };

  const validateSettings = () => {
    if (settings.questionCount < 1 || settings.questionCount > 50) {
      return 'Question count must be between 1 and 50';
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Question Generation
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="question-count" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Question Count
          </label>
          <input
            id="question-count"
            type="number"
            value={settings.questionCount}
            onChange={(e) => onSettingsChange({ questionCount: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            min="1"
            max="50"
          />
        </div>

      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Question Type
        </label>
        <div className="flex gap-4">
          {[
            { value: 'mcq', label: 'MCQ' },
            { value: 'both', label: 'Both' },
            { value: 'frq', label: 'FRQ' }
          ].map(type => (
            <label key={type.value} className="flex items-center">
              <input
                type="radio"
                name="questionType"
                value={type.value}
                checked={settings.questionType === type.value}
                onChange={(e) => onSettingsChange({ questionType: e.target.value as any })}
                className="mr-2"
              />
              <span className={darkMode ? 'text-white' : 'text-gray-900'}>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Subtopics (optional)
        </label>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
          {availableSubtopics.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {availableSubtopics.map(subtopic => (
                <label key={subtopic} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.selectedSubtopics.includes(subtopic)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSettingsChange({ 
                          selectedSubtopics: [...settings.selectedSubtopics, subtopic] 
                        });
                      } else {
                        onSettingsChange({ 
                          selectedSubtopics: settings.selectedSubtopics.filter(s => s !== subtopic) 
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>{subtopic}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No subtopics available for this event
            </div>
          )}
        </div>
      </div>

      {/* Picture Questions slider for events with image ID */}
      {supportsPictureQuestions && (
        <div>
          <label htmlFor="idPercentage" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Picture Questions
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              id="idPercentage"
              min={0}
              max={settings.questionCount}
              value={settings.idPercentage}
              onChange={(e) => onSettingsChange({ idPercentage: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {settings.idPercentage} questions
            </span>
          </div>
        </div>
      )}

      {/* Identification Only checkbox */}
      {supportsIdentificationOnly && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pureIdOnly"
            checked={settings.pureIdOnly}
            onChange={(e) => onSettingsChange({ pureIdOnly: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="pureIdOnly" className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Identification Only Mode
          </label>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={generatingQuestions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generatingQuestions ? 'Generating Questions...' : 'Next: Preview Questions'}
        </button>
      </div>
    </motion.div>
  );
}
