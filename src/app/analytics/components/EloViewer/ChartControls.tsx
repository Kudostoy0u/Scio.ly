"use client";
import type { ChartType } from "@/app/analytics/types/elo";

interface ChartControlsProps {
  chartType: ChartType;
  viewMode: "season" | "tournament";
  darkMode: boolean;
  onChartTypeChange: (type: ChartType) => void;
  onViewModeChange: (mode: "season" | "tournament") => void;
}
export default function ChartControls({
  chartType,
  viewMode,
  darkMode,
  onChartTypeChange,
  onViewModeChange,
}: ChartControlsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            chartType === "overall"
              ? "bg-blue-600 text-white shadow-sm"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onChartTypeChange("overall")}
        >
          Overall
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            chartType === "event"
              ? "bg-blue-600 text-white shadow-sm"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onChartTypeChange("event")}
        >
          Event
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "season"
              ? "bg-blue-600 text-white shadow-sm"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onViewModeChange("season")}
        >
          By Season
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "tournament"
              ? "bg-blue-600 text-white shadow-sm"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onViewModeChange("tournament")}
        >
          By Tournament
        </button>
      </div>
    </div>
  );
}
