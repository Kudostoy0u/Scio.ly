"use client";

import { Check, ChevronDown } from "lucide-react";
import { EVENT_TYPES } from "./streamTypes";

interface EventTypeFilterProps {
  darkMode: boolean;
  selectedEventTypes: string[];
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onEventTypeChange: (eventTypes: string[]) => void;
}

export default function EventTypeFilter({
  darkMode,
  selectedEventTypes,
  isDropdownOpen,
  onToggleDropdown,
  onEventTypeChange,
}: EventTypeFilterProps) {
  const getDropdownDisplayText = () => {
    if (selectedEventTypes.length === 0) {
      return "No types selected";
    }
    if (selectedEventTypes.length === 1) {
      const type = EVENT_TYPES.find((t) => t.value === selectedEventTypes[0]);
      return type?.label || selectedEventTypes[0];
    }
    return `${selectedEventTypes.length} types selected`;
  };

  return (
    <div className="relative dropdown-container">
      <button
        onClick={onToggleDropdown}
        className={`flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
          darkMode
            ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span>{getDropdownDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {isDropdownOpen && (
        <div
          className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-10 ${
            darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
          }`}
        >
          <div className="p-2 space-y-1">
            {EVENT_TYPES.map((eventType) => (
              <button
                key={eventType.value}
                onClick={() => {
                  const newSelection = selectedEventTypes.includes(eventType.value)
                    ? selectedEventTypes.filter((type) => type !== eventType.value)
                    : [...selectedEventTypes, eventType.value];
                  onEventTypeChange(newSelection);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  darkMode ? "hover:bg-gray-600 text-white" : "hover:bg-gray-50 text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${eventType.color}`}>
                    {eventType.label}
                  </span>
                </div>
                {selectedEventTypes.includes(eventType.value) && (
                  <Check className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
