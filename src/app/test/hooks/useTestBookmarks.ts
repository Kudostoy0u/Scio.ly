import { loadBookmarksFromSupabase } from "@/app/utils/bookmarks";
import type { Question } from "@/app/utils/geminiService";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

/**
 * Hook for managing bookmarked questions
 * Handles loading bookmarks from Supabase and managing bookmark state
 *
 * @returns Bookmark state and handlers
 */
export function useTestBookmarks() {
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<string, boolean>>({});

  // Load bookmarks on mount
  useEffect(() => {
    import("./utils/bookmarks")
      .then(async ({ fetchUserBookmarks }) => {
        try {
          const map = await fetchUserBookmarks(supabase, loadBookmarksFromSupabase);
          setBookmarkedQuestions(map);
        } catch {
          // Ignore errors - bookmarks are non-critical
        }
      })
      .catch(() => {
        // Ignore errors - fallback handling is already in place
      });
  }, []);

  /**
   * Handle bookmark state changes
   */
  const handleBookmarkChange = (questionText: string, isBookmarked: boolean) => {
    setBookmarkedQuestions((prev) => ({
      ...prev,
      [questionText]: isBookmarked,
    }));
  };

  /**
   * Generate bookmark key for a question
   */
  const getBookmarkKey = (q: Question): string => {
    return q.question;
  };

  /**
   * Check if a question is bookmarked
   */
  const isQuestionBookmarked = (question: Question): boolean => {
    const key = getBookmarkKey(question);
    return bookmarkedQuestions[key] === true;
  };

  return {
    bookmarkedQuestions,
    handleBookmarkChange,
    isQuestionBookmarked,
    getBookmarkKey,
  };
}
