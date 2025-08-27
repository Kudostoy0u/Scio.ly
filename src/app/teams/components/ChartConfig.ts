import type { ChartData, ChartType } from '../types/elo';
import type { ChartEvent, ActiveElement, Chart } from 'chart.js';

const colors = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
  '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#a8edea', '#fed6e3'
];

interface ChartConfig {
  type: 'line';
  data: {
    labels?: string[];
    datasets: Array<{
      label: string;
      data: (number | null)[] | Array<{ x: Date; y: number; tournament: string; duosmiumLink: string }>;
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      fill: boolean;
      tension: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }>;
  };
  options: any; // Use any to avoid complex Chart.js type issues
}

interface RangeFilter {
  startIndex: number;
  endIndex: number;
}

// Global state for the results box
let currentResultsBox: HTMLElement | null = null;

// Function to show results box (mobile only)
const showResultsBox = (point: any, chart: Chart) => {
  // Only show on mobile
  const isMobile = window.innerWidth < 768;
  if (!isMobile) return;

  // Remove existing results box
  if (currentResultsBox) {
    currentResultsBox.remove();
    currentResultsBox = null;
  }

  // Create new results box
  const resultsBox = document.createElement('div');
  resultsBox.id = 'chart-results-box';
  resultsBox.innerHTML = `
    <div 
      style="
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3B82F6;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 8px;
        font-size: 14px;
        color: #3B82F6;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: background-color 0.2s;
      "
      onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.2)'"
      onmouseout="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'"
      onclick="window.open('${point.duosmiumLink}', '_blank'); event.stopPropagation();"
    >
      <div 
        style="
          background: #3B82F6;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        "
      >
        →
      </div>
      <span>Want to see results for <strong>${point.tournament}</strong>?</span>
    </div>
  `;

  // Insert the box above the chart title
  const chartContainer = chart.canvas.parentElement;
  if (chartContainer) {
    chartContainer.insertBefore(resultsBox, chartContainer.firstChild);
    currentResultsBox = resultsBox;
  }
};




export const getOverallSeasonConfig = (data: ChartData, darkMode: boolean = false, rangeFilter?: RangeFilter): ChartConfig => {
  const schools = Object.keys(data);
  const allSeasons = [...new Set(Object.values(data).flatMap(school => Object.keys(school as Record<string, number>)))].sort();
  
  // Apply range filter if provided
  const seasons = rangeFilter 
    ? allSeasons.slice(rangeFilter.startIndex, rangeFilter.endIndex + 1)
    : allSeasons;
  
  return {
    type: 'line',
    data: {
      labels: seasons,
      datasets: schools.map((school, index) => ({
        label: school,
        data: seasons.map(season => (data[school] as Record<string, number>)[season] || null),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        fill: false,
        tension: 0.1
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Overall Elo Rating by Season',
          font: { size: 18 },
          color: darkMode ? '#ffffff' : '#000000'
        },
        legend: {
          position: 'top',
          labels: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        }
      },
      scales: {
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
        },
        x: {
          title: {
            display: true,
            text: 'Season',
            color: darkMode ? '#ffffff' : '#000000'
          },
          ticks: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        }
      }
    }
  };
};

export const getOverallTournamentConfig = (data: ChartData, darkMode: boolean = false, rangeFilter?: RangeFilter, allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>): ChartConfig => {
  const schools = Object.keys(data);
  
  // Determine date range from the range filter and all data points
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (rangeFilter && allDataPoints && allDataPoints.length > 0) {
    const sortedPoints = [...allDataPoints].sort((a, b) => a.x.getTime() - b.x.getTime());
    startDate = sortedPoints[rangeFilter.startIndex]?.x || sortedPoints[0].x;
    endDate = sortedPoints[rangeFilter.endIndex]?.x || sortedPoints[sortedPoints.length - 1].x;
  }

  // Check if mobile for larger point sizes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const pointRadius = isMobile ? 5 : 3;
  const pointHoverRadius = isMobile ? 6 : 5;
  
  return {
    type: 'line',
    data: {
      datasets: schools.map((school, index) => {
        const schoolData = data[school] as Array<{ date: string; tournament: string; elo: number; duosmiumLink: string }>;
        
        // Apply date-based filtering if range filter is provided
        const filteredData = (startDate && endDate) 
          ? schoolData.filter(point => {
              const pointDate = new Date(point.date);
              return pointDate >= startDate && pointDate <= endDate;
            })
          : schoolData;
        
        return {
          label: school,
          data: filteredData.map((point, index) => {
            // Calculate Elo change from previous tournament within filtered data
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
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
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
            // Get or create tooltip element
            let tooltipEl = document.getElementById('chartjs-tooltip');
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              
              // Check if mobile
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
            
            // Hide if no tooltip or opacity is 0 (mouse left the point)
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = '0';
              tooltipEl.style.visibility = 'hidden';
              if (!isMobile) {
                tooltipEl.style.transform = 'translate(-100%, -50%) scale(0.9)';
              }
              return;
            }

            // Get the data point
            if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
              const dataPoint = tooltipModel.dataPoints[0];
              const point = dataPoint.raw;
              const eloChange = point.eloChange || 0;
              
              // Build tooltip content with bold Elo rating and colored Elo change
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
              
              // Position tooltip based on data point position relative to chart center
              const isLeftHalf = tooltipModel.caretX < chartCenterX;
              
              if (isLeftHalf) {
                // Position to the right for points in left half
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
                // Position to the left for points in right half
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
              // Show results box for mobile only
              showResultsBox(point, chart);
              
              // On mobile, manually trigger tooltip display alongside results box
              const tooltipEl = document.getElementById('chartjs-tooltip');
              if (tooltipEl) {
                const eloChange = point.eloChange || 0;
                
                // Build tooltip content with bold Elo rating and colored Elo change
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

                // Position tooltip near the clicked point
                const canvas = chart.canvas;
                const rect = canvas.getBoundingClientRect();
                
                // Get the actual click position relative to the canvas
                const clickX = (event.native as MouseEvent)?.offsetX || (event.x || 0);
                const clickY = (event.native as MouseEvent)?.offsetY || (event.y || 0);
                
                // Position tooltip based on data point position relative to chart center
                const chartCenterX = rect.width / 2;
                const isLeftHalf = clickX < chartCenterX;
                
                if (isLeftHalf) {
                  // Position to the right for points in left half
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(0%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX + 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                } else {
                  // Position to the left for points in right half
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(-100%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX - 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                }
              }
            } else {
              // On desktop, open the link directly
              window.open(point.duosmiumLink, '_blank');
            }
          }
        }
      }
    }
  };
};

export const getEventSeasonConfig = (data: ChartData, darkMode: boolean = false, rangeFilter?: RangeFilter): ChartConfig => {
  const schools = Object.keys(data);
  const events = Object.keys(data[schools[0]] || {});
  const allSeasons = [...new Set(
    events.flatMap(event => 
      Object.keys((data[schools[0]] as Record<string, Record<string, number>>)[event] || {})
    )
  )].sort();
  
  // Apply range filter if provided
  const seasons = rangeFilter 
    ? allSeasons.slice(rangeFilter.startIndex, rangeFilter.endIndex + 1)
    : allSeasons;
  
  return {
    type: 'line',
    data: {
      labels: seasons,
      datasets: schools.flatMap((school, schoolIndex) => 
        events.map((event, eventIndex) => ({
          label: `${school} - ${event}`,
          data: seasons.map(season => (data[school] as Record<string, Record<string, number>>)[event]?.[season] || null),
          borderColor: colors[(schoolIndex * events.length + eventIndex) % colors.length],
          backgroundColor: colors[(schoolIndex * events.length + eventIndex) % colors.length] + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }))
      )
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Event Elo Rating by Season',
          font: { size: 18 },
          color: darkMode ? '#ffffff' : '#000000'
        },
        legend: {
          position: 'top',
          labels: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        }
      },
      scales: {
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
        },
        x: {
          title: {
            display: true,
            text: 'Season',
            color: darkMode ? '#ffffff' : '#000000'
          },
          ticks: {
            color: darkMode ? '#ffffff' : '#000000'
          }
        }
      }
    }
  };
};

export const getEventTournamentConfig = (data: ChartData, darkMode: boolean = false, rangeFilter?: RangeFilter, allDataPoints?: Array<{ x: Date; y: number; tournament?: string }>): ChartConfig => {
  const schools = Object.keys(data);
  const events = Object.keys(data[schools[0]] || {});
  
  // Determine date range from the range filter and all data points
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  if (rangeFilter && allDataPoints && allDataPoints.length > 0) {
    const sortedPoints = [...allDataPoints].sort((a, b) => a.x.getTime() - b.x.getTime());
    startDate = sortedPoints[rangeFilter.startIndex]?.x || sortedPoints[0].x;
    endDate = sortedPoints[rangeFilter.endIndex]?.x || sortedPoints[sortedPoints.length - 1].x;
  }

  // Check if mobile for larger point sizes
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const pointRadius = isMobile ? 6 : 3;
  const pointHoverRadius = isMobile ? 8 : 5;
  
  return {
    type: 'line',
    data: {
      datasets: schools.flatMap((school, schoolIndex) => 
        events.map((event, eventIndex) => {
          const eventData = (data[school] as Record<string, Array<{ date: string; tournament: string; elo: number; duosmiumLink: string }>>)[event];
          
          // Apply date-based filtering if range filter is provided
          const filteredData = (startDate && endDate) 
            ? eventData.filter(point => {
                const pointDate = new Date(point.date);
                return pointDate >= startDate && pointDate <= endDate;
              })
            : eventData;
          
          return {
            label: `${school} - ${event}`,
            data: filteredData.map((point, index) => {
              // Calculate Elo change from previous tournament within filtered data
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
            borderColor: colors[(schoolIndex * events.length + eventIndex) % colors.length],
            backgroundColor: colors[(schoolIndex * events.length + eventIndex) % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: pointRadius,
            pointHoverRadius: pointHoverRadius
          };
        })
      )
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
            // Get or create tooltip element
            let tooltipEl = document.getElementById('chartjs-tooltip');
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              
              // Check if mobile
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
            
            // Hide if no tooltip or opacity is 0 (mouse left the point)
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = '0';
              tooltipEl.style.visibility = 'hidden';
              if (!isMobile) {
                tooltipEl.style.transform = 'translate(-100%, -50%) scale(0.9)';
              }
              return;
            }

            // Get the data point
            if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
              const dataPoint = tooltipModel.dataPoints[0];
              const point = dataPoint.raw;
              const eloChange = point.eloChange || 0;
              
              // Build tooltip content with bold Elo rating and colored Elo change
              let eloChangeHtml = '';
              if (eloChange !== 0) {
                const changeText = `${eloChange > 0 ? '+' : ''}${Math.round(eloChange)}`;
                const changeColor = eloChange > 0 ? '#10B981' : '#EF4444';
                eloChangeHtml = ` <span style="color: ${changeColor}; font-weight: bold;">${changeText}</span>`;
              }
              
              const dateFontSize = isMobile ? '6px' : '11px';
              
              tooltipEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 2px; line-height: 1.3;">${point.tournament}</div>
                <div style="margin-bottom: 6px; color: #ccc; font-size: ${dateFontSize};">${new Date(point.x).toLocaleDateString()}</div>
                <div style="line-height: 1.3;">${dataPoint.dataset.label}: <strong>${Math.round(point.y)}</strong>${eloChangeHtml}</div>
              `;

              const position = context.chart.canvas.getBoundingClientRect();
              const chartCenterX = position.width / 2;
              
              // Position tooltip based on data point position relative to chart center
              const isLeftHalf = tooltipModel.caretX < chartCenterX;
              
              if (isLeftHalf) {
                // Position to the right for points in left half
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
                // Position to the left for points in right half
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
              // Show results box for mobile only
              showResultsBox(point, chart);
              
              // On mobile, manually trigger tooltip display alongside results box
              const tooltipEl = document.getElementById('chartjs-tooltip');
              if (tooltipEl) {
                const eloChange = point.eloChange || 0;
                
                // Build tooltip content with bold Elo rating and colored Elo change
                let eloChangeHtml = '';
                if (eloChange !== 0) {
                  const changeText = `${eloChange > 0 ? '+' : ''}${Math.round(eloChange)}`;
                  const changeColor = eloChange > 0 ? '#10B981' : '#EF4444';
                  eloChangeHtml = ` <span style="color: ${changeColor}; font-weight: bold;">${changeText}</span>`;
                }
                
                const dateFontSize = '6px';
                
                tooltipEl.innerHTML = `
                  <div style="font-weight: bold; margin-bottom: 2px; line-height: 1.3;">${point.tournament}</div>
                  <div style="margin-bottom: 6px; color: #ccc; font-size: ${dateFontSize};">${new Date(point.x).toLocaleDateString()}</div>
                  <div style="line-height: 1.3;">${chart?.data?.datasets?.[datasetIndex]?.label}: <strong>${Math.round(point.y)}</strong>${eloChangeHtml}</div>
                `;

                // Position tooltip near the clicked point
                const canvas = chart.canvas;
                const rect = canvas.getBoundingClientRect();
                
                // Get the actual click position relative to the canvas
                const clickX = (event.native as MouseEvent)?.offsetX || (event.x || 0);
                const clickY = (event.native as MouseEvent)?.offsetY || (event.y || 0);
                
                // Position tooltip based on data point position relative to chart center
                const chartCenterX = rect.width / 2;
                const isLeftHalf = clickX < chartCenterX;
                
                if (isLeftHalf) {
                  // Position to the right for points in left half
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(0%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX + 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                } else {
                  // Position to the left for points in right half
                  tooltipEl.style.opacity = '1';
                  tooltipEl.style.visibility = 'visible';
                  tooltipEl.style.transform = 'translate(-100%, -50%) scale(1)';
                  tooltipEl.style.left = rect.left + window.pageXOffset + clickX - 10 + 'px';
                  tooltipEl.style.top = rect.top + window.pageYOffset + clickY + 'px';
                }
              }
            } else {
              // On desktop, open the link directly
              window.open(point.duosmiumLink, '_blank');
            }
          }
        }
      }
    }
  };
};

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