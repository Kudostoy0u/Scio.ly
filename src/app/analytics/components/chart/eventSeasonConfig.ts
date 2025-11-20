import type { ChartData } from "@/app/analytics/types/elo";
import type { ChartConfig, RangeFilter } from "./chartConstants";
import { CHART_COLORS } from "./chartConstants";

export const getEventSeasonConfig = (
  data: ChartData,
  darkMode = false,
  rangeFilter?: RangeFilter
): ChartConfig => {
  const schools = Object.keys(data);
  const firstSchool = schools[0];
  if (!firstSchool) {
    return { type: "line", data: { labels: [], datasets: [] }, options: {} };
  }
  const events = Object.keys(data[firstSchool] || {});
  const allSeasons = [
    ...new Set(
      events.flatMap((event) =>
        Object.keys((data[firstSchool] as Record<string, Record<string, number>>)?.[event] || {})
      )
    ),
  ].sort();

  const seasons = rangeFilter
    ? allSeasons.slice(rangeFilter.startIndex, rangeFilter.endIndex + 1)
    : allSeasons;

  return {
    type: "line",
    data: {
      labels: seasons,
      datasets: schools.flatMap((school, schoolIndex) =>
        events.map((event, eventIndex) => ({
          label: `${school} - ${event}`,
          data: seasons.map(
            (season) =>
              (data[school] as Record<string, Record<string, number>>)?.[event]?.[season] || null
          ),
          borderColor:
            CHART_COLORS[(schoolIndex * events.length + eventIndex) % CHART_COLORS.length] ?? "#000000",
          backgroundColor: `${CHART_COLORS[(schoolIndex * events.length + eventIndex) % CHART_COLORS.length]}20`,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        }))
      ),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Event Elo Rating by Season",
          font: { size: 18 },
          color: darkMode ? "#ffffff" : "#000000",
        },
        legend: {
          position: "top",
          labels: {
            color: darkMode ? "#ffffff" : "#000000",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: "Elo Rating",
            color: darkMode ? "#ffffff" : "#000000",
          },
          ticks: {
            color: darkMode ? "#ffffff" : "#000000",
          },
        },
        x: {
          title: {
            display: true,
            text: "Season",
            color: darkMode ? "#ffffff" : "#000000",
          },
          ticks: {
            color: darkMode ? "#ffffff" : "#000000",
          },
        },
      },
    },
  };
};
