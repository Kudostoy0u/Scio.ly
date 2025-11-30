"use client";

import { useMemo } from "react";

interface LoadingSkeletonProps {
  count: number;
  darkMode: boolean;
  selectedEvent: boolean;
  getRankColor: (rank: number) => string;
}

function SkeletonCell({
  width,
  height = 4,
  darkMode,
}: { width: string; height?: number; darkMode: boolean }) {
  return (
    <div
      className={`h-${height} rounded w-${width} animate-pulse ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}
    />
  );
}

export function LoadingSkeleton({
  count,
  darkMode,
  selectedEvent,
  getRankColor,
}: LoadingSkeletonProps) {
  const skeletonRows = useMemo(() => {
    const rows: Array<{ id: string; rank: number }> = [];
    for (let i = 0; i < count; i++) {
      const id = `skeleton-${i}`;
      const rank = i + 1;
      rows.push({ id, rank });
    }
    return rows;
  }, [count]);

  return (
    <>
      {skeletonRows.map((row) => (
        <tr key={row.id} className={darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}>
          <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(row.rank)}`}
            >
              {row.rank}
            </span>
          </td>
          <td
            className={`px-2 sm:px-6 py-4 text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            <div>
              <SkeletonCell width="32" darkMode={darkMode} />
              <div className="sm:hidden text-xs mt-1">
                <SkeletonCell width="8" height={3} darkMode={darkMode} />
              </div>
            </div>
          </td>
          <td
            className={`hidden sm:table-cell px-6 py-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}
          >
            <SkeletonCell width="8" darkMode={darkMode} />
          </td>
          <td
            className={`hidden md:table-cell px-6 py-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}
          >
            <SkeletonCell width="12" darkMode={darkMode} />
          </td>
          {selectedEvent && (
            <td
              className={`hidden lg:table-cell px-6 py-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-500"}`}
            >
              <SkeletonCell width="20" darkMode={darkMode} />
            </td>
          )}
          <td
            className={`px-2 sm:px-6 py-4 text-sm ${darkMode ? "text-blue-400" : "text-blue-600"}`}
          >
            <SkeletonCell width="12" darkMode={darkMode} />
          </td>
          <td className="hidden sm:table-cell px-6 py-4 text-sm">
            <SkeletonCell width="16" darkMode={darkMode} />
          </td>
        </tr>
      ))}
    </>
  );
}
