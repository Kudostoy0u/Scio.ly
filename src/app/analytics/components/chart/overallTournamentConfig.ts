import type { ChartData } from '../../types/elo';
import type { ChartConfig, RangeFilter } from './chartConstants';
import type { ChartEvent, ActiveElement, Chart } from 'chart.js';
import { CHART_COLORS } from './chartConstants';
import { showResultsBox } from './chartUtils';

export const getOverallTournamentConfig = (
  data: ChartData, 
  darkMode: boolean = false, 
  rangeFilter?: RangeFilter, 
  allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>
): ChartConfig => {
  const schools = Object.keys(data);
  
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (rangeFilter && allDataPoints && allDataPoints.length > 0) {
    const sortedPoints = [...allDataPoints].sort((a, b) => a.x.getTime() - b.x.getTime());
    startDate = sortedPoints[rangeFilter.startIndex]?.x || sortedPoints[0].x;
    endDate = sortedPoints[rangeFilter.endIndex]?.x || sortedPoints[sortedPoints.length - 1].x;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const pointRadius = isMobile ? 5 : 3;
  const pointHoverRadius = isMobile ? 6 : 5;
  
  return {
    type: 'line',
    data: {
      datasets: schools.map((school, index) => {
        const schoolData = data[school] as Array<{ date: string; tournament: string; elo: number; duosmiumLink: string }>;
        
        const filteredData = (startDate && endDate) 
          ? schoolData.filter(point => {
              const pointDate = new Date(point.date);
              return pointDate >= startDate && pointDate <= endDate;
            })
          : schoolData;
        
        return {
          label: school,
          data: filteredData.map((point, index) => {
            const previousElo = index > 0 ? filteredData[index - 1].elo : point.elo;
            const eloChange = point.elo - previousElo;
            
            return {
              x: new Date(point.date),
              y: point.elo,
              tournament: point.tournament,
              duosmiumLink: point.duosmiumLink,
              eloChange: index > 0 ? eloChange : 0
            };
          }),
          borderColor: CHART_COLORS[index % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: pointRadius,
          pointHoverRadius: pointHoverRadius
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Elo',
          font: { size: 18 },
          color: darkMode ? '#ffffff' : '#000000'
        },
        legend: {
          position: 'top',
          labels: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        },
        tooltip: {
          enabled: false,
          external: function(context: any) {
            let tooltipEl = document.getElementById('chartjs-tooltip');
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              
              const isMobile = window.innerWidth < 768;
              const baseFontSize = isMobile ? '8px' : '13px';
              const basePadding = isMobile ? '4px 6px' : '12px 14px';
              const transition = isMobile ? 'none' : 'all 0.2s ease-in-out';
              
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
            }

            const tooltipModel = context.tooltip;
            const isMobile = window.innerWidth < 768;
            
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = '0';
              tooltipEl.style.visibility = 'hidden';
              if (!isMobile) {
                tooltipEl.style.transform = 'translate(-100%, -50%) scale(0.9)';
              }
              return;
            }

            if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
              const dataPoint = tooltipModel.dataPoints[0];
              const point = dataPoint.raw;
              const eloChange = point.eloChange || 0;
              
              let eloChangeHtml = '';
              if (eloChange !== 0) {
                const changeText = `${eloChange > 0 ? '+' : ''}${Math.round(eloChange)}`;
                const changeColor = eloChange > 0 ? '#10B981' : '#EF4444';
                eloChangeHtml = ` <span style="color: ${changeColor}; font-weight: bold;">${changeText}</span>`;
              }
              
              const dateFontSize = isMobile ? '7px' : '11px';
              
              tooltipEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 2px; line-height: 1.3;">
                  <a href="${point.duosmiumLink}" target="_blank" style="color: white; text-decoration: none; cursor: pointer;" onclick="event.stopPropagation();">
                    ${point.tournament}
                  </a>
                </div>
                <div style="margin-bottom: 6px; color: #ccc; font-size: ${dateFontSize};">${new Date(point.x).toLocaleDateString()}</div>
                <div style="line-height: 1.3;">${dataPoint.dataset.label}: <strong>${Math.round(point.y)}</strong>${eloChangeHtml}</div>
              `;

              const position = context.chart.canvas.getBoundingClientRect();
              const chartCenterX = position.width / 2;
              
              const isLeftHalf = tooltipModel.caretX < chartCenterX;
              
              if (isLeftHalf) {
                tooltipEl.style.opacity = '1';
                tooltipEl.style.visibility = 'visible';
                if (isMobile) {
                  tooltipEl.style.transform = 'translate(0%, -50%)';
                } else {
                  tooltipEl.style.transform = 'translate(0%, -50%) scale(1)';
                }
                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 10 + 'px';
                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
              } else {
                tooltipEl.style.opacity = '1';
                tooltipEl.style.visibility = 'visible';
                if (isMobile) {
                  tooltipEl.style.transform = 'translate(-100%, -50%)';
                } else {
                  tooltipEl.style.transform = 'translate(-100%, -50%) scale(1)';
                }
                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX - 10 + 'px';
                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month'
          },
          title: {
            display: true,
            text: 'Date',
            color: darkMode ? '#ffffff' : '#000000'
          },
          ticks: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Elo Rating',
            color: darkMode ? '#ffffff' : '#000000'
          },
          ticks: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        }
      },
      onClick: (event: ChartEvent, elements: ActiveElement[], chart: Chart) => {
        if (elements.length > 0) {
          const el = elements[0];
          const datasetIndex = el.datasetIndex;
          const idx = el.index;
          const point = chart?.data?.datasets?.[datasetIndex]?.data?.[idx] as any;
          
          if (point && point.duosmiumLink) {
            const isMobile = window.innerWidth < 768;
            
            if (isMobile) {
              showResultsBox(point, chart);
              
              const tooltipEl = document.getElementById('chartjs-tooltip');
              if (tooltipEl) {
                const eloChange = point.eloChange || 0;
                
                let eloChangeHtml = '';
                if (eloChange !== 0) {
                  const changeText = `${eloChange > 0 ? '+' : ''}${Math.round(eloChange)}`;
                  const changeColor = eloChange > 0 ? '#10B981' : '#EF4444';
                  eloChangeHtml = ` <span style="color: ${changeColor}; font-weight: bold;">${changeText}</span>`;
                }
                
                const dateFontSize = '7px';
                
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
                
                const clickX = (event.native as MouseEvent)?.offsetX || (event.x || 0);
                const clickY = (event.native as MouseEvent)?.offsetY || (event.y || 0);
                
                const chartCenterX = rect.width / 2;
                const isLeftHalf = clickX < chartCenterX;
                
                if (isLeftHalf) {
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(0%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX + 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                } else {
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(-100%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX - 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                }
              }
            } else {
              window.open(point.duosmiumLink, '_blank');
            }
          }
        }
      }
    }
  };
};
