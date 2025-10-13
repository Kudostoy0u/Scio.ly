'use client';

import { motion } from 'framer-motion';
import { AssignmentDetailsStepProps } from './assignmentTypes';

export default function AssignmentDetailsStep({
  darkMode,
  onNext,
  onBack: _onBack,
  onError,
  details,
  onDetailsChange,
  prefillEventName = '',
  availableEvents
}: AssignmentDetailsStepProps) {
  const handleNext = () => {
    const error = validateDetails();
    if (error) {
      onError(error);
      return;
    }
    onNext();
  };

  const validateDetails = () => {
    if (!details.title.trim()) {
      return 'Title is required to proceed';
    }
    if (!details.eventName.trim()) {
      return 'Event selection is required to proceed';
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
        Assignment Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="assignment-title" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="assignment-title"
            type="text"
            value={details.title}
            onChange={(e) => onDetailsChange({ title: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Enter assignment title"
          />
        </div>

        {!prefillEventName && (
          <div>
            <label htmlFor="event-selection" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Event *
            </label>
            <select
              id="event-selection"
              value={details.eventName}
              onChange={(e) => onDetailsChange({ eventName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Select an event</option>
              {availableEvents.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="assignment-type" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Type
          </label>
          <select
            id="assignment-type"
            value={details.assignmentType}
            onChange={(e) => onDetailsChange({ assignmentType: e.target.value as any })}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="homework">Homework</option>
            <option value="project">Project</option>
            <option value="study">Study Guide</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="assignment-due-date" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Due Date
          </label>
          <input
            id="assignment-due-date"
            type="date"
            value={details.dueDate}
            onChange={(e) => onDetailsChange({ dueDate: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

      </div>

      <div>
        <label htmlFor="assignment-description" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Description
        </label>
        <textarea
          id="assignment-description"
          value={details.description}
          onChange={(e) => onDetailsChange({ description: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
          rows={3}
          placeholder="Enter assignment description"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Next: Generate Questions
        </button>
      </div>
    </motion.div>
  );
}
