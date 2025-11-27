"use client";
import { Search } from "lucide-react";

interface FiltersProps {
  allSeasons: string[];
  allStates: string[];
  eventsForSelectedSeason: string[];
  selectedSeason: string;
  selectedState: string;
  selectedEvent: string;
  searchTerm: string;
  darkMode: boolean;
  onSeasonChange: (season: string) => void;
  onStateChange: (state: string) => void;
  onEventChange: (event: string) => void;
  onSearchChange: (term: string) => void;
}

export function Filters({
  allSeasons,
  allStates,
  eventsForSelectedSeason,
  selectedSeason,
  selectedState,
  selectedEvent,
  searchTerm,
  darkMode,
  onSeasonChange,
  onStateChange,
  onEventChange,
  onSearchChange,
}: FiltersProps) {
  return (
    <>
      {/* Filters Row 1: Season and State */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="season-select"
            className={`text-sm font-medium text-center sm:text-left ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Season:
          </label>
          <select
            id="season-select"
            value={selectedSeason}
            onChange={(e) => onSeasonChange(e.target.value)}
            className={`px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-white text-gray-900"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            {allSeasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="state-select"
            className={`text-sm font-medium text-center sm:text-left ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            State:
          </label>
          <select
            id="state-select"
            value={selectedState}
            onChange={(e) => onStateChange(e.target.value)}
            className={`px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-white text-gray-900"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="">All States</option>
            {allStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Row 2: Event and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="event-select"
            className={`text-sm font-medium text-center sm:text-left ${darkMode ? "text-gray-300" : "text-gray-700"}`}
          >
            Event:
          </label>
          <select
            id="event-select"
            value={selectedEvent}
            onChange={(e) => onEventChange(e.target.value)}
            className={`px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-white text-gray-900"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="">Overall</option>
            {eventsForSelectedSeason.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
          </div>
          <input
            type="text"
            placeholder="Search schools or states..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
      </div>
    </>
  );
}
