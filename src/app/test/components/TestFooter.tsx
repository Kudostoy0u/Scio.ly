'use client';
import React from 'react';

interface TestFooterProps {
  isSubmitted: boolean;
  darkMode: boolean;
  onSubmit: () => void;
  onReset: () => void;
  onBackToMain: () => void;
}

export default function TestFooter({ 
  isSubmitted, 
  darkMode, 
  onSubmit, 
  onReset, 
  onBackToMain 
}: TestFooterProps) {
  return (
    <>
      {/* Submit Button */}
      <div className="text-center">
        {isSubmitted ? (
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
        ) : (
          <button
            onClick={onSubmit}
            className={`w-full px-4 py-2 font-semibold rounded-lg ${
              darkMode
                ? 'bg-gray-800 text-blue-300 border-2 border-blue-300 hover:bg-gray-700 hover:text-blue-200 hover:border-blue-200'
                : 'bg-gray-200 text-blue-700 border-2 border-blue-700 hover:bg-gray-100 hover:text-blue-600 hover:border-blue-600'
            }`}
          >
            Submit Answers
          </button>
        )}
      </div>

      {/* Fixed Back Button */}
      <button
        onClick={onBackToMain}
        className={`fixed bottom-8 left-8 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/50'
            : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/50'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
    </>
  );
}
