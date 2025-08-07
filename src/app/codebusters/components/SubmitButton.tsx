import React from 'react';

interface SubmitButtonProps {
  isTestSubmitted: boolean;
  darkMode: boolean;
  onSubmit: () => void;
  onReset: () => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  isTestSubmitted, 
  darkMode, 
  onSubmit, 
  onReset 
}) => {
  return (
    <div className="text-center mt-6">
      {!isTestSubmitted ? (
        <button
          onClick={onSubmit}
          disabled={isTestSubmitted}
          className={`w-full px-4 py-2 font-semibold rounded-lg ${
            darkMode
              ? 'bg-gray-800 text-blue-300 border-2 border-blue-300 hover:bg-gray-700 hover:text-blue-200 hover:border-blue-200'
              : 'bg-gray-200 text-blue-700 border-2 border-blue-700 hover:bg-gray-100 hover:text-blue-600 hover:border-blue-600'
          }`}
        >
          Submit Answers
        </button>
      ) : (
        <button
          onClick={onReset}
          className={`w-full px-4 py-2 font-semibold rounded-lg ${
            darkMode
              ? 'bg-gray-800 text-blue-300 border-2 border-blue-300 hover:bg-gray-700 hover:text-blue-200 hover:border-blue-200'
              : 'bg-gray-200 text-blue-700 border-2 border-blue-700 hover:bg-gray-100 hover:text-blue-600 hover:border-blue-600'
          }`}
        >
          Reset Test
        </button>
      )}
    </div>
  );
};
