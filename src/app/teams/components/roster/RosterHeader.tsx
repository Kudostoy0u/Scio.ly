"use client";

import { AlertTriangle } from "lucide-react";
import type { Conflict } from "./rosterUtils";

interface RosterHeaderProps {
  darkMode: boolean;
  conflicts: Conflict[];
  isSaving: boolean;
}

export default function RosterHeader({ darkMode, conflicts, isSaving }: RosterHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Team Roster
        </h2>
        {conflicts.length > 0 && (
          <div className="relative group">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div
              className={`absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                darkMode
                  ? "bg-gray-800 text-white border border-gray-600"
                  : "bg-white text-gray-900 border border-gray-200"
              } hidden md:block`}
            >
              <div className="font-medium mb-1">Conflict Detected:</div>
              {conflicts.map((conflict) => (
                <div key={`${conflict.person}-${conflict.conflictBlock}`} className="text-xs">
                  {conflict.person} in {conflict.conflictBlock}: {conflict.events.join(", ")}
                </div>
              ))}
              <div
                className={`absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-transparent ${
                  darkMode ? "border-r-gray-800" : "border-r-white"
                }`}
              />
            </div>
            {/* Mobile tooltip - shows below */}
            <div
              className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                darkMode
                  ? "bg-gray-800 text-white border border-gray-600"
                  : "bg-white text-gray-900 border border-gray-200"
              } md:hidden`}
            >
              <div className="font-medium mb-1">Conflict Detected:</div>
              {conflicts.map((conflict) => (
                <div key={`${conflict.person}-${conflict.conflictBlock}`} className="text-xs">
                  {conflict.person} in {conflict.conflictBlock}: {conflict.events.join(", ")}
                </div>
              ))}
              <div
                className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent ${
                  darkMode ? "border-b-gray-800" : "border-b-white"
                }`}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {isSaving && (
          <div className={`text-sm ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
