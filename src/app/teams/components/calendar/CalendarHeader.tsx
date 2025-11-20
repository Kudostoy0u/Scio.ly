"use client";

import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import React from "react";

interface CalendarHeaderProps {
  darkMode: boolean;
  currentDate: Date;
  showListView: boolean;
  eventTypeFilter: string;
  isCaptain: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToggleView: (showList: boolean) => void;
  onEventTypeFilterChange: (filter: string) => void;
  onAddEvent: () => void;
  onAddRecurring: () => void;
  onShowSettings: () => void;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function CalendarHeader({
  darkMode,
  currentDate,
  showListView,
  eventTypeFilter,
  isCaptain,
  onPreviousMonth,
  onNextMonth,
  onToggleView,
  onEventTypeFilterChange,
  onAddEvent,
  onAddRecurring,
  onShowSettings: _onShowSettings,
}: CalendarHeaderProps) {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Upcoming Events
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onPreviousMonth}
              className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={onNextMonth}
              className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile actions toggle with inline view toggle */}
        <div className="md:hidden flex items-center gap-2 ml-3">
          <button
            onClick={() => setShowActions((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              darkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"
            }`}
            aria-expanded={showActions}
            aria-controls="calendar-actions"
          >
            {showActions ? "Hide" : "Actions"}
          </button>
          <div className={`flex rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
            <button
              onClick={() => onToggleView(false)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                showListView
                  ? darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                  : darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => onToggleView(true)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                showListView
                  ? darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center space-x-2 flex-wrap">
          {/* View Toggle */}
          <div className={`flex rounded-lg ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
            <button
              onClick={() => onToggleView(false)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                showListView
                  ? darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                  : darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => onToggleView(true)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                showListView
                  ? darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              List
            </button>
          </div>

          {/* Event Type Filter (only show in list view) */}
          {showListView && (
            <select
              value={eventTypeFilter}
              onChange={(e) => onEventTypeFilterChange(e.target.value)}
              className={`px-3 py-1 text-sm rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="all">All Events</option>
              <option value="meeting">Meetings</option>
              <option value="practice">Practice</option>
              <option value="tournament">Tournament</option>
              <option value="competition">Competition</option>
              <option value="social">Social</option>
            </select>
          )}

          {/* Action Buttons (Settings removed) */}
          <button
            onClick={onAddEvent}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>

          {isCaptain && (
            <button
              onClick={onAddRecurring}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Recurring</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile actions collapsible panel */}
      <div
        id="calendar-actions"
        className={`${showActions ? "block" : "hidden"} md:hidden mt-4 space-y-3 w-full`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {showListView && (
            <select
              value={eventTypeFilter}
              onChange={(e) => onEventTypeFilterChange(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="all">All</option>
              <option value="meeting">Meetings</option>
              <option value="practice">Practice</option>
              <option value="tournament">Tournament</option>
              <option value="competition">Competition</option>
              <option value="social">Social</option>
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={onAddEvent}
            className={`${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            } px-3 py-2 rounded-lg text-sm font-medium`}
          >
            Add Event
          </button>

          {isCaptain && (
            <button
              onClick={onAddRecurring}
              className={`${
                darkMode
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              } px-3 py-2 rounded-lg text-sm font-medium`}
            >
              Recurring
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
