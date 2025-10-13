import type { ChartData, ChartType } from '../types/elo';
import type { ChartConfig, RangeFilter } from './chart/chartConstants';
import { getOverallSeasonConfig } from './chart/overallSeasonConfig';
import { getOverallTournamentConfig } from './chart/overallTournamentConfig';
import { getEventSeasonConfig } from './chart/eventSeasonConfig';
import { getEventTournamentConfig } from './chart/eventTournamentConfig';

export const getChartConfig = (
  data: ChartData, 
  chartType: ChartType, 
  viewMode: 'season' | 'tournament' = 'season', 
  darkMode: boolean = false,
  rangeFilter?: RangeFilter,
  allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>
): ChartConfig => {
  if (chartType === 'overall') {
    return viewMode === 'season' 
      ? getOverallSeasonConfig(data, darkMode, rangeFilter)
      : getOverallTournamentConfig(data, darkMode, rangeFilter, allDataPoints);
  } else {
    return viewMode === 'season'
      ? getEventSeasonConfig(data, darkMode, rangeFilter)
      : getEventTournamentConfig(data, darkMode, rangeFilter, allDataPoints);
  }
};

// Re-export types and constants for backward compatibility
export type { ChartConfig, RangeFilter } from './chart/chartConstants';
export { CHART_COLORS } from './chart/chartConstants';
export { showResultsBox } from './chart/chartUtils';