import type { ChartData, ChartType } from "@/app/analytics/types/elo";
import type { ChartConfig, RangeFilter } from "./chart/chartConstants";
import { getEventSeasonConfig } from "./chart/eventSeasonConfig";
import { getEventTournamentConfig } from "./chart/eventTournamentConfig";
import { getOverallSeasonConfig } from "./chart/overallSeasonConfig";
import { getOverallTournamentConfig } from "./chart/overallTournamentConfig";

export const getChartConfig = (
	data: ChartData,
	chartType: ChartType,
	viewMode: "season" | "tournament",
	darkMode: boolean,
	rangeFilter?: RangeFilter,
	dataPointsForSlider?: Array<{
		x: Date;
		y: number;
		tournament?: string;
		link?: string;
	}>,
): ChartConfig => {
	if (chartType === "overall" && viewMode === "season") {
		return getOverallSeasonConfig(data, darkMode, rangeFilter);
	}
	if (chartType === "overall" && viewMode === "tournament") {
		return getOverallTournamentConfig(
			data,
			darkMode,
			rangeFilter,
			dataPointsForSlider,
		);
	}
	if (chartType === "event" && viewMode === "season") {
		return getEventSeasonConfig(data, darkMode, rangeFilter);
	}
	if (chartType === "event" && viewMode === "tournament") {
		return getEventTournamentConfig(
			data,
			darkMode,
			rangeFilter,
			dataPointsForSlider,
		);
	}

	// Fallback (should never reach here, but TypeScript needs it)
	return getOverallSeasonConfig(data, darkMode, rangeFilter);
};
