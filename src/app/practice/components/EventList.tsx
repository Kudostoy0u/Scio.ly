'use client';

import { Event } from '../types';
import { useTheme } from '@/app/contexts/ThemeContext';

interface EventListProps {
  events: Event[];
  selectedEvent: number | null;
  sortOption: string;
  onEventSelect: (id: number) => void;
  onSortChange: (option: string) => void;
  loading: boolean;
  error: string | null;
}

export default function EventList({
  events,
  selectedEvent,
  sortOption,
  onEventSelect,
  onSortChange,
  loading,
  error
}: EventListProps) {
  const { darkMode } = useTheme();

  // Sort events based on selected option
  const sortedEvents = [...events].sort((a, b) => {
    if (sortOption === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'subject') {
      return a.subject.localeCompare(b.subject);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-pulse text-lg font-medium ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Loading events...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`text-lg ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No events match the whitelist criteria.
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 rounded-xl overflow-hidden flex flex-col ${
      darkMode ? 'bg-palenight-100' : 'bg-white shadow-md'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
        <h3 className={`font-medium ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Available Events
        </h3>
        <div className="flex items-center">
          <label htmlFor="sort" className={`text-sm mr-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Sort:
          </label>
          <select
            id="sort"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value)}
            className={`text-xs rounded-md border-0 py-1.5 pl-3 pr-8 ${
              darkMode 
                ? 'bg-gray-700 text-white focus:ring-blue-500' 
                : 'bg-gray-50 text-gray-900 focus:ring-blue-600'
            } focus:ring-1 focus:outline-none`}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="subject">Subject</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0 custom-scrollbar">
        <ul className="space-y-2">
          {sortedEvents.map((event) => (
            <li
              key={event.id}
              id={`event-${event.id}`}
              onClick={() => onEventSelect(event.id)}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedEvent === event.id
                  ? darkMode
                    ? 'bg-blue-600/20 border-l-4 border-blue-500'
                    : 'bg-blue-50 border-l-4 border-blue-500'
                  : darkMode
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <h4 className={`font-medium text-base ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {event.name}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {event.subject}
                  </span>
                  {event.divisions && (
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-600'
                    }`}>
                      Div {event.divisions.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 