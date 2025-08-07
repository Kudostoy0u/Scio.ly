import React from 'react';

interface FloatingButtonsProps {
  darkMode: boolean;
  onBack: () => void;
  onShowPDF: () => void;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({ 
  darkMode, 
  onBack, 
  onShowPDF 
}) => {
  return (
    <>
      {/* Fixed Back Button */}
      <button
        onClick={onBack}
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

      {/* Add the reference button as sticky at the bottom */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={onShowPDF}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
            darkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800'
          }`}
          title="Codebusters Reference"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    </>
  );
};
