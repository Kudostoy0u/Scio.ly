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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	// Initialize activeTab from URL hash or default to "charts"
	const getInitialTab = (): TabType => {
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			// Check if it's a compare link (with or without query params)
			if (hash.startsWith("#compare")) {
				return "compare";
			}
			const hashParts = hash.split("?");
			const hashWithoutQuery = hashParts[0]?.slice(1) || ""; // Remove the # and query params
			if (
				hashWithoutQuery === "charts" ||
				hashWithoutQuery === "leaderboard" ||
				hashWithoutQuery === "compare"
			) {
				return hashWithoutQuery as TabType;
			}
		}
		return "charts";
	};

	// Initialize chart state from URL query params
	const getInitialChartStateFromURL = () => {
		if (typeof window === "undefined") {
			return {
				chartType: "overall" as ChartType,
				viewMode: "tournament" as "season" | "tournament",
				selectedSchools: [
					"Seven Lakes High School Varsity (TX)",
					"Adlai E. Stevenson High School Varsity (IL)",
				],
				selectedEvents: [] as string[],
				rangeFilter: null as { startIndex: number; endIndex: number } | null,
			};
		}
		const params = new URLSearchParams(window.location.search);
		const schoolsParam = params.get("schools");
		const eventsParam = params.get("events");
		const rangeStart = params.get("rangeStart");
		const rangeEnd = params.get("rangeEnd");

		return {
			chartType: (params.get("chartType") || "overall") as ChartType,
			viewMode: (params.get("viewMode") || "tournament") as
				| "season"
				| "tournament",
			selectedSchools: schoolsParam
				? schoolsParam.split(",").map((s) => decodeURIComponent(s))
				: [
						"Seven Lakes High School Varsity (TX)",
						"Adlai E. Stevenson High School Varsity (IL)",
					],
			selectedEvents: eventsParam
				? eventsParam.split(",").map((e) => decodeURIComponent(e))
				: [],
			rangeFilter:
				rangeStart && rangeEnd
					? {
							startIndex: Number.parseInt(rangeStart, 10),
							endIndex: Number.parseInt(rangeEnd, 10),
						}
					: null,
		};
	};

	const initialChartState = getInitialChartStateFromURL();
	const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
	const [chartType, setChartType] = useState<ChartType>(
		initialChartState.chartType,
	);
	const [viewMode, setViewMode] = useState<"season" | "tournament">(
		initialChartState.viewMode,
	);
	const [selectedSchools, setSelectedSchools] = useState<string[]>(
		initialChartState.selectedSchools,
	);
	const [selectedEvents, setSelectedEvents] = useState<string[]>(
		initialChartState.selectedEvents,
	);
	const [schoolSearch, setSchoolSearch] = useState("");
	const [eventSearch, setEventSearch] = useState("");
	const [chartData, setChartData] = useState<ChartData>({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rangeFilter, setRangeFilter] = useState<{
		startIndex: number;
		endIndex: number;
	} | null>(initialChartState.rangeFilter);
	const [isMobile, setIsMobile] = useState(false);
	const { darkMode } = useTheme();
	const isInitialChartMount = useRef<boolean>(true);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Memoize expensive computations
	const schools = useMemo(() => getAllSchools(eloData), [eloData]);
	const events = useMemo(() => getAllEvents(eloData), [eloData]);

	// Memoize helper function to check if a school is available in current data
	const isSchoolAvailable = useCallback(
		(schoolName: string): boolean => {
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
		},
		[eloData],
	);

	// Memoize filtered lists
	const filteredSchools = useMemo(
		() =>
			schools.filter((school) =>
				school.toLowerCase().includes(schoolSearch.toLowerCase()),
			),
		[schools, schoolSearch],
	);

	const filteredEvents = useMemo(
		() =>
			events.filter((event) =>
				event.toLowerCase().includes(eventSearch.toLowerCase()),
			),
		[events, eventSearch],
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

	// Define tooltip clearing functions first since they're used in other callbacks
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

	const handleSchoolToggle = useCallback(
		(school: string) => {
			setSelectedSchools((prev) =>
				prev.includes(school)
					? prev.filter((s) => s !== school)
					: [...prev, school],
			);
			clearAllTooltips();
		},
		[clearAllTooltips],
	);

	const handleEventToggle = useCallback(
		(event: string) => {
			setSelectedEvents((prev) =>
				prev.includes(event)
					? prev.filter((e) => e !== event)
					: [...prev, event],
			);
			clearAllTooltips();
		},
		[clearAllTooltips],
	);

	const removeSchool = useCallback((school: string) => {
		setSelectedSchools((prev) => prev.filter((s) => s !== school));
	}, []);

	const removeEvent = useCallback((event: string) => {
		setSelectedEvents((prev) => prev.filter((e) => e !== event));
	}, []);

	const clearAllSchools = useCallback(() => {
		setSelectedSchools([]);
	}, []);

	const clearAllEvents = useCallback(() => {
		setSelectedEvents([]);
	}, []);

	const handleChartTypeChange = useCallback(
		(newChartType: ChartType) => {
			setChartType(newChartType);
			setChartData({});
			setRangeFilter(null);
			clearAllTooltips();
		},
		[clearAllTooltips],
	);

	const handleViewModeChange = useCallback(
		(newViewMode: "season" | "tournament") => {
			setViewMode(newViewMode);
			setChartData({});
			setRangeFilter(null);
			clearAllTooltips();
		},
		[clearAllTooltips],
	);

	const handleRangeChange = useCallback(
		(startIndex: number, endIndex: number) => {
			setRangeFilter({ startIndex, endIndex });
			clearAllTooltips();
		},
		[clearAllTooltips],
	);

	// Memoize data points for slider
	const dataPointsForSlider = useMemo(() => {
		if (viewMode !== "tournament") {
			return [];
		}

		try {
			return getAllTournamentDates(eloData, metadata);
		} catch (error) {
			logger.error("Error getting tournament dates:", error);
			return [];
		}
	}, [eloData, metadata, viewMode]);

	// Extract date from rangeFilter for leaderboard synchronization
	// Only sync when in tournament view mode (rangeFilter is only set in tournament mode)
	const leaderboardDate = useMemo(() => {
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
	}, [viewMode, rangeFilter, dataPointsForSlider]);

	// Track which states are needed for selected schools
	const requiredStates = useMemo(() => {
		const states = new Set<string>();
		for (const school of selectedSchools) {
			const stateMatch = school.match(STATE_CODE_REGEX);
			if (stateMatch?.[1]) {
				states.add(stateMatch[1]);
			}
		}
		return Array.from(states);
	}, [selectedSchools]);

	// Check if all required states are available in eloData
	const requiredStatesAvailable = useMemo(() => {
		if (requiredStates.length === 0) return false;
		return requiredStates.every((stateCode) => {
			const schoolWithState = selectedSchools.find((s) =>
				s.includes(`(${stateCode})`),
			);
			if (!schoolWithState) return false;
			const schoolNameOnly = schoolWithState.replace(` (${stateCode})`, "");
			return eloData[stateCode]?.[schoolNameOnly] !== undefined;
		});
	}, [eloData, requiredStates, selectedSchools]);

	// Regenerate chart when:
	// 1. Selected schools change
	// 2. Chart settings change
	// 3. Required states become available in eloData (for initial load)
	// 4. eloData changes (when new data loads in batches)
	useEffect(() => {
		if (selectedSchools.length > 0) {
			// Show loading if schools are selected but required states aren't available yet
			if (!requiredStatesAvailable) {
				setIsLoading(true);
				setChartData({});
			} else {
				// Generate chart when required states become available
				// This ensures chart renders when IL/TX load initially
				generateChart();
			}
		} else {
			setChartData({});
			setIsLoading(false);
		}
	}, [selectedSchools, requiredStatesAvailable, generateChart]);

	// Update URL query params when chart filters change (only for charts tab)
	useEffect(() => {
		if (
			typeof window === "undefined" ||
			activeTab !== "charts" ||
			isInitialChartMount.current
		) {
			if (activeTab === "charts") {
				isInitialChartMount.current = false;
			}
			return;
		}

		const params = new URLSearchParams(window.location.search);

		// Remove leaderboard params if they exist
		params.delete("season");
		params.delete("state");
		params.delete("event");
		params.delete("date");
		params.delete("search");

		// Update chart-related params
		if (chartType) params.set("chartType", chartType);
		else params.delete("chartType");

		if (viewMode) params.set("viewMode", viewMode);
		else params.delete("viewMode");

		if (selectedSchools.length > 0) {
			params.set(
				"schools",
				selectedSchools.map((s) => encodeURIComponent(s)).join(","),
			);
		} else {
			params.delete("schools");
		}

		if (selectedEvents.length > 0) {
			params.set(
				"events",
				selectedEvents.map((e) => encodeURIComponent(e)).join(","),
			);
		} else {
			params.delete("events");
		}

		if (rangeFilter) {
			params.set("rangeStart", rangeFilter.startIndex.toString());
			params.set("rangeEnd", rangeFilter.endIndex.toString());
		} else {
			params.delete("rangeStart");
			params.delete("rangeEnd");
		}

		const newSearch = params.toString();
		const newURL = newSearch
			? `${window.location.pathname}?${newSearch}${window.location.hash}`
			: `${window.location.pathname}${window.location.hash}`;

		if (window.location.search !== `?${newSearch}`) {
			window.history.replaceState(null, "", newURL);
		}
	}, [
		activeTab,
		chartType,
		viewMode,
		selectedSchools,
		selectedEvents,
		rangeFilter,
	]);

	// Sync URL hash with active tab and clean up irrelevant query params
	useEffect(() => {
		if (typeof window === "undefined") return;

		const params = new URLSearchParams(window.location.search);

		// Clean up query params based on active tab
		if (activeTab === "compare") {
			// Remove all query params for compare tab (it uses hash params)
			params.delete("season");
			params.delete("state");
			params.delete("event");
			params.delete("date");
			params.delete("search");
			params.delete("chartType");
			params.delete("viewMode");
			params.delete("schools");
			params.delete("events");
			params.delete("rangeStart");
			params.delete("rangeEnd");
		} else if (activeTab === "charts") {
			// Remove leaderboard params
			params.delete("season");
			params.delete("state");
			params.delete("event");
			params.delete("date");
			params.delete("search");
		} else if (activeTab === "leaderboard") {
			// Remove charts params
			params.delete("chartType");
			params.delete("viewMode");
			params.delete("schools");
			params.delete("events");
			params.delete("rangeStart");
			params.delete("rangeEnd");
			// Remove date param (no longer used)
			params.delete("date");
		}

		const newHash = `#${activeTab}`;
		const newSearch = params.toString();
		const newURL = newSearch
			? `${window.location.pathname}?${newSearch}${newHash}`
			: `${window.location.pathname}${newHash}`;

		if (
			window.location.hash !== newHash ||
			window.location.search !== `?${newSearch}`
		) {
			window.history.replaceState(null, "", newURL);
		}
	}, [activeTab]);

	// Listen for hash changes (back/forward button)
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleHashChange = () => {
			const hash = window.location.hash;
			// Check if it's a compare link
			if (hash.startsWith("#compare")) {
				setActiveTab("compare");
			} else {
				const hashWithoutQuery = hash.split("?")[0]?.slice(1) || "";
				if (
					hashWithoutQuery === "charts" ||
					hashWithoutQuery === "leaderboard" ||
					hashWithoutQuery === "compare"
				) {
					setActiveTab(hashWithoutQuery as TabType);
				} else if (!hash) {
					// If no hash, default to charts
					setActiveTab("charts");
				}
			}
		};

		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	// Listen for query param changes (back/forward button) - for charts tab
	useEffect(() => {
		if (typeof window === "undefined" || activeTab !== "charts") return;

		const handlePopState = () => {
			const params = new URLSearchParams(window.location.search);
			const newChartType = (params.get("chartType") || "overall") as ChartType;
			const newViewMode = (params.get("viewMode") || "tournament") as
				| "season"
				| "tournament";
			const schoolsParam = params.get("schools");
			const eventsParam = params.get("events");
			const rangeStart = params.get("rangeStart");
			const rangeEnd = params.get("rangeEnd");

			if (newChartType !== chartType) setChartType(newChartType);
			if (newViewMode !== viewMode) setViewMode(newViewMode);

			if (schoolsParam) {
				const newSchools = schoolsParam
					.split(",")
					.map((s) => decodeURIComponent(s));
				if (
					JSON.stringify(newSchools.sort()) !==
					JSON.stringify([...selectedSchools].sort())
				) {
					setSelectedSchools(newSchools);
				}
			} else if (selectedSchools.length > 0) {
				setSelectedSchools([]);
			}

			if (eventsParam) {
				const newEvents = eventsParam
					.split(",")
					.map((e) => decodeURIComponent(e));
				if (
					JSON.stringify(newEvents.sort()) !==
					JSON.stringify([...selectedEvents].sort())
				) {
					setSelectedEvents(newEvents);
				}
			} else if (selectedEvents.length > 0) {
				setSelectedEvents([]);
			}

			if (rangeStart && rangeEnd) {
				const newRange = {
					startIndex: Number.parseInt(rangeStart, 10),
					endIndex: Number.parseInt(rangeEnd, 10),
				};
				if (
					!rangeFilter ||
					rangeFilter.startIndex !== newRange.startIndex ||
					rangeFilter.endIndex !== newRange.endIndex
				) {
					setRangeFilter(newRange);
				}
			} else if (rangeFilter) {
				setRangeFilter(null);
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [
		activeTab,
		chartType,
		viewMode,
		selectedSchools,
		selectedEvents,
		rangeFilter,
	]);

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

			{/* Tab Content - Keep all tabs mounted but hidden to preserve state */}
			<div className="min-h-96">
				<div
					style={{
						display: activeTab === "charts" ? "block" : "none",
					}}
				>
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
				</div>
				<div
					style={{
						display: activeTab === "leaderboard" ? "block" : "none",
					}}
				>
					<Leaderboard
						eloData={eloData}
						division={division}
						metadata={metadata}
						externalDate={leaderboardDate}
					/>
				</div>
				<div
					style={{
						display: activeTab === "compare" ? "block" : "none",
					}}
				>
					<CompareTool eloData={eloData} division={division} />
				</div>
			</div>
		</div>
	);
};

export default EloViewer;
