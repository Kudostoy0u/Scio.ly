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
    }>;
  };
  options: any; // Use any to avoid complex Chart.js type issues
}

export const getOverallSeasonConfig = (data: ChartData, darkMode: boolean = false): ChartConfig => {
  const schools = Object.keys(data);
  const seasons = [...new Set(Object.values(data).flatMap(school => Object.keys(school as Record<string, number>)))].sort();
  
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

export const getOverallTournamentConfig = (data: ChartData, darkMode: boolean = false): ChartConfig => {
  const schools = Object.keys(data);
  
  return {
    type: 'line',
    data: {
      datasets: schools.map((school, index) => {
        const schoolData = data[school] as Array<{ date: string; tournament: string; elo: number; duosmiumLink: string }>;
        return {
          label: school,
          data: schoolData.map(point => ({
            x: new Date(point.date),
            y: point.elo,
            tournament: point.tournament,
            duosmiumLink: point.duosmiumLink
          })),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Overall Elo Rating by Tournament (Click data points to view results)',
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
          callbacks: {
            title: function(context: Array<{ raw: { tournament: string; x: Date } }>) {
              const point = context[0].raw;
              return [
                point.tournament,
                `Date: ${new Date(point.x).toLocaleDateString()}`
              ];
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
            window.open(point.duosmiumLink, '_blank');
          }
        }
      }
    }
  };
};

export const getEventSeasonConfig = (data: ChartData, darkMode: boolean = false): ChartConfig => {
  const schools = Object.keys(data);
  const events = Object.keys(data[schools[0]] || {});
  const seasons = [...new Set(
    events.flatMap(event => 
      Object.keys((data[schools[0]] as Record<string, Record<string, number>>)[event] || {})
    )
  )].sort();
  
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

export const getEventTournamentConfig = (data: ChartData, darkMode: boolean = false): ChartConfig => {
  const schools = Object.keys(data);
  const events = Object.keys(data[schools[0]] || {});
  
  return {
    type: 'line',
    data: {
      datasets: schools.flatMap((school, schoolIndex) => 
        events.map((event, eventIndex) => {
          const eventData = (data[school] as Record<string, Array<{ date: string; tournament: string; elo: number; duosmiumLink: string }>>)[event];
          return {
            label: `${school} - ${event}`,
            data: eventData.map(point => ({
              x: new Date(point.date),
              y: point.elo,
              tournament: point.tournament,
              duosmiumLink: point.duosmiumLink
            })),
            borderColor: colors[(schoolIndex * events.length + eventIndex) % colors.length],
            backgroundColor: colors[(schoolIndex * events.length + eventIndex) % colors.length] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.1
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
          text: 'Event Elo Rating by Tournament (Click data points to view results)',
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
          callbacks: {
            title: function(context: Array<{ raw: { tournament: string; x: Date } }>) {
              const point = context[0].raw;
              return [
                point.tournament,
                `Date: ${new Date(point.x).toLocaleDateString()}`
              ];
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
            window.open(point.duosmiumLink, '_blank');
          }
        }
      }
    }
  };
};

export const getChartConfig = (data: ChartData, chartType: ChartType, viewMode: 'season' | 'tournament' = 'season', darkMode: boolean = false): ChartConfig => {
  if (chartType === 'overall') {
    return viewMode === 'season' 
      ? getOverallSeasonConfig(data, darkMode)
      : getOverallTournamentConfig(data, darkMode);
  } else {
    return viewMode === 'season'
      ? getEventSeasonConfig(data, darkMode)
      : getEventTournamentConfig(data, darkMode);
  }
};
