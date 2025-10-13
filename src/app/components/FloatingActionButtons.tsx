'use client';

import React from 'react';
import { FileText } from 'lucide-react';

/**
 * FloatingActionButtons component props interface
 * Defines all props required for floating action button functionality
 */
interface FloatingActionButtonsProps {
  /** Whether dark mode is enabled */
  darkMode: boolean;
  /** Whether to show the reference button */
  showReferenceButton?: boolean;
  /** Callback function when reference button is clicked */
  onShowReference?: () => void;
  /** Science Olympiad event name for conditional display */
  eventName?: string;
  /** Whether the buttons should be hidden */
  hidden?: boolean;
}

/**
 * FloatingActionButtons component
 * Provides floating action buttons for quick access to common features
 * Displays reference button for Codebusters event with responsive design
 * 
 * @param {FloatingActionButtonsProps} props - Component props
 * @returns {JSX.Element | null} Floating action buttons component or null if hidden
 * @example
 * ```tsx
 * <FloatingActionButtons
 *   darkMode={false}
 *   showReferenceButton={true}
 *   onShowReference={handleShowReference}
 *   eventName="Codebusters"
 *   hidden={false}
 * />
 * ```
 */
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
