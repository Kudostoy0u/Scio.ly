import type { Chart } from "chart.js";

let currentResultsBox: HTMLElement | null = null;

export const showResultsBox = (
  point: { x: number; y: number; tournament?: string },
  chart: Chart
) => {
  const isMobile = window.innerWidth < 768;
  if (!isMobile) {
    return;
  }

  if (currentResultsBox) {
    currentResultsBox.remove();
    currentResultsBox = null;
  }

  const resultsBox = document.createElement("div");
  resultsBox.id = "chart-results-box";
  resultsBox.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-width: 200px;
    font-size: 12px;
    pointer-events: none;
  `;

  const tournament = point.tournament || "Unknown Tournament";
  const score = point.y || 0;

  resultsBox.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${tournament}</div>
    <div>Score: ${score}</div>
  `;

  const canvasPosition = chart.canvas.getBoundingClientRect();
  const x = canvasPosition.left + point.x;
  const y = canvasPosition.top + point.y - 60;

  resultsBox.style.left = `${x}px`;
  resultsBox.style.top = `${y}px`;

  document.body.appendChild(resultsBox);
  currentResultsBox = resultsBox;

  setTimeout(() => {
    if (currentResultsBox) {
      currentResultsBox.remove();
      currentResultsBox = null;
    }
  }, 3000);
};
