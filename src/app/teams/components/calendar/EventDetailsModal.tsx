"use client";

import { AnimatePresence, motion } from "framer-motion";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_type: "practice" | "tournament" | "meeting" | "deadline" | "other" | "personal";
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: Record<string, unknown>;
  created_by: string;
  team_id?: string;
  attendees?: Array<{
    user_id: string;
    status: "pending" | "attending" | "declined" | "tentative";
    name: string;
    email: string;
  }>;
}

interface EventDetailsModalProps {
  darkMode: boolean;
  showModal: boolean;
  selectedEvent: CalendarEvent | null;
  onClose: () => void;
}

export default function EventDetailsModal({
  darkMode,
  showModal,
  selectedEvent,
  onClose,
}: EventDetailsModalProps) {
  if (!selectedEvent) {
    return null;
  }

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`max-w-md w-full mx-4 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  Event Details
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className={`text-gray-400 hover:text-gray-600 ${darkMode ? "hover:text-gray-300" : ""}`}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Close modal"
                  >
                    <title>Close modal</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Title
                  </span>
                  <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {selectedEvent.title}
                  </p>
                </div>

                {selectedEvent.description && (
                  <div>
                    <span
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Description
                    </span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div>
                  <span
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Date
                  </span>
                  <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {new Date(selectedEvent.start_time).toLocaleDateString()}
                  </p>
                </div>

                {selectedEvent.start_time && (
                  <div>
                    <span
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Start Time
                    </span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedEvent.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}

                {selectedEvent.end_time && (
                  <div>
                    <span
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      End Time
                    </span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {new Date(selectedEvent.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}

                {selectedEvent.location && (
                  <div>
                    <span
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Location
                    </span>
                    <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {selectedEvent.location}
                    </p>
                  </div>
                )}

                <div>
                  <span
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Event Type
                  </span>
                  <p className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}>
                    {selectedEvent.event_type}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
