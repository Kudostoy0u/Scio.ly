"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { loadBookmarksFromSupabase, removeBookmark } from "@/app/utils/bookmarks";
import { clearTestSession } from "@/app/utils/timeManagement";
import { supabase } from "@/lib/supabase";
import Header from "@components/Header";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Question {
  question: string;
  options?: string[];
  answers: (string | number)[];
  difficulty: number;
}

interface BookmarkedQuestion {
  question: Question;
  eventName: string;
  source: string;
  timestamp: number;
}

const BookmarkedQuestionDisplay = ({
  bookmarkedQuestion,
  darkMode,
  onRemove,
}: {
  bookmarkedQuestion: BookmarkedQuestion;
  darkMode: boolean;
  onRemove: (questionToRemove: BookmarkedQuestion) => void;
}) => {
  const { question } = bookmarkedQuestion;

  return (
    <div
      className={`relative p-4 rounded-md ${darkMode ? "bg-gray-800/50" : "bg-gray-100/80"} border ${darkMode ? "border-gray-600" : "border-gray-200"}`}
    >
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(bookmarkedQuestion)}
        className={`absolute top-1 right-1 p-1 rounded-full  ${darkMode ? "text-gray-400 hover:text-red-400 hover:bg-red-900/50" : "text-gray-500 hover:text-red-600 hover:bg-red-100"}`}
        aria-label="Remove this bookmark"
        title="Remove this bookmark"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-label="Remove icon"
        >
          <title>Remove icon</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <p
        className={`break-words whitespace-normal text-sm font-medium mb-3 pr-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
      >
        {question.question}
      </p>

      {/* Display Options if they exist */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mb-3">
          {question.options.map((option, idx) => {
            const isCorrect =
              question.answers.includes(idx) ||
              (typeof question.answers[0] === "string" && question.answers.includes(option));

            return (
              <div
                key={`option-${String(option).slice(0, 20)}-${idx}`}
                className={`p-2 rounded text-xs flex items-center ${
                  isCorrect
                    ? darkMode
                      ? "bg-green-800/40 text-green-300"
                      : "bg-green-100 text-green-700 font-medium"
                    : darkMode
                      ? "bg-gray-700/60 text-gray-300"
                      : "bg-gray-200/70 text-gray-700"
                }`}
              >
                <span className="mr-2">{String.fromCharCode(65 + idx)}.</span> {/* A, B, C... */}
                <span className="flex-grow">{option}</span>
                {isCorrect && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 ml-2 ${darkMode ? "text-green-400" : "text-green-600"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-label="Correct answer"
                  >
                    <title>Correct answer</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Display Answer directly if no options (e.g., FRQ) */}
      {(!question.options || question.options.length === 0) && question.answers.length > 0 && (
        <div className="mt-2">
          <h4
            className={`text-xs font-semibold mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Correct Answer:
          </h4>
          <div
            className={`p-2 rounded text-xs ${darkMode ? "bg-green-800/40 text-green-300" : "bg-green-100 text-green-700"}`}
          >
            {Array.isArray(question.answers)
              ? question.answers.join(", ")
              : String(question.answers)}
          </div>
        </div>
      )}
    </div>
  );
};

interface EventCardProps {
  eventName: string;
  questions: BookmarkedQuestion[];
  darkMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onTakeQuickTest: (eventName: string, questions: BookmarkedQuestion[]) => void;
  onTakeTimedTest: (eventName: string, questions: BookmarkedQuestion[]) => void;
  onRemoveBookmark: (question: BookmarkedQuestion) => void;
}

// Helper component for event statistics
const EventStatistics = ({
  questions,
  darkMode,
}: {
  questions: BookmarkedQuestion[];
  darkMode: boolean;
}) => {
  const testCount = questions.filter((q) => q.source === "test").length;
  const unlimitedCount = questions.filter((q) => q.source === "unlimited").length;
  const textColor = darkMode ? "text-gray-400" : "text-gray-600";

  return (
    <>
      {/* Statistics for desktop only */}
      <div className={`hidden md:flex gap-4 mt-1 ${textColor}`}>
        <p>
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
        <p>From Test Mode: {testCount}</p>
        <p>From Unlimited Mode: {unlimitedCount}</p>
      </div>
      {/* Simple count for mobile only */}
      <div className={`md:hidden mt-1 ${textColor}`}>
        <p>
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </>
  );
};

const EventCard = ({
  eventName,
  questions,
  darkMode,
  isOpen,
  onToggle,
  onTakeQuickTest,
  onTakeTimedTest,
  onRemoveBookmark,
}: EventCardProps) => {
  return (
    <div
      className={`rounded-lg transition-all duration-300 flex flex-col ${
        darkMode ? "bg-gray-700" : "bg-gray-50"
      } shadow-sm hover:shadow-md overflow-hidden`}
    >
      {/* Wrapper for header + practice button */}
      <div className="flex items-stretch">
        {/* Event Details Section (now clickable button) */}
        <button
          type="button"
          onClick={onToggle}
          className={`flex-grow p-6 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500  duration-200 ${
            darkMode ? "hover:bg-gray-600/50" : "hover:bg-gray-100"
          }`}
          aria-expanded={isOpen}
          aria-controls={`questions-${eventName}`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                {eventName}
              </h2>
              <EventStatistics questions={questions} darkMode={darkMode} />
            </div>
            {/* Chevron Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <title>{isOpen ? "Collapse" : "Expand"}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
        {/* Arrow Button Section (remains separate) */}
        <div className="flex">
          <button
            type="button"
            onClick={() => onTakeQuickTest(eventName, questions)}
            aria-label="Generate test"
            className={`w-16 flex items-center justify-center transition-all duration-300 ease-in-out group ${
              darkMode ? "bg-gray-600 hover:bg-blue-500" : "bg-gray-200 hover:bg-blue-500"
            }`}
          >
            <ArrowRight
              className={`h-6 w-6 transition-all duration-300 group-hover:translate-x-1 ${darkMode ? "text-gray-300 group-hover:text-white" : "text-gray-600 group-hover:text-white"}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onTakeTimedTest(eventName, questions)}
            aria-label="Unbookmark all"
            className={`w-16 flex items-center justify-center transition-all duration-300 ease-in-out group ${
              darkMode ? "bg-gray-600 hover:bg-red-600" : "bg-gray-200 hover:bg-red-600"
            }`}
          >
            <Trash2
              className={`h-6 w-6 transition-all duration-300 ${darkMode ? "text-gray-300 group-hover:text-white" : "text-gray-600 group-hover:text-white"}`}
            />
          </button>
        </div>
      </div>
      {/* Conditionally Rendered Questions Dropdown */}
      {isOpen && (
        <div
          id={`questions-${eventName}`}
          className={`p-6 pt-4 border-t ${darkMode ? "border-gray-600" : "border-gray-200"} space-y-3 bg-opacity-50 ${darkMode ? "bg-black/10" : "bg-white/50"}`}
        >
          <h4
            className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            Bookmarked Questions:
          </h4>
          {questions.map((q, index) => (
            <BookmarkedQuestionDisplay
              key={`${eventName}-${index}-${q.timestamp}`}
              bookmarkedQuestion={q}
              darkMode={darkMode}
              onRemove={onRemoveBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Content() {
  const router = useRouter();
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<
    Record<string, BookmarkedQuestion[]>
  >({});
  const [openEvents, setOpenEvents] = useState<Record<string, boolean>>({});
  const { darkMode } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [isRemoving, setIsRemoving] = useState<Record<string, boolean>>({});

  // Helper function to group bookmarks by event name
  const groupBookmarksByEvent = useCallback(
    (bookmarks: BookmarkedQuestion[]): Record<string, BookmarkedQuestion[]> => {
      return bookmarks.reduce(
        (acc, question) => {
          if (!acc[question.eventName]) {
            acc[question.eventName] = [];
          }
          if (question.eventName) {
            acc[question.eventName]?.push(question);
          }
          return acc;
        },
        {} as Record<string, BookmarkedQuestion[]>
      );
    },
    []
  );

  const loadBookmarks = useCallback(
    async (userId: string) => {
      setIsLoadingBookmarks(true);
      try {
        const bookmarks = await loadBookmarksFromSupabase(userId);
        if (bookmarks && bookmarks.length > 0) {
          const groupedQuestions = groupBookmarksByEvent(bookmarks);
          setBookmarkedQuestions(groupedQuestions);
        } else {
          setBookmarkedQuestions({});
        }
      } catch (error) {
        logger.error("Error loading bookmarks:", error);
        toast.error("Failed to load bookmarks");
      } finally {
        setIsLoadingBookmarks(false);
      }
    },
    [groupBookmarksByEvent]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      loadBookmarks(user.id);
    } else {
      setBookmarkedQuestions({});
      setIsLoadingBookmarks(false);
    }
  }, [user, authLoading, loadBookmarks]);

  const handleTakeTimedTest = (eventName: string, _questions: BookmarkedQuestion[]) => {
    (async () => {
      if (!user) {
        toast.info("Please sign in to manage bookmarks");
        return;
      }
      try {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("event_name", eventName);
        if (error) {
          throw error;
        }

        setBookmarkedQuestions((prev) => {
          const updated = { ...prev };
          delete updated[eventName];
          return updated;
        });
        toast.success("Cleared all bookmarks for this event");
      } catch (err) {
        logger.error("Error clearing bookmarks:", err);
        toast.error("Failed to clear bookmarks");
      }
    })();
  };

  // Helper function to prepare test session
  const prepareTestSession = (eventName: string, questions: BookmarkedQuestion[]) => {
    clearTestSession();
    SyncLocalStorage.removeItem("testUserAnswers");
    SyncLocalStorage.removeItem("testSubmitted");
    SyncLocalStorage.removeItem("contestedQuestions");
    SyncLocalStorage.removeItem("testFromBookmarks");

    const questionCount = Math.max(1, questions.length);
    const timeLimitMinutes = Math.max(5, questionCount * 5);

    SyncLocalStorage.setItem("testQuestions", JSON.stringify(questions.map((q) => q.question)));
    const testParams = {
      eventName: eventName,
      questionCount: questionCount.toString(),
      timeLimit: String(timeLimitMinutes),
      types: "multiple-choice",
    };
    SyncLocalStorage.setItem("testParams", JSON.stringify(testParams));
    SyncLocalStorage.setItem("testFromBookmarks", "true");
    document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify(testParams))}; path=/; max-age=300`;
  };

  const handleTakeQuickTest = (eventName: string, questions: BookmarkedQuestion[]) => {
    try {
      prepareTestSession(eventName, questions);
      router.push("/test");
    } catch (err) {
      logger.error("Error starting test from bookmarks:", err);
      toast.error("Failed to start test");
    }
  };

  const toggleEventDropdown = (eventName: string) => {
    setOpenEvents((prev) => ({
      ...prev,
      [eventName]: !prev[eventName],
    }));
  };

  // Helper component for loading state
  const LoadingState = ({ darkMode }: { darkMode: boolean }) => (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mb-4" />
      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        Loading your bookmarks...
      </p>
    </div>
  );

  // Helper component for empty state
  const EmptyState = ({ darkMode }: { darkMode: boolean }) => (
    <div className="text-center py-8">
      <p className={`text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
        No bookmarked questions yet
      </p>
      <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        Bookmark questions while practicing or taking tests to see them here
      </p>
    </div>
  );

  // Helper component for not signed in state
  const NotSignedInState = ({ darkMode }: { darkMode: boolean }) => (
    <div className="text-center py-8">
      <p className={`text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>
        Please sign in to view your bookmarks
      </p>
    </div>
  );

  // Helper component for bookmarks list
  const BookmarksList = ({
    bookmarkedQuestions,
    openEvents,
    darkMode,
    onToggle,
    onTakeQuickTest,
    onTakeTimedTest,
    onRemoveBookmark,
  }: {
    bookmarkedQuestions: Record<string, BookmarkedQuestion[]>;
    openEvents: Record<string, boolean>;
    darkMode: boolean;
    onToggle: (eventName: string) => void;
    onTakeQuickTest: (eventName: string, questions: BookmarkedQuestion[]) => void;
    onTakeTimedTest: (eventName: string, questions: BookmarkedQuestion[]) => void;
    onRemoveBookmark: (question: BookmarkedQuestion) => void;
  }) => (
    <div className="grid gap-6">
      {Object.entries(bookmarkedQuestions)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([eventName, questions]) => (
          <EventCard
            key={eventName}
            eventName={eventName}
            questions={questions}
            darkMode={darkMode}
            isOpen={!!openEvents[eventName]}
            onToggle={() => onToggle(eventName)}
            onTakeQuickTest={onTakeQuickTest}
            onTakeTimedTest={onTakeTimedTest}
            onRemoveBookmark={onRemoveBookmark}
          />
        ))}
    </div>
  );

  const updateBookmarksAfterRemoval = (
    prev: Record<string, BookmarkedQuestion[]>,
    questionToRemove: BookmarkedQuestion
  ): Record<string, BookmarkedQuestion[]> => {
    const updatedEvents = { ...prev };
    const eventName = questionToRemove.eventName;
    if (updatedEvents[eventName]) {
      updatedEvents[eventName] = updatedEvents[eventName].filter(
        (q) =>
          !(
            q.question.question === questionToRemove.question.question &&
            q.source === questionToRemove.source &&
            q.timestamp === questionToRemove.timestamp
          )
      );

      if (updatedEvents[eventName].length === 0) {
        delete updatedEvents[eventName];
      }
    }
    return updatedEvents;
  };

  const handleRemoveSingleBookmark = async (questionToRemove: BookmarkedQuestion) => {
    if (!user) {
      toast.info("Please sign in to manage bookmarks");
      return;
    }

    const questionKey = `${questionToRemove.eventName}-${questionToRemove.timestamp}`;
    if (isRemoving[questionKey]) {
      return;
    }
    setIsRemoving((prev) => ({ ...prev, [questionKey]: true }));

    try {
      await removeBookmark(user.id, questionToRemove.question, questionToRemove.source);
      setBookmarkedQuestions((prev) => updateBookmarksAfterRemoval(prev, questionToRemove));
      toast.success("Bookmark removed!");
    } catch (error) {
      logger.error("Error removing bookmark:", error);
      toast.error("Failed to remove bookmark");
    } finally {
      setIsRemoving((prev) => ({ ...prev, [questionKey]: false }));
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className={`absolute inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />

      <Header />

      {/* Main Content */}
      <div className="relative z-10 pt-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
              Your Bookmarked Questions
            </h1>
            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Here you can find all the questions you&apos;ve bookmarked while practicing or taking
              tests, organized by event. Click the arrow on any event card to start a practice
              session with those specific questions.
            </p>
          </div>

          {/* Content Section */}
          <div className={`rounded-lg shadow-lg p-6 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            {authLoading || isLoadingBookmarks ? (
              <LoadingState darkMode={darkMode} />
            ) : user ? (
              Object.keys(bookmarkedQuestions).length === 0 ? (
                <EmptyState darkMode={darkMode} />
              ) : (
                <BookmarksList
                  bookmarkedQuestions={bookmarkedQuestions}
                  openEvents={openEvents}
                  darkMode={darkMode}
                  onToggle={toggleEventDropdown}
                  onTakeQuickTest={handleTakeQuickTest}
                  onTakeTimedTest={handleTakeTimedTest}
                  onRemoveBookmark={handleRemoveSingleBookmark}
                />
              )
            ) : (
              <NotSignedInState darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>
      {/* Global ToastContainer handles notifications */}
    </div>
  );
}
