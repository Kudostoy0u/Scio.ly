'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface FloatingActionButtonsProps {
  darkMode: boolean;
  onReset: () => void;
  showReferenceButton?: boolean;
  onShowReference?: () => void;
  eventName?: string;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  darkMode,
  onReset,
  showReferenceButton = false,
  onShowReference,
  eventName
}) => {
  const buttonBaseClasses = `p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
    darkMode
      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800'
  }`;

  const resetIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </svg>
  );

  return (
    <>
      {/* Desktop Reset Button - Top Right */}
      <button
        onClick={onReset}
        className={`hidden md:block absolute top-4 right-4 z-50 ${buttonBaseClasses}`}
        title="Reset Test"
        aria-label="Reset Test"
      >
        {resetIcon}
      </button>

      {/* Mobile Buttons Container */}
      <div className="md:hidden fixed bottom-8 right-4 z-50 flex flex-col gap-4">
        {/* Mobile Reset Button */}
        <button
          onClick={onReset}
          className={buttonBaseClasses}
          title="Reset Test"
          aria-label="Reset Test"
        >
          {resetIcon}
        </button>

        {/* Mobile Reference Button - Only for Codebusters */}
        {showReferenceButton && onShowReference && eventName === 'Codebusters' && (
          <button
            onClick={onShowReference}
            className={buttonBaseClasses}
            title="Codebusters Reference"
            aria-label="Open Codebusters Reference"
          >
            <FileText className="h-5 w-5" />
          </button>
        )}
      </div>

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
