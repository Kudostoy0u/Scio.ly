"use client";
import type { LeaderboardEntry } from "@/app/analytics/types/elo";
import { LeaderboardRow } from "./LeaderboardRow";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface LeaderboardTableProps {
  isLoading: boolean;
  paginatedData: LeaderboardEntry[];
  selectedEvent: string;
  darkMode: boolean;
  originalRankMap: Map<string, number>;
  getRankColor: (rank: number) => string;
  getRankingChange: (entry: LeaderboardEntry) => number;
  formatChangeLocal: (change: number) => { text: string; colorClass: string };
}

export function LeaderboardTable({
  isLoading,
  paginatedData,
  selectedEvent,
  darkMode,
  originalRankMap,
  getRankColor,
  getRankingChange,
  formatChangeLocal,
}: LeaderboardTableProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      <div className="overflow-x-auto">
        <table
          className={`min-w-full divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}
        >
          <thead className={darkMode ? "bg-gray-700" : "bg-gray-50"}>
            <tr>
              <th
                className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                Rank
              </th>
              <th
                className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                School
              </th>
              <th
                className={`hidden sm:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                State
              </th>
              <th
                className={`hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                Season
              </th>
              {selectedEvent && (
                <th
                  className={`hidden lg:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
                >
                  Event
                </th>
              )}
              <th
                className={`px-2 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                Elo Rating
              </th>
              <th
                className={`hidden sm:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? "text-gray-300" : "text-gray-500"}`}
              >
                Ranking Change
              </th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${darkMode ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200"}`}
          >
            {isLoading ? (
              <LoadingSkeleton
                count={Math.min(20, paginatedData.length || 20)}
                darkMode={darkMode}
                selectedEvent={!!selectedEvent}
                getRankColor={getRankColor}
              />
            ) : (
              paginatedData.map((entry) => {
                const key = `${entry.school}-${entry.state}-${entry.season}-${entry.event || "overall"}`;
                const actualRank = originalRankMap.get(key) || 1;

                return (
                  <LeaderboardRow
                    key={key}
                    entry={entry}
                    actualRank={actualRank}
                    selectedEvent={selectedEvent}
                    darkMode={darkMode}
                    getRankColor={getRankColor}
                    getRankingChange={getRankingChange}
                    formatChangeLocal={formatChangeLocal}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
