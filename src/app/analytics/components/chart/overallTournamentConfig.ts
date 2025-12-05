import type { ChartData } from "@/app/analytics/types/elo";
import type { ActiveElement, Chart, ChartEvent, TooltipModel } from "chart.js";
import type { ChartConfig, RangeFilter } from "./chartConstants";
import { CHART_COLORS } from "./chartConstants";
import { showResultsBox } from "./chartUtils";

interface TooltipContext {
	tooltip: TooltipModel<"line">;
	chart: Chart<"line">;
}

interface ChartPoint {
	x: Date | number;
	y: number;
	tournament?: string;
	duosmiumLink?: string;
	eloChange?: number;
}

function createTooltipElement(): HTMLElement {
	const tooltipEl = document.createElement("div");
	tooltipEl.id = "chartjs-tooltip";

	const isMobile = window.innerWidth < 768;
	const baseFontSize = isMobile ? "8px" : "13px";
	const basePadding = isMobile ? "4px 6px" : "12px 14px";
	const transition = isMobile ? "none" : "all 0.2s ease-in-out";

	tooltipEl.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    border-radius: 8px;
    padding: ${basePadding};
    pointer-events: none;
    transform: translate(-100%, -50%);
    transition: ${transition};
    font-size: ${baseFontSize};
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    opacity: 0;
    visibility: hidden;
    white-space: nowrap;
  `;
	document.body.appendChild(tooltipEl);
	return tooltipEl;
}

function formatEloChangeHtml(eloChange: number): string {
	if (eloChange === 0) {
		return "";
	}
	const changeText = `${eloChange > 0 ? "+" : ""}${Math.round(eloChange)}`;
	const changeColor = eloChange > 0 ? "#10B981" : "#EF4444";
	return ` <span style="color: ${changeColor}; font-weight: bold;">${changeText}</span>`;
}

function positionTooltip(
	tooltipEl: HTMLElement,
	tooltipModel: TooltipModel<"line">,
	chart: Chart<"line">,
	isMobile: boolean,
): void {
	const position = chart.canvas.getBoundingClientRect();
	const chartCenterX = position.width / 2;
	const isLeftHalf = tooltipModel.caretX < chartCenterX;

	tooltipEl.style.opacity = "1";
	tooltipEl.style.visibility = "visible";

	if (isLeftHalf) {
		tooltipEl.style.transform = isMobile
			? "translate(0%, -50%)"
			: "translate(0%, -50%) scale(1)";
		tooltipEl.style.left = `${position.left + window.pageXOffset + tooltipModel.caretX + 10}px`;
	} else {
		tooltipEl.style.transform = isMobile
			? "translate(-100%, -50%)"
			: "translate(-100%, -50%) scale(1)";
		tooltipEl.style.left = `${position.left + window.pageXOffset + tooltipModel.caretX - 10}px`;
	}
	tooltipEl.style.top = `${position.top + window.pageYOffset + tooltipModel.caretY}px`;
}

function handleTooltipUpdate(
	context: TooltipContext,
	tooltipEl: HTMLElement,
): void {
	const tooltipModel = context.tooltip;
	const isMobile = window.innerWidth < 768;

	if (tooltipModel.opacity === 0) {
		tooltipEl.style.opacity = "0";
		tooltipEl.style.visibility = "hidden";
		// Don't change transform when fading out - keep current position
		return;
	}

	if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
		const dataPoint = tooltipModel.dataPoints[0];
		if (!dataPoint) {
			return;
		}
		const point = dataPoint.raw as ChartPoint;
		const eloChange = point.eloChange || 0;
		const eloChangeHtml = formatEloChangeHtml(eloChange);
		const dateFontSize = isMobile ? "7px" : "11px";

		tooltipEl.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 2px; line-height: 1.3;">
        <a href="${point.duosmiumLink}" target="_blank" style="color: white; text-decoration: none; cursor: pointer;" onclick="event.stopPropagation();">
          ${point.tournament}
        </a>
      </div>
      <div style="margin-bottom: 6px; color: #ccc; font-size: ${dateFontSize};">${new Date(point.x).toLocaleDateString()}</div>
      <div style="line-height: 1.3;">${dataPoint.dataset.label}: <strong>${Math.round(point.y)}</strong>${eloChangeHtml}</div>
    `;

		positionTooltip(tooltipEl, tooltipModel, context.chart, isMobile);
	}
}

function handleMobileTooltip(
	point: ChartPoint,
	chart: Chart,
	datasetIndex: number,
	event: ChartEvent,
): void {
	const pointData = point as { x: number; y: number; tournament?: string };
	showResultsBox(pointData, chart);

	const tooltipEl = document.getElementById("chartjs-tooltip");
	if (!tooltipEl) {
		return;
	}

	const eloChange = point.eloChange || 0;
	const eloChangeHtml = formatEloChangeHtml(eloChange);
	const dateFontSize = "7px";

	tooltipEl.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 2px; line-height: 1.3;">
      <a href="${point.duosmiumLink}" target="_blank" style="color: white; text-decoration: none; cursor: pointer;" onclick="event.stopPropagation();">
        ${point.tournament}
      </a>
    </div>
    <div style="margin-bottom: 6px; color: #ccc; font-size: ${dateFontSize};">${new Date(point.x).toLocaleDateString()}</div>
    <div style="line-height: 1.3;">${chart?.data?.datasets?.[datasetIndex]?.label}: <strong>${Math.round(point.y)}</strong>${eloChangeHtml}</div>
  `;

	const canvas = chart.canvas;
	const rect = canvas.getBoundingClientRect();
	const clickX = (event.native as MouseEvent)?.offsetX || event.x || 0;
	const clickY = (event.native as MouseEvent)?.offsetY || event.y || 0;
	const chartCenterX = rect.width / 2;
	const isLeftHalf = clickX < chartCenterX;

	tooltipEl.style.opacity = "1";
	tooltipEl.style.visibility = "visible";

	if (isLeftHalf) {
		tooltipEl.style.transform = "translate(0%, -50%) scale(1)";
		tooltipEl.style.left = `${rect.left + window.pageXOffset + clickX + 10}px`;
	} else {
		tooltipEl.style.transform = "translate(-100%, -50%) scale(1)";
		tooltipEl.style.left = `${rect.left + window.pageXOffset + clickX - 10}px`;
	}
	tooltipEl.style.top = `${rect.top + window.pageYOffset + clickY}px`;
}

export const getOverallTournamentConfig = (
	data: ChartData,
	darkMode = false,
	rangeFilter?: RangeFilter,
	allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>,
): ChartConfig => {
	const schools = Object.keys(data);

	let startDate: Date | null = null;
	let endDate: Date | null = null;

	if (rangeFilter && allDataPoints && allDataPoints.length > 0) {
		const sortedPoints = [...allDataPoints].sort(
			(a, b) => a.x.getTime() - b.x.getTime(),
		);
		startDate =
			sortedPoints[rangeFilter.startIndex]?.x || sortedPoints[0]?.x || null;
		endDate =
			sortedPoints[rangeFilter.endIndex]?.x ||
			sortedPoints[sortedPoints.length - 1]?.x ||
			null;
	}

	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
	const pointRadius = isMobile ? 5 : 3;
	const pointHoverRadius = isMobile ? 6 : 5;

	return {
		type: "line",
		data: {
			datasets: schools.map((school, index) => {
				const schoolData = data[school] as Array<{
					date: string;
					tournament: string;
					elo: number;
					duosmiumLink: string;
				}>;

				const filteredData =
					startDate && endDate
						? schoolData.filter((point) => {
								const pointDate = new Date(point.date);
								// startDate and endDate are guaranteed to be non-null by the condition above
								return pointDate >= startDate && pointDate <= endDate;
							})
						: schoolData;

				return {
					label: school,
					data: filteredData.map((point, index) => {
						const previousElo =
							index > 0
								? (filteredData[index - 1]?.elo ?? point.elo)
								: point.elo;
						const eloChange = point.elo - previousElo;

						return {
							x: new Date(point.date),
							y: point.elo,
							tournament: point.tournament,
							duosmiumLink: point.duosmiumLink,
							eloChange: index > 0 ? eloChange : 0,
						};
					}),
					borderColor: CHART_COLORS[index % CHART_COLORS.length] ?? "#000000",
					backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length] ?? "#000000"}20`,
					borderWidth: 2,
					fill: false,
					tension: 0.1,
					pointRadius: pointRadius,
					pointHoverRadius: pointHoverRadius,
				};
			}),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: "Elo",
					font: { size: 18 },
					color: darkMode ? "#ffffff" : "#000000",
				},
				legend: {
					position: "top",
					labels: {
						color: darkMode ? "#ffffff" : "#000000",
					},
				},
				tooltip: {
					enabled: false,
					external: (context: TooltipContext) => {
						let tooltipEl = document.getElementById("chartjs-tooltip");
						if (!tooltipEl) {
							tooltipEl = createTooltipElement();
						}
						handleTooltipUpdate(context, tooltipEl);
					},
				},
			},
			scales: {
				x: {
					type: "time",
					time: {
						unit: "month",
					},
					title: {
						display: true,
						text: "Date",
						color: darkMode ? "#ffffff" : "#000000",
					},
					ticks: {
						color: darkMode ? "#ffffff" : "#000000",
					},
				},
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
			},
			onClick: (event: ChartEvent, elements: ActiveElement[], chart: Chart) => {
				if (elements.length === 0) {
					return;
				}

				const el = elements[0];
				if (!el) {
					return;
				}
				const datasetIndex = el.datasetIndex;
				const idx = el.index;
				const point = chart?.data?.datasets?.[datasetIndex]?.data?.[idx] as
					| ChartPoint
					| undefined;

				if (!point?.duosmiumLink) {
					return;
				}

				const isMobile = window.innerWidth < 768;

				if (isMobile) {
					handleMobileTooltip(point, chart, datasetIndex, event);
				} else {
					window.open(point.duosmiumLink, "_blank");
				}
			},
		},
	};
};
