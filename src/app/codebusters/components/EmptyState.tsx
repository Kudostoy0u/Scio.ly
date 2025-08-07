import React from 'react';

interface EmptyStateProps {
  darkMode: boolean;
  hasAttemptedLoad: boolean;
  isLoading: boolean;
  error: string | null;
  quotes: unknown[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({ darkMode, hasAttemptedLoad, isLoading, error, quotes }) => {
  if (!hasAttemptedLoad || isLoading || error || quotes.length > 0) return null;

  return (
    <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
      <div className="flex flex-col items-center">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg font-medium mb-2">No questions available</p>
        <p className="text-sm opacity-75">Please check back later or try refreshing the page</p>
      </div>
    </div>
  );
};
