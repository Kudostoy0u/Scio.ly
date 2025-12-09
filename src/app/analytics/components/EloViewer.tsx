"use client";
import logger from "@/lib/utils/logging/logger";
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
import "chartjs-adapter-date-fns";
import type {
	ChartData,
	ChartType,
	EloData,
	EloMetadata,
} from "@/app/analytics/types/elo";
import {
	getAllEvents,
	getAllSchools,
	getAllTournamentDates,
	processChartData,
} from "@/app/analytics/utils/eloDataProcessor";
import { useTheme } from "@/app/contexts/ThemeContext";
import Leaderboard from "@/app/teams/components/Leaderboard";
import CompareTool from "./CompareTool";
import ChartsTab from "./EloViewer/ChartsTab";

chartJs.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	TimeScale,
);

// Regex for extracting state codes from school names (moved to top level for performance)
const STATE_CODE_REGEX = /\(([A-Z]{2})\)$/;

interface EloViewerProps {
	eloData: EloData;
	division: "b" | "c";
	metadata?: EloMetadata;
}

type TabType = "charts" | "leaderboard" | "compare";

const EloViewer: React.FC<EloViewerProps> = ({
	eloData,
	division,
	metadata,
}) => {
	const [activeTab, setActiveTab] = useState<TabType>("charts");
	const [chartType, setChartType] = useState<ChartType>("overall");
	const [viewMode, setViewMode] = useState<"season" | "tournament">(
		"tournament",
	);
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
	const [rangeFilter, setRangeFilter] = useState<{
		startIndex: number;
		endIndex: number;
	} | null>(null);
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
		school.toLowerCase().includes(schoolSearch.toLowerCase()),
	);

	const filteredEvents = events.filter((event) =>
		event.toLowerCase().includes(eventSearch.toLowerCase()),
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
				metadata,
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
			prev.includes(school)
				? prev.filter((s) => s !== school)
				: [...prev, school],
		);
		clearAllTooltips();
	};

	const handleEventToggle = (event: string) => {
		setSelectedEvents((prev) =>
			prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
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
		[clearAllTooltips],
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

	// Extract date from rangeFilter for leaderboard synchronization
	// Only sync when in tournament view mode (rangeFilter is only set in tournament mode)
	const getDateFromRangeFilter = (): string | undefined => {
		if (
			viewMode === "tournament" &&
			rangeFilter &&
			dataPointsForSlider.length > 0
		) {
			const sortedPoints = [...dataPointsForSlider].sort(
				(a, b) => a.x.getTime() - b.x.getTime(),
			);
			const endDate = sortedPoints[rangeFilter.endIndex]?.x;
			if (endDate) {
				return endDate.toISOString().split("T")[0];
			}
		}
		return undefined;
	};

	const leaderboardDate = getDateFromRangeFilter();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center">
				<h1
					className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
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
				{activeTab === "charts" && (
					<ChartsTab
						darkMode={darkMode}
						chartType={chartType}
						viewMode={viewMode}
						chartData={chartData}
						isLoading={isLoading}
						error={error}
						isMobile={isMobile}
						rangeFilter={rangeFilter}
						dataPointsForSlider={dataPointsForSlider}
						filteredSchools={filteredSchools}
						selectedSchools={selectedSchools}
						schoolSearch={schoolSearch}
						filteredEvents={filteredEvents}
						selectedEvents={selectedEvents}
						eventSearch={eventSearch}
						isSchoolAvailable={isSchoolAvailable}
						onChartTypeChange={handleChartTypeChange}
						onViewModeChange={handleViewModeChange}
						onSchoolSearchChange={setSchoolSearch}
						onSchoolToggle={handleSchoolToggle}
						onRemoveSchool={removeSchool}
						onClearAllSchools={clearAllSchools}
						onEventSearchChange={setEventSearch}
						onEventToggle={handleEventToggle}
						onRemoveEvent={removeEvent}
						onClearAllEvents={clearAllEvents}
						onRangeChange={handleRangeChange}
					/>
				)}
				{activeTab === "leaderboard" && (
					<Leaderboard
						eloData={eloData}
						division={division}
						metadata={metadata}
						externalDate={leaderboardDate}
					/>
				)}
				{activeTab === "compare" && (
					<CompareTool eloData={eloData} division={division} />
				)}
			</div>
		</div>
	);
};

export default EloViewer;
