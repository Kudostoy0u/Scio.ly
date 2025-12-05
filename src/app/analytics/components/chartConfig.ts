import type { ChartData, ChartType } from "@/app/analytics/types/elo";
import type { ChartConfig, RangeFilter } from "./chart/chartConstants";
import { getEventSeasonConfig } from "./chart/eventSeasonConfig";
import { getEventTournamentConfig } from "./chart/eventTournamentConfig";
import { getOverallSeasonConfig } from "./chart/overallSeasonConfig";
import { getOverallTournamentConfig } from "./chart/overallTournamentConfig";

export const getChartConfig = (
	data: ChartData,
	chartType: ChartType,
	viewMode: "season" | "tournament" = "season",
	darkMode = false,
	rangeFilter?: RangeFilter,
	allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>,
): ChartConfig => {
	if (chartType === "overall") {
		return viewMode === "season"
			? getOverallSeasonConfig(data, darkMode, rangeFilter)
			: getOverallTournamentConfig(data, darkMode, rangeFilter, allDataPoints);
	}
	return viewMode === "season"
		? getEventSeasonConfig(data, darkMode, rangeFilter)
		: getEventTournamentConfig(data, darkMode, rangeFilter, allDataPoints);
};
