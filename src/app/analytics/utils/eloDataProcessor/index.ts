/**
 * Main entry point for ELO data processing utilities
 * Re-exports all processors and utilities
 */

import type { ChartData, ChartType, EloData, EloMetadata } from "@/app/analytics/types/elo";
import { calculateWinProbability, compareSchools } from "./processors/comparisonProcessor";
import { processEventBySeason, processEventByTournament } from "./processors/eventProcessor";
import { getLeaderboard } from "./processors/leaderboardProcessor";
import { processOverallBySeason, processOverallByTournament } from "./processors/overallProcessor";
import { formatDate, getAllTournamentDates } from "./utils/dateUtils";
import { getAllEvents, getAllSchools } from "./utils/schoolHelpers";

export { getAllSchools, getAllEvents };
export { processOverallBySeason, processOverallByTournament };
export { processEventBySeason, processEventByTournament };
export { getLeaderboard };
export { compareSchools, calculateWinProbability };
export { formatDate, getAllTournamentDates };

export const processChartData = (
  eloData: EloData,
  chartType: ChartType,
  selectedSchools: string[],
  selectedEvents: string[] = [],
  viewMode: "season" | "tournament" = "season",
  metadata?: EloMetadata
): ChartData => {
  if (chartType === "overall") {
    return viewMode === "season"
      ? processOverallBySeason(eloData, selectedSchools)
      : processOverallByTournament(eloData, selectedSchools, metadata);
  }
  return viewMode === "season"
    ? processEventBySeason(eloData, selectedSchools, selectedEvents)
    : processEventByTournament(eloData, selectedSchools, selectedEvents, metadata);
};
