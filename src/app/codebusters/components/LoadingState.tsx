import React from 'react';

interface LoadingStateProps {
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  onRetry: () => void;
  onGoToPractice: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  isLoading, 
  error, 
  darkMode, 
  onRetry, 
  onGoToPractice 
}) => {
  if (isLoading) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-medium">Loading Codebusters questions...</p>
          <p className="text-sm mt-2 opacity-75">Please wait while we prepare your cipher challenges</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
        <div className="flex flex-col items-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-lg font-medium mb-2">Failed to load questions</p>
          <p className="text-sm opacity-75 mb-4">{error}</p>
          {error.includes('No test parameters found') ? (
            <button
              onClick={onGoToPractice}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Go to Practice Page
            </button>
          ) : (
            <button
              onClick={onRetry}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
