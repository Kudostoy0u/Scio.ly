'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface FloatingActionButtonsProps {
  darkMode: boolean;
  showReferenceButton?: boolean;
  onShowReference?: () => void;
  eventName?: string;
  hidden?: boolean;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  darkMode,
  showReferenceButton = false,
  onShowReference,
  eventName,
  hidden = false
}) => {
  const buttonBaseClasses = `p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
    darkMode
      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800'
  }`;

  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Mobile Reference Button - Only for Codebusters */}
      {showReferenceButton && onShowReference && eventName === 'Codebusters' && (
        <div className="md:hidden fixed bottom-8 right-4 z-50 flex flex-col gap-4">
          <button
            onClick={onShowReference}
            className={buttonBaseClasses}
            title="Codebusters Reference"
            aria-label="Open Codebusters Reference"
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Desktop Reference Button - Bottom Right */}
      {showReferenceButton && onShowReference && (
        <button
          onClick={onShowReference}
          className={`hidden md:block fixed bottom-8 right-8 z-50 ${buttonBaseClasses}`}
          title={`${eventName || 'Codebusters'} Reference`}
          aria-label={`Open ${eventName || 'Codebusters'} Reference`}
        >
          <FileText className="h-5 w-5" />
        </button>
      )}
    </>
  );
};
