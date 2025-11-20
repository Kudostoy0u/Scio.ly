"use client";
import logger from "@/lib/utils/logger";

import { addBookmark, removeBookmark } from "@/app/utils/bookmarks";
import { supabase } from "@/lib/supabase";
import React from "react";
import { FaBookmark, FaRegBookmark } from "react-icons/fa";
import { toast } from "react-toastify";

/**
 * Question interface for bookmark operations
 * Represents a Science Olympiad question with all necessary metadata
 */
export interface Question {
  /** Question text content */
  question: string;
  /** Optional answer choices for multiple choice questions */
  options?: string[];
  /** Correct answers (indices for multiple choice, text for free response) */
  answers: (number | string)[];
  /** Question difficulty level (0-1) */
  difficulty: number;
  /** Tournament name */
  tournament?: string;
  /** Division (B or C) */
  division?: string;
  /** Subject/event name */
  subject?: string;
  /** Subtopic within the event */
  subtopic?: string;
  /** Optional question ID */
  id?: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Optional base64 image data */
  imageData?: string;
}

/**
 * BookmarkManager component props interface
 * Defines all props required for bookmark management functionality
 */
interface BookmarkManagerProps {
  /** Question object to bookmark/unbookmark */
  question: Question;
  /** Whether the question is currently bookmarked */
  isBookmarked: boolean;
  /** Science Olympiad event name */
  eventName: string;
  /** Source context for the question */
  source: "test" | "unlimited" | "practice";
  /** Callback function when bookmark status changes */
  onBookmarkChange: (questionText: string, isBookmarked: boolean) => void;
  /** Whether dark mode is enabled */
  darkMode?: boolean;
  /** Size of the bookmark button */
  size?: "sm" | "md" | "lg";
  /** Whether to show the bookmark label */
  showLabel?: boolean;
}

/**
 * BookmarkManager component
 * Provides bookmark functionality for Science Olympiad questions
 * Handles adding/removing bookmarks with user authentication and visual feedback
 *
 * @param {BookmarkManagerProps} props - Component props
 * @returns {JSX.Element} Bookmark manager component
 * @example
 * ```tsx
 * <BookmarkManager
 *   question={question}
 *   isBookmarked={false}
 *   eventName="Anatomy & Physiology"
 *   source="test"
 *   onBookmarkChange={handleBookmarkChange}
 *   darkMode={false}
 *   size="md"
 *   showLabel={true}
 * />
 * ```
 */
const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  question,
  isBookmarked,
  eventName,
  source,
  onBookmarkChange,
  darkMode = false,
  size = "md",
  showLabel = false,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleBookmark = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.info("Please sign in to bookmark questions");
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      const key = question.imageData ? `id:${question.imageData}` : question.question;
      if (isBookmarked) {
        await removeBookmark(user.id, question, source);
        onBookmarkChange(key, false);
        toast.success("Bookmark removed!");
      } else {
        await addBookmark(user.id, question, eventName, source);
        onBookmarkChange(key, true);
        toast.success("Question bookmarked!");
      }
    } catch (error) {
      logger.error("Error managing bookmark:", error);
      toast.error(isBookmarked ? "Failed to remove bookmark" : "Failed to bookmark question");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={handleBookmark}
        disabled={isProcessing}
        className={`flex items-center space-x-1 p-2 rounded-md transition-all duration-200 ${
          isProcessing
            ? "opacity-50 cursor-not-allowed"
            : darkMode
              ? "hover:bg-gray-700 text-gray-300 hover:text-yellow-400"
              : "hover:bg-gray-100 text-gray-600 hover:text-yellow-600"
        }`}
      >
        {isProcessing ? (
          <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`}
          />
        ) : isBookmarked ? (
          <FaBookmark className={`${sizeClasses[size]} text-yellow-500`} />
        ) : (
          <FaRegBookmark className={sizeClasses[size]} />
        )}
        {showLabel && <span className="text-sm">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>}
      </button>
      {/* Custom tooltip */}
      <div
        className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
          darkMode
            ? "bg-gray-800 text-white border border-gray-700"
            : "bg-white text-gray-900 border border-gray-200 shadow-lg"
        }`}
      >
        {isBookmarked ? "Remove bookmark" : "Bookmark this question?"}
        <div
          className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
            darkMode ? "border-t-gray-800" : "border-t-white"
          }`}
        />
      </div>
    </div>
  );
};

export default BookmarkManager;
