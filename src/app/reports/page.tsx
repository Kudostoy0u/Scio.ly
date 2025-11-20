"use client";

import api from "@/app/api";
import { useTheme } from "@/app/contexts/ThemeContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { approvedEvents } from "./data/approvedEvents";

import { Pagination } from "./components/Pagination";
import { BlacklistedQuestionCard, QuestionCard } from "./components/QuestionCards";
import { ScrollBarAlwaysVisible } from "./components/ScrollBarAlwaysVisible";

export default function ReportsPage() {
  const { darkMode } = useTheme();
  // Lazy-loaded per-event data caches
  const [blacklistedQuestions, setBlacklistedQuestions] = useState<Record<string, string[]>>({});
  const [editedQuestions, setEditedQuestions] = useState<
    Record<string, Array<{ original: string; edited: string; timestamp: string }>>
  >({});
  // Metadata counts by event
  const [editsByEvent, setEditsByEvent] = useState<Record<string, number>>({});
  const [removedByEvent, setRemovedByEvent] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"blacklisted" | "edited">("blacklisted");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Initial load: fetch metadata only
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const res = await fetch(api.reportMeta);
        if (!res.ok) {
          throw new Error("Failed to fetch report metadata");
        }
        const json = await res.json();
        const meta = (json.data || {}) as {
          editsByEvent?: Record<string, number>;
          removedByEvent?: Record<string, number>;
        };
        setEditsByEvent(meta.editsByEvent || {});
        setRemovedByEvent(meta.removedByEvent || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEvent]);

  // Lazy-load per-event data when needed
  useEffect(() => {
    const load = async () => {
      if (!selectedEvent) {
        return;
      }
      try {
        setLoading(true);
        if (activeTab === "blacklisted" && blacklistedQuestions[selectedEvent] === undefined) {
          const res = await fetch(`${api.blacklists}?event=${encodeURIComponent(selectedEvent)}`);
          if (!res.ok) {
            throw new Error("Failed to fetch blacklisted questions");
          }
          const json = await res.json();
          const list = (json.blacklist || []) as string[];
          setBlacklistedQuestions((prev) => ({ ...prev, [selectedEvent]: list }));
        }
        if (activeTab === "edited" && editedQuestions[selectedEvent] === undefined) {
          const res = await fetch(`${api.edits}?event=${encodeURIComponent(selectedEvent)}`);
          if (!res.ok) {
            throw new Error("Failed to fetch edited questions");
          }
          const json = await res.json();
          const list = (json.edits || []) as Array<{
            original: string;
            edited: string;
            timestamp: string;
          }>;
          setEditedQuestions((prev) => ({ ...prev, [selectedEvent]: list }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedEvent, activeTab, blacklistedQuestions, editedQuestions]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCurrentEventData = () => {
    if (!selectedEvent) {
      return [];
    }

    if (activeTab === "blacklisted") {
      return blacklistedQuestions[selectedEvent] || [];
    }
    return editedQuestions[selectedEvent] || [];
  };

  const getEventsWithReports = () => {
    const eventsWithReports = new Set<string>([
      ...Object.keys(editsByEvent).filter((e) => (editsByEvent[e] || 0) > 0),
      ...Object.keys(removedByEvent).filter((e) => (removedByEvent[e] || 0) > 0),
    ]);
    return approvedEvents.filter((event) => eventsWithReports.has(event.name));
  };

  const getEventReportCount = (eventName: string) => {
    const blacklistedCount = removedByEvent[eventName] || 0;
    const editedCount = editsByEvent[eventName] || 0;
    return blacklistedCount + editedCount;
  };

  const getTotalReportCount = () => {
    let total = 0;
    Object.values(removedByEvent).forEach((n) => {
      total += n || 0;
    });
    Object.values(editsByEvent).forEach((n) => {
      total += n || 0;
    });
    return total;
  };

  const getPaginatedData = () => {
    const data = getCurrentEventData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const data = getCurrentEventData();
    return Math.ceil(data.length / itemsPerPage);
  };

  const bgColor = darkMode ? "bg-gray-900" : "bg-gray-50";
  const textColor = darkMode ? "text-white" : "text-gray-900";
  const cardBgColor = darkMode ? "bg-gray-800" : "bg-white";
  const borderColor = darkMode ? "border-gray-700" : "border-gray-200";
  const secondaryTextColor = darkMode ? "text-gray-300" : "text-gray-700";
  const mutedTextColor = darkMode ? "text-gray-400" : "text-gray-500";
  const tabActiveColor = darkMode
    ? "border-blue-400 text-blue-400"
    : "border-blue-500 text-blue-600";
  const tabInactiveColor = darkMode
    ? "text-gray-400 hover:text-gray-300"
    : "text-gray-500 hover:text-gray-700";
  const headerBgColor = darkMode ? "bg-gray-800" : "bg-white";
  const headerBorderColor = darkMode ? "border-gray-700" : "border-gray-200";

  return (
    <div className={`min-h-screen ${bgColor} ${textColor}`}>
      <div className="container mx-auto px-4 py-12">
        {/* Header section with enhanced design */}
        <div
          className={`${headerBgColor} rounded-lg shadow-lg border-l-4 ${darkMode ? "border-l-blue-500" : "border-l-blue-600"} border ${headerBorderColor} p-8 mb-8`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <div className="flex items-center mb-4">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center mr-4 px-3 py-2 rounded-md ${darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"} `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold">Question Reports</h1>
              </div>
              <p className={`${secondaryTextColor} max-w-2xl mb-3`}>
                Thanks to all of our users for helping us maintain and improve our question bank.
                Your reports make Science Olympiad practice better for everyone!
              </p>
              <div
                className={`${darkMode ? "bg-blue-900/30 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"} border px-4 py-3 rounded-md mt-2`}
              >
                <div className="flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium">
                    Please keep reports concise and clear! This helps our team process them more
                    efficiently.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block" />
          </div>
        </div>

        {/* Event Selection */}
        <div className={`${cardBgColor} rounded-lg shadow-md border ${borderColor} p-6 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Select Event</h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                darkMode
                  ? "bg-blue-900/30 text-blue-300 border border-blue-700"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {getTotalReportCount()} Total Reports
            </div>
          </div>
          <div className="h-96">
            <ScrollBarAlwaysVisible darkMode={darkMode}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getEventsWithReports().map((event) => (
                  <button
                    key={event.name}
                    onClick={() => setSelectedEvent(event.name)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedEvent === event.name
                        ? darkMode
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-blue-500 bg-blue-50"
                        : darkMode
                          ? "border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm flex-1">{event.name}</div>
                      <div
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          darkMode ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {getEventReportCount(event.name)}
                      </div>
                    </div>
                    <div className={`text-xs ${mutedTextColor} mb-1`}>{event.subject}</div>
                    <div className="flex flex-wrap gap-1">
                      {event.divisions.map((division) => (
                        <span
                          key={division}
                          className={`px-1.5 py-0.5 text-xs rounded-full ${
                            darkMode ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          Div {division}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollBarAlwaysVisible>
          </div>
          {getEventsWithReports().length === 0 && (
            <div className={`text-center py-8 ${mutedTextColor}`}>
              <p>No events with reports found.</p>
            </div>
          )}
        </div>

        {/* Tabs with elevated card */}
        <div
          className={`${cardBgColor} rounded-lg shadow-md border ${borderColor} overflow-hidden mb-8`}
        >
          <div className={`flex border-b ${borderColor}`}>
            <button
              className={`py-3 px-6 font-medium  ${activeTab === "blacklisted" ? `${tabActiveColor} border-b-2` : tabInactiveColor}`}
              onClick={() => setActiveTab("blacklisted")}
            >
              Blacklisted Questions
            </button>
            <button
              className={`py-3 px-6 font-medium  ${activeTab === "edited" ? `${tabActiveColor} border-b-2` : tabInactiveColor}`}
              onClick={() => setActiveTab("edited")}
            >
              Edited Questions
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
                <p className={mutedTextColor}>Loading reports...</p>
              </div>
            ) : error ? (
              <div
                className={`${darkMode ? "bg-red-900/50 text-red-200" : "bg-red-100 text-red-700"} border ${darkMode ? "border-red-800" : "border-red-400"} px-6 py-4 rounded-md`}
              >
                <p className="font-medium">Error loading reports</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : selectedEvent ? (
              <div>
                {/* Event Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedEvent}</h2>
                    <p className={`${mutedTextColor} mt-1`}>
                      {activeTab === "blacklisted" ? "Blacklisted" : "Edited"} Questions
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"} ${mutedTextColor} text-sm`}
                  >
                    {getCurrentEventData().length}{" "}
                    {activeTab === "blacklisted" ? "Questions" : "Edits"}
                  </div>
                </div>

                {getCurrentEventData().length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-16 ${mutedTextColor}`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-lg">
                      No {activeTab === "blacklisted" ? "blacklisted" : "edited"} questions found
                      for {selectedEvent}
                    </p>
                    <p className="text-sm mt-2">
                      {activeTab === "blacklisted"
                        ? "Questions reported for removal will appear here."
                        : "Questions that have been edited will appear here."}
                    </p>
                  </div>
                ) : (
                  <div>
                    {activeTab === "blacklisted" && (
                      <div className="space-y-4">
                        {getPaginatedData().map((question, index) => (
                          <div
                            key={index}
                            className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} p-4 rounded-md border-l-4 ${darkMode ? "border-red-600" : "border-red-500"}`}
                          >
                            <BlacklistedQuestionCard questionData={question} darkMode={darkMode} />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "edited" && (
                      <div className="space-y-6">
                        {(getPaginatedData() as Array<{ original: string; edited: string; timestamp: string }>).map((edit, index) => (
                          <div
                            key={index}
                            className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} p-5 rounded-md`}
                          >
                            <div className="mb-3 flex items-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 mr-2 text-blue-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className={`text-xs ${mutedTextColor}`}>
                                Edited on {formatDate(edit.timestamp)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4
                                  className={`text-sm font-medium ${mutedTextColor} mb-2 flex items-center`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-1 text-red-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Original
                                </h4>
                                <div
                                  className={`${cardBgColor} p-4 rounded-md border ${borderColor} shadow-sm`}
                                >
                                  <QuestionCard
                                    questionData={edit.original}
                                    darkMode={darkMode}
                                    type="original"
                                  />
                                </div>
                              </div>
                              <div>
                                <h4
                                  className={`text-sm font-medium ${mutedTextColor} mb-2 flex items-center`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-1 text-green-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Edited
                                </h4>
                                <div
                                  className={`${cardBgColor} p-4 rounded-md border ${darkMode ? "border-green-700" : "border-green-300"} shadow-sm`}
                                >
                                  <QuestionCard
                                    questionData={edit.edited}
                                    darkMode={darkMode}
                                    type="edited"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {getTotalPages() > 1 && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={getTotalPages()}
                        onPageChange={setCurrentPage}
                        darkMode={darkMode}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center py-16 ${mutedTextColor}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-lg">Please select an event to view reports</p>
                <p className="text-sm mt-2">
                  Choose an event from the list above to see blacklisted or edited questions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Thank you message at the bottom */}
        <div
          className={`${cardBgColor} rounded-lg p-6 border ${borderColor} shadow-sm text-center mb-8`}
        >
          <h3 className="text-xl font-semibold mb-2">Community-Driven Quality</h3>
          <p className={secondaryTextColor}>
            Your reports help us maintain the highest quality question bank for Science Olympiad
            students. Together, we&apos;re building a better resource for everyone.
          </p>
        </div>
      </div>

      {/* Global styles for scrollbar */}
      <style jsx={true} global={true}>{`
        .native-scroll-hidden {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }
        .native-scroll-hidden::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
      `}</style>
    </div>
  );
}
