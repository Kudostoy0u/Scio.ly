import type { ChartData } from "@/app/analytics/types/elo";
import type { ChartConfig, RangeFilter } from "./chartConstants";
import { CHART_COLORS } from "./chartConstants";

export const getOverallSeasonConfig = (
	data: ChartData,
	darkMode = false,
	rangeFilter?: RangeFilter,
): ChartConfig => {
	const schools = Object.keys(data);
	const allSeasons = [
		...new Set(
			Object.values(data).flatMap((school) =>
				Object.keys(school as Record<string, number>),
			),
		),
	].sort();

	const seasons = rangeFilter
		? allSeasons.slice(rangeFilter.startIndex, rangeFilter.endIndex + 1)
		: allSeasons;

	return {
		type: "line",
		data: {
			labels: seasons,
			datasets: schools.map((school, index) => ({
				label: school,
				data: seasons.map(
					(season) => (data[school] as Record<string, number>)[season] || null,
				),
				borderColor: CHART_COLORS[index % CHART_COLORS.length] ?? "#000000",
				backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length] ?? "#000000"}20`,
				borderWidth: 3,
				fill: false,
				tension: 0.1,
			})),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: "Overall Elo Rating by Season",
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
