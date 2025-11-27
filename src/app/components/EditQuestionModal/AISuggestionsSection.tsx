"use client";
import type { EditSuggestion } from "@/app/utils/geminiService";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface AISuggestionsSectionProps {
  darkMode: boolean;
  hasImage: boolean;
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  suggestions: EditSuggestion | null;
  onGetSuggestions: () => void;
}

export function AISuggestionsSection({
  darkMode,
  hasImage,
  isLoadingSuggestions,
  showSuggestions,
  suggestions,
  onGetSuggestions,
}: AISuggestionsSectionProps) {
  if (showSuggestions && suggestions) {
    return (
      <div
        className={`mb-6 p-4 rounded-lg border ${
          darkMode ? "bg-gray-700/50 border-gray-600" : "bg-white/80 border-blue-200"
        }`}
      >
        <div className="flex items-start space-x-3 mb-3">
          <div className={`p-1.5 rounded-full ${darkMode ? "bg-green-600/20" : "bg-green-100"}`}>
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="AI Suggestion"
            >
              <title>AI Suggestion</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">
              Suggested Improvements:
            </p>
            <p
              className={`text-sm leading-relaxed ${darkMode ? "text-gray-200" : "text-gray-700"}`}
            >
              Suggestions generated for this question.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Suggestions have been auto-applied
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 p-4 rounded-xl border-2 shadow-sm ${
        darkMode
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600"
          : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div
            className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
              darkMode ? "bg-blue-600/20" : "bg-blue-100"
            }`}
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="AI Bot"
            >
              <title>AI Bot</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
              AI-Powered Suggestions
            </h4>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {hasImage
                ? "Get intelligent recommendations for improving this image-based question"
                : "Get intelligent recommendations for improving this question"}
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onGetSuggestions}
          disabled={isLoadingSuggestions}
          className={`relative overflow-hidden rounded-lg border-2 flex-shrink-0 ml-2 p-2 flex items-center justify-center ${
            darkMode
              ? "bg-transparent text-blue-400 border-blue-400 hover:text-blue-300 hover:border-blue-300"
              : "bg-transparent text-blue-600 border-blue-600 hover:text-blue-500 hover:border-blue-500"
          } ${isLoadingSuggestions ? "cursor-not-allowed" : ""}`}
        >
          {isLoadingSuggestions ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          ) : (
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
