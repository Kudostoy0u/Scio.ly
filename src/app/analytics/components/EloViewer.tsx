"use client";
import logger from "@/lib/utils/logger";

import {
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  Chart as chartJs,
} from "chart.js";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import type { ChartData, ChartType, EloData, EloMetadata } from "@/app/analytics/types/elo";
import {
  getAllEvents,
  getAllSchools,
  getAllTournamentDates,
  processChartData,
} from "@/app/analytics/utils/eloDataProcessor";
import { useTheme } from "@/app/contexts/themeContext";
import Leaderboard from "@/app/teams/components/Leaderboard";
import ChartRangeSlider from "./ChartRangeSlider";
import CompareTool from "./CompareTool";
import { getChartConfig } from "./chartConfig";

chartJs.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Regex for extracting state codes from school names (moved to top level for performance)
const STATE_CODE_REGEX = /\(([A-Z]{2})\)$/;

interface ChartControlsProps {
  chartType: ChartType;
  viewMode: "season" | "tournament";
  darkMode: boolean;
  onChartTypeChange: (type: ChartType) => void;
  onViewModeChange: (mode: "season" | "tournament") => void;
}

const ChartControls: React.FC<ChartControlsProps> = ({
  chartType,
  viewMode,
  darkMode,
  onChartTypeChange,
  onViewModeChange,
}) => (
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

interface SchoolSelectorProps {
  schools: string[];
  selectedSchools: string[];
  schoolSearch: string;
  darkMode: boolean;
  isSchoolAvailable: (school: string) => boolean;
  onSchoolSearchChange: (value: string) => void;
  onSchoolToggle: (school: string) => void;
  onRemoveSchool: (school: string) => void;
  onClearAllSchools: () => void;
}

const SchoolSelector: React.FC<SchoolSelectorProps> = ({
  schools,
  selectedSchools,
  schoolSearch,
  darkMode,
  isSchoolAvailable,
  onSchoolSearchChange,
  onSchoolToggle,
  onRemoveSchool,
  onClearAllSchools,
}) => (
  <div>
    <label
      htmlFor="school-search-input"
      className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
    >
      Select Schools
    </label>
    <div className="space-y-3">
      <input
        id="school-search-input"
        type="text"
        placeholder="Search schools..."
        value={schoolSearch}
        onChange={(e) => onSchoolSearchChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      />
      <div
        className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"}`}
      >
        {schools.map((school) => {
          const isAvailable = isSchoolAvailable(school);
          return (
            <button
              key={school}
              type="button"
              disabled={!isAvailable}
              className={`w-full text-left px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
                selectedSchools.includes(school)
                  ? darkMode
                    ? "bg-blue-900/20 text-blue-300"
                    : "bg-blue-50 text-blue-700"
                  : darkMode
                    ? "border-gray-600 hover:bg-gray-600 text-gray-300"
                    : "border-gray-100 hover:bg-gray-50 text-gray-700"
              } ${isAvailable ? "" : "opacity-60"}`}
              onClick={() => isAvailable && onSchoolToggle(school)}
            >
              <div className="flex items-center justify-between">
                <span>{school}</span>
                {!isAvailable && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {selectedSchools.map((school) => (
          <span
            key={school}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              darkMode ? "bg-blue-900/30 text-blue-200" : "bg-blue-100 text-blue-800"
            }`}
          >
            {school}
            <button
              type="button"
              onClick={() => onRemoveSchool(school)}
              className={`ml-2 ${darkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
            >
              ×
            </button>
          </span>
        ))}
        {selectedSchools.length > 0 && (
          <button
            type="button"
            onClick={onClearAllSchools}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              darkMode
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-red-100 hover:bg-red-200 text-red-700"
            }`}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  </div>
);

interface EventSelectorProps {
  events: string[];
  selectedEvents: string[];
  eventSearch: string;
  darkMode: boolean;
  onEventSearchChange: (value: string) => void;
  onEventToggle: (event: string) => void;
  onRemoveEvent: (event: string) => void;
  onClearAllEvents: () => void;
}

const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  selectedEvents,
  eventSearch,
  darkMode,
  onEventSearchChange,
  onEventToggle,
  onRemoveEvent,
  onClearAllEvents,
}) => (
  <div>
    <label
      htmlFor="event-search-input"
      className={`block text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
    >
      Select Events
    </label>
    <div className="space-y-3">
      <input
        id="event-search-input"
        type="text"
        placeholder="Search events..."
        value={eventSearch}
        onChange={(e) => onEventSearchChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400" : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      />
      <div
        className={`max-h-48 overflow-y-auto border rounded-md ${darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-white"}`}
      >
        {events.map((event) => (
          <button
            key={event}
            type="button"
            className={`w-full text-left px-3 py-2 cursor-pointer border-b last:border-b-0 transition-colors ${
              selectedEvents.includes(event)
                ? darkMode
                  ? "bg-blue-900/20 text-blue-300"
                  : "bg-blue-50 text-blue-700"
                : darkMode
                  ? "border-gray-600 hover:bg-gray-600 text-gray-300"
                  : "border-gray-100 hover:bg-gray-50 text-gray-700"
            }`}
            onClick={() => onEventToggle(event)}
          >
            {event}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {selectedEvents.map((event) => (
          <span
            key={event}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              darkMode ? "bg-blue-900/30 text-blue-200" : "bg-blue-100 text-blue-800"
            }`}
          >
            {event}
            <button
              type="button"
              onClick={() => onRemoveEvent(event)}
              className={`ml-2 ${darkMode ? "text-blue-400 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"}`}
            >
              ×
            </button>
          </span>
        ))}
        {selectedEvents.length > 0 && (
          <button
            type="button"
            onClick={onClearAllEvents}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              darkMode
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-red-100 hover:bg-red-200 text-red-700"
            }`}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  </div>
);

interface EloViewerProps {
  eloData: EloData;
  division: "b" | "c";
  metadata?: EloMetadata;
}

type TabType = "charts" | "leaderboard" | "compare";

const EloViewer: React.FC<EloViewerProps> = ({ eloData, division, metadata }) => {
  const [activeTab, setActiveTab] = useState<TabType>("charts");
  const [chartType, setChartType] = useState<ChartType>("overall");
  const [viewMode, setViewMode] = useState<"season" | "tournament">("tournament");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([
    "Seven Lakes High School Varsity (TX)",
    "Adlai E. Stevenson High School Varsity (IL)",
  ]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [chartData, setChartData] = useState<ChartData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeFilter, setRangeFilter] = useState<{ startIndex: number; endIndex: number } | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const schools = getAllSchools(eloData);
  const events = getAllEvents(eloData);

  // Helper function to check if a school is available in current data
  const isSchoolAvailable = (schoolName: string): boolean => {
    const stateMatch = schoolName.match(STATE_CODE_REGEX);
    if (!stateMatch) {
      return false;
    }

    const stateCode = stateMatch[1];
    if (!stateCode) {
      return false;
    }
    const schoolNameOnly = schoolName.replace(` (${stateCode})`, "");
    return eloData[stateCode]?.[schoolNameOnly] !== undefined;
  };

  const filteredSchools = schools.filter((school) =>
    school.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const filteredEvents = events.filter((event) =>
    event.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const generateChart = useCallback(() => {
    if (selectedSchools.length === 0) {
      setError("Please select at least one school");
      setChartData({});
      return;
    }

    if (chartType === "event" && selectedEvents.length === 0) {
      setError("Please select at least one event");
      setChartData({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = processChartData(
        eloData,
        chartType,
        selectedSchools,
        selectedEvents,
        viewMode,
        metadata
      );
      setChartData(data);
    } catch (err) {
      setError("Error generating chart data");
      logger.error(err);
      setChartData({});
    } finally {
      setIsLoading(false);
    }
  }, [eloData, chartType, selectedSchools, selectedEvents, viewMode, metadata]);

  const handleSchoolToggle = (school: string) => {
    setSelectedSchools((prev) =>
      prev.includes(school) ? prev.filter((s) => s !== school) : [...prev, school]
    );
    clearAllTooltips();
  };

  const handleEventToggle = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
    clearAllTooltips();
  };

  const removeSchool = (school: string) => {
    setSelectedSchools((prev) => prev.filter((s) => s !== school));
  };

  const removeEvent = (event: string) => {
    setSelectedEvents((prev) => prev.filter((e) => e !== event));
  };

  const clearAllSchools = () => {
    setSelectedSchools([]);
  };

  const clearAllEvents = () => {
    setSelectedEvents([]);
  };

  const clearResultsBox = useCallback(() => {
    const resultsBox = document.getElementById("chart-results-box");
    if (resultsBox) {
      resultsBox.remove();
    }
  }, []);

  const clearTooltips = useCallback(() => {
    const tooltipEl = document.getElementById("chartjs-tooltip");
    if (tooltipEl) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.visibility = "hidden";
    }
  }, []);

  const clearAllTooltips = useCallback(() => {
    clearResultsBox();
    clearTooltips();
  }, [clearResultsBox, clearTooltips]);

  const handleChartTypeChange = (newChartType: ChartType) => {
    setChartType(newChartType);
    setChartData({});
    setRangeFilter(null);
    clearAllTooltips();
  };

  const handleViewModeChange = (newViewMode: "season" | "tournament") => {
    setViewMode(newViewMode);
    setChartData({});
    setRangeFilter(null);
    clearAllTooltips();
  };

  const handleRangeChange = useCallback(
    (startIndex: number, endIndex: number) => {
      setRangeFilter({ startIndex, endIndex });
      clearAllTooltips();
    },
    [clearAllTooltips]
  );

  const getDataPointsForSlider = (): Array<{
    x: Date;
    y: number;
    tournament?: string;
    link?: string;
  }> => {
    if (viewMode !== "tournament") {
      return [];
    }

    try {
      return getAllTournamentDates(eloData, metadata);
    } catch (error) {
      logger.error("Error getting tournament dates:", error);

      return [];
    }
  };

  useEffect(() => {
    if (selectedSchools.length > 0) {
      generateChart();
    } else {
      setChartData({});
    }
  }, [selectedSchools, generateChart]);

  const dataPointsForSlider = getDataPointsForSlider();

  const chartConfig =
    Object.keys(chartData).length > 0
      ? getChartConfig(
          chartData,
          chartType,
          viewMode,
          darkMode,
          rangeFilter || undefined,
          dataPointsForSlider
        )
      : null;

  const renderChartsTab = () => (
    <div>
      <div
        className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6 mb-6`}
      >
        <div className="space-y-6">
          <ChartControls
            chartType={chartType}
            viewMode={viewMode}
            darkMode={darkMode}
            onChartTypeChange={handleChartTypeChange}
            onViewModeChange={handleViewModeChange}
          />

          <SchoolSelector
            schools={filteredSchools}
            selectedSchools={selectedSchools}
            schoolSearch={schoolSearch}
            darkMode={darkMode}
            isSchoolAvailable={isSchoolAvailable}
            onSchoolSearchChange={setSchoolSearch}
            onSchoolToggle={handleSchoolToggle}
            onRemoveSchool={removeSchool}
            onClearAllSchools={clearAllSchools}
          />

          {chartType === "event" && (
            <EventSelector
              events={filteredEvents}
              selectedEvents={selectedEvents}
              eventSearch={eventSearch}
              darkMode={darkMode}
              onEventSearchChange={setEventSearch}
              onEventToggle={handleEventToggle}
              onRemoveEvent={removeEvent}
              onClearAllEvents={clearAllEvents}
            />
          )}

          {error && (
            <div
              className={`px-4 py-3 rounded-md ${
                darkMode
                  ? "bg-red-900/20 border border-red-800 text-red-300"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div
        className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6`}
      >
        <div className="relative h-96">
          {/* Info Button */}
          <div className="absolute top-2 right-2 z-10">
            <div className="relative group">
              <button
                type="button"
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                aria-label="Elo calculation info"
                onClick={
                  isMobile
                    ? (e) => {
                        e.stopPropagation();
                        const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                        if (tooltip) {
                          tooltip.style.opacity = tooltip.style.opacity === "1" ? "0" : "1";
                          tooltip.style.pointerEvents =
                            tooltip.style.opacity === "1" ? "auto" : "none";
                        }
                      }
                    : undefined
                }
              >
                i
              </button>

              {/* Tooltip */}
              <div
                className={`absolute right-0 top-8 w-80 p-4 rounded-lg shadow-lg border text-sm transition-opacity duration-200 ${
                  isMobile
                    ? "opacity-0 pointer-events-none"
                    : "opacity-0 group-hover:opacity-100 pointer-events-none"
                } ${
                  darkMode
                    ? "bg-gray-800 border-gray-600 text-gray-200"
                    : "bg-white border-gray-200 text-gray-800"
                }`}
              >
                <div className="font-semibold mb-2">Elo Rating Calculation</div>
                <p className="mb-2">
                  Our Elo ratings are calculated using an ad-hoc simulation that factors in team
                  placements and tournament strength. Higher placements and stronger tournaments
                  result in larger Elo gains.
                </p>
                <p className="mb-2">
                  The system accounts for regional, state, and national tournament levels, with
                  nationals carrying the most weight.
                </p>
                {isMobile ? (
                  <p className="text-xs opacity-75">
                    💡 Tip: Click a data point twice to see tournament results!
                  </p>
                ) : (
                  <p className="text-xs opacity-75">
                    💡 Tip: Click on data points to view detailed tournament results.
                  </p>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div
              className={`absolute inset-0 flex items-center justify-center rounded-lg ${darkMode ? "bg-gray-800 bg-opacity-75" : "bg-white bg-opacity-75"}`}
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Loading chart data...
                </p>
              </div>
            </div>
          )}
          {chartConfig && !isLoading && (
            <Line data={chartConfig.data} options={chartConfig.options} />
          )}
        </div>

        {/* Range Slider (only for tournament view mode) */}
        {viewMode === "tournament" && dataPointsForSlider.length > 0 && (
          <ChartRangeSlider
            dataPoints={dataPointsForSlider}
            onRangeChange={handleRangeChange}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Team Performance Analysis
        </h1>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
          Track team performance across seasons and events.
        </p>
      </div>

      {/* Tab Navigation */}
      <div
        className={`flex rounded-lg shadow-sm border overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <button
          type="button"
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "charts"
              ? "bg-blue-600 text-white"
              : darkMode
                ? "text-gray-300 hover:bg-gray-700"
                : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => {
            setActiveTab("charts");
            clearAllTooltips();
          }}
        >
          📊 Charts
        </button>
        <button
          type="button"
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "leaderboard"
              ? "bg-blue-600 text-white"
              : darkMode
                ? "text-gray-300 hover:bg-gray-700"
                : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => {
            setActiveTab("leaderboard");
            clearAllTooltips();
          }}
        >
          🏆 Leaderboard
        </button>
        <button
          type="button"
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "compare"
              ? "bg-blue-600 text-white"
              : darkMode
                ? "text-gray-300 hover:bg-gray-700"
                : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => {
            setActiveTab("compare");
            clearAllTooltips();
          }}
        >
          ⚔️ Compare
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "charts" && renderChartsTab()}
        {activeTab === "leaderboard" && (
          <Leaderboard eloData={eloData} division={division} metadata={metadata} />
        )}
        {activeTab === "compare" && <CompareTool eloData={eloData} />}
      </div>
    </div>
  );
};

export default EloViewer;
