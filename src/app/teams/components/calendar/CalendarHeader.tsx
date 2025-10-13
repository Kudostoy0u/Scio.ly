'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';

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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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
  onShowSettings
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Upcoming Events
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onPreviousMonth}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={onNextMonth}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* View Toggle */}
        <div className={`flex rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button
            onClick={() => onToggleView(false)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              !showListView
                ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => onToggleView(true)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              showListView
                ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
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
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
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
        
        {/* Action Buttons */}
        <button
          onClick={onAddEvent}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
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
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Recurring</span>
          </button>
        )}
        
        <button
          onClick={onShowSettings}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode 
              ? 'bg-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
