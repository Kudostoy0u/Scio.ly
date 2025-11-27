"use client";
import type { LeaderboardEntry } from "@/app/analytics/types/elo";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  actualRank: number;
  selectedEvent: string;
  darkMode: boolean;
  getRankColor: (rank: number) => string;
  getRankingChange: (entry: LeaderboardEntry) => number;
  formatChangeLocal: (change: number) => { text: string; colorClass: string };
}

export function LeaderboardRow({
  entry,
  actualRank,
  selectedEvent,
  darkMode,
  getRankColor,
  getRankingChange,
  formatChangeLocal,
}: LeaderboardRowProps) {
  const change = getRankingChange(entry);
  const formatted = formatChangeLocal(change);

  return (
    <tr className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(actualRank)}`}
        >
          {actualRank}
        </span>
      </td>
      <td
        className={`px-2 sm:px-6 py-4 text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
      >
        <div>
          {entry.school}
          <div className={`sm:hidden text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {entry.state}
          </div>
        </div>
      </td>
      <td
        className={`hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
      >
        {entry.state}
      </td>
      <td
        className={`hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
      >
        {entry.season}
      </td>
      {selectedEvent && (
        <td
          className={`hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          {entry.event}
        </td>
      )}
      <td
        className={`px-2 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`}
      >
        {Math.round(entry.elo)}
      </td>
      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-semibold">
        <span className={formatted.colorClass}>{formatted.text}</span>
      </td>
    </tr>
  );
}
