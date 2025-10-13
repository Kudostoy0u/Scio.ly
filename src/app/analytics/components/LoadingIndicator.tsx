import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  darkMode?: boolean;
}

export default function LoadingIndicator({ 
  message = "Loading data...", 
  showProgress = false, 
  progress = 0,
  darkMode = false 
}: LoadingIndicatorProps) {
  return (
    <div className={`flex items-center justify-center p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {message}
        </p>
        {showProgress && (
          <div className={`w-full bg-gray-200 rounded-full h-2 mt-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
