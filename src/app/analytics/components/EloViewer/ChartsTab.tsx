"use client";
import type { ChartData, ChartType } from "@/app/analytics/types/elo";
import { Line } from "react-chartjs-2";
import { getChartConfig } from "../ChartConfig";
import ChartRangeSlider from "../ChartRangeSlider";
import ChartControls from "./ChartControls";
import EventSelector from "./EventSelector";
import SchoolSelector from "./SchoolSelector";

interface ChartsTabProps {
	darkMode: boolean;
	chartType: ChartType;
	viewMode: "season" | "tournament";
	chartData: ChartData;
	isLoading: boolean;
	error: string | null;
	isMobile: boolean;
	rangeFilter: { startIndex: number; endIndex: number } | null;
	dataPointsForSlider: Array<{
		x: Date;
		y: number;
		tournament?: string;
		link?: string;
	}>;
	filteredSchools: string[];
	selectedSchools: string[];
	schoolSearch: string;
	filteredEvents: string[];
	selectedEvents: string[];
	eventSearch: string;
	isSchoolAvailable: (school: string) => boolean;
	onChartTypeChange: (type: ChartType) => void;
	onViewModeChange: (mode: "season" | "tournament") => void;
	onSchoolSearchChange: (value: string) => void;
	onSchoolToggle: (school: string) => void;
	onRemoveSchool: (school: string) => void;
	onClearAllSchools: () => void;
	onEventSearchChange: (value: string) => void;
	onEventToggle: (event: string) => void;
	onRemoveEvent: (event: string) => void;
	onClearAllEvents: () => void;
	onRangeChange: (startIndex: number, endIndex: number) => void;
}

export default function ChartsTab({
	darkMode,
	chartType,
	viewMode,
	chartData,
	isLoading,
	error,
	isMobile,
	rangeFilter,
	dataPointsForSlider,
	filteredSchools,
	selectedSchools,
	schoolSearch,
	filteredEvents,
	selectedEvents,
	eventSearch,
	isSchoolAvailable,
	onChartTypeChange,
	onViewModeChange,
	onSchoolSearchChange,
	onSchoolToggle,
	onRemoveSchool,
	onClearAllSchools,
	onEventSearchChange,
	onEventToggle,
	onRemoveEvent,
	onClearAllEvents,
	onRangeChange,
}: ChartsTabProps) {
	const chartConfig =
		Object.keys(chartData).length > 0
			? getChartConfig(
					chartData,
					chartType,
					viewMode,
					darkMode,
					rangeFilter || undefined,
					dataPointsForSlider,
				)
			: null;

	return (
		<div>
			<div
				className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg shadow-sm border ${darkMode ? "border-gray-700" : "border-gray-200"} p-6 mb-6`}
			>
				<div className="space-y-6">
					<ChartControls
						chartType={chartType}
						viewMode={viewMode}
						darkMode={darkMode}
						onChartTypeChange={onChartTypeChange}
						onViewModeChange={onViewModeChange}
					/>

					<SchoolSelector
						schools={filteredSchools}
						selectedSchools={selectedSchools}
						schoolSearch={schoolSearch}
						darkMode={darkMode}
						isSchoolAvailable={isSchoolAvailable}
						onSchoolSearchChange={onSchoolSearchChange}
						onSchoolToggle={onSchoolToggle}
						onRemoveSchool={onRemoveSchool}
						onClearAllSchools={onClearAllSchools}
					/>

					{chartType === "event" && (
						<EventSelector
							events={filteredEvents}
							selectedEvents={selectedEvents}
							eventSearch={eventSearch}
							darkMode={darkMode}
							onEventSearchChange={onEventSearchChange}
							onEventToggle={onEventToggle}
							onRemoveEvent={onRemoveEvent}
							onClearAllEvents={onClearAllEvents}
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
												const tooltip = e.currentTarget
													.nextElementSibling as HTMLElement;
												if (tooltip) {
													tooltip.style.opacity =
														tooltip.style.opacity === "1" ? "0" : "1";
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
									Our Elo ratings are calculated using an ad-hoc simulation that
									factors in team placements and tournament strength. Higher
									placements and stronger tournaments result in larger Elo
									gains.
								</p>
								<p className="mb-2">
									The system accounts for regional, state, and national
									tournament levels, with nationals carrying the most weight.
								</p>
								{isMobile ? (
									<p className="text-xs opacity-75">
										💡 Tip: Click a data point twice to see tournament results!
									</p>
								) : (
									<p className="text-xs opacity-75">
										💡 Tip: Click on data points to view detailed tournament
										results.
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
								<p
									className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
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
						onRangeChange={onRangeChange}
						isMobile={isMobile}
					/>
				)}
			</div>
		</div>
	);
}
