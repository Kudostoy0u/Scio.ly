"use client";

import { FaShareAlt } from "react-icons/fa";

interface ActionButtonsProps {
  darkMode: boolean;
  isOffline: boolean;
  quotesLength: number;
  onReset: () => void;
  onPrint: () => void;
  onShare: () => void;
}

export default function ActionButtons({
  darkMode,
  isOffline,
  quotesLength,
  onReset,
  onPrint,
  onShare,
}: ActionButtonsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onReset}
          title="Reset Test"
          className={`flex items-center transition-all duration-200 ${
            darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Reset icon"
          >
            <title>Reset icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-sm">Reset</span>
        </button>
        <button
          type="button"
          onClick={onPrint}
          disabled={isOffline || quotesLength === 0}
          title={isOffline ? "Print feature not available offline" : "Print Test"}
          className={`flex items-center transition-all duration-200 ${
            isOffline || quotesLength === 0
              ? "text-gray-400 cursor-not-allowed"
              : darkMode
                ? "text-gray-400 hover:text-gray-300"
                : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Print icon"
          >
            <title>Print icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span className="text-sm">Print</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onShare}
        disabled={isOffline}
        title={isOffline ? "Share feature not available offline" : "Share Test"}
      >
        <div
          className={`flex items-center transition-all duration-200 ${
            isOffline ? "text-gray-400 cursor-not-allowed" : "text-blue-400 hover:text-blue-500"
          }`}
        >
          <FaShareAlt className="transition-all duration-500 mr-2" />
          <span className="text-sm">Take together</span>
        </div>
      </button>
    </div>
  );
}
