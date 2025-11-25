"use client";

import { Calendar, MapPin } from "lucide-react";
import EventTypeFilter from "./EventTypeFilter";
import type { Event } from "./streamTypes";
import { getEventTypeColor } from "./streamUtils";

interface TimerManagerProps {
  darkMode: boolean;
  events: Event[];
  selectedEventTypes: string[];
  onAddTimer: (event: Event) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onEventTypeChange: (eventTypes: string[]) => void;
}

export default function TimerManager({
  darkMode,
  events,
  selectedEventTypes,
  onAddTimer,
  isDropdownOpen,
  onToggleDropdown,
  onEventTypeChange,
}: TimerManagerProps) {
  const getFilteredEvents = () => {
    return events.filter(
      (event) => selectedEventTypes.includes(event.event_type) && event.event_type !== "personal" // Exclude personal events from team timer section
    );
  };

  const availableEvents = getFilteredEvents().filter((event) => !event.has_timer);

  return (
    <div
      className={`mb-6 p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Add Timers
        </h3>

        {/* Event Type Filter Dropdown */}
        <EventTypeFilter
          darkMode={darkMode}
          selectedEventTypes={selectedEventTypes}
          isDropdownOpen={isDropdownOpen}
          onToggleDropdown={onToggleDropdown}
          onEventTypeChange={onEventTypeChange}
        />
      </div>

      {availableEvents.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">No upcoming events</p>
          <p className="text-sm">
            {selectedEventTypes.length === 0
              ? "Select event types to see available events"
              : getFilteredEvents().length === 0
                ? 'Create upcoming meetings, tournaments, and events to make a timer for via the "upcoming" tab!'
                : "All upcoming events already have timers!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onAddTimer(event)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  : "bg-gray-50 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span
                  className={`font-medium text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  {event.title}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${getEventTypeColor(event.event_type, darkMode)}`}
                >
                  {event.event_type}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center space-x-1 mb-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {event.location}
                  </span>
                </div>
              )}
              <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                {new Date(event.start_time).toLocaleDateString()} at{" "}
                {new Date(event.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
