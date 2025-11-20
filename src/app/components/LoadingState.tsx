import type React from "react";

interface LoadingStateProps {
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  onRetry?: () => void;
  onGoToPractice?: () => void;
  loadingMessage?: string;
  loadingSubtext?: string;
  errorIcon?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  darkMode,
  onRetry,
  onGoToPractice,
  loadingMessage = "Loading questions...",
  loadingSubtext = "Please wait while we prepare your questions",
  errorIcon = "⚠️",
}) => {
  if (isLoading) {
    return (
      <div className={`text-center py-12 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
          <p className="text-lg font-medium">{loadingMessage}</p>
          <p className="text-sm mt-2 opacity-75">{loadingSubtext}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${darkMode ? "text-red-400" : "text-red-600"}`}>
        <div className="flex flex-col items-center">
          <div className="text-6xl mb-4">{errorIcon}</div>
          <p className="text-lg font-medium mb-2">Failed to load questions</p>
          <p className="text-sm opacity-75 mb-4">{error}</p>
          {error.includes("No test parameters found") && onGoToPractice ? (
            <button
              onClick={onGoToPractice}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Go to Practice Page
            </button>
          ) : onRetry ? (
            <button
              onClick={onRetry}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              Try Again
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
};

interface EmptyStateProps {
  darkMode: boolean;
  shouldShow: boolean;
  emptyIcon?: string;
  emptyMessage?: string;
  emptySubtext?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  darkMode,
  shouldShow,
  emptyIcon = "📝",
  emptyMessage = "No questions available",
  emptySubtext = "Please check back later or try refreshing the page",
}) => {
  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`text-center py-12 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
      <div className="flex flex-col items-center">
        <div className="text-6xl mb-4">{emptyIcon}</div>
        <p className="text-lg font-medium mb-2">{emptyMessage}</p>
        <p className="text-sm opacity-75">{emptySubtext}</p>
      </div>
    </div>
  );
};
