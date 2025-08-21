import type { 
  EloData, 
  ChartType, 
  ChartData, 
  OverallSeasonData, 
  OverallTournamentData, 
  EventSeasonData, 
  EventTournamentData,
  LeaderboardEntry,
  ComparisonResult
} from '../types/elo';

export const getAllSchools = (eloData: EloData): string[] => {
  const schools: string[] = [];
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      // Include state code to distinguish between schools with same name in different states
      schools.push(`${schoolName} (${stateCode})`);
    }
  }
  return schools.sort();
};

export const getAllEvents = (eloData: EloData): string[] => {
  const events = new Set<string>();
  
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];
      Object.values(school.seasons).forEach(season => {
        Object.keys(season.events).forEach(event => {
          if (event !== '__OVERALL__') {
            events.add(event);
          }
        });
      });
    }
  }
  
  return Array.from(events).sort();
};

// Helper function to find a school by name across all states
const findSchool = (eloData: EloData, schoolNameWithState: string) => {
  // Parse school name and state code from format "School Name (ST)"
  const match = schoolNameWithState.match(/^(.+?)\s*\(([A-Z]{2})\)$/);
  if (!match) {
    // Fallback: try to find by exact name across all states
    for (const stateCode in eloData) {
      if (eloData[stateCode][schoolNameWithState]) {
        return eloData[stateCode][schoolNameWithState];
      }
    }
    return null;
  }
  
  const [, schoolName, stateCode] = match;
  return eloData[stateCode]?.[schoolName] || null;
};

export const processOverallBySeason = (eloData: EloData, selectedSchools: string[]): OverallSeasonData => {
  const data: OverallSeasonData = {};
  
  selectedSchools.forEach(schoolNameWithState => {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = {};
      Object.entries(school.seasons).forEach(([season, seasonData]) => {
        const overallEvent = seasonData.events['__OVERALL__'];
        if (overallEvent) {
          data[schoolNameWithState][season] = overallEvent.rating;
        }
      });
    }
  });
  
  return data;
};

export const processOverallByTournament = (eloData: EloData, selectedSchools: string[]): OverallTournamentData => {
  const data: OverallTournamentData = {};
  
  selectedSchools.forEach(schoolNameWithState => {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = [];
      Object.entries(school.seasons).forEach(([season, seasonData]) => {
        const overallEvent = seasonData.events['__OVERALL__'];
        if (overallEvent && overallEvent.history) {
          overallEvent.history.forEach(entry => {
            // Add 1 day to the tournament date
            const originalDate = new Date(entry.date);
            const adjustedDate = new Date(originalDate.getTime() + 24 * 60 * 60 * 1000);
            
            data[schoolNameWithState].push({
              ...entry,
              date: adjustedDate.toISOString().split('T')[0],
              season
            });
          });
        }
      });
      
      // Sort by date
      data[schoolNameWithState].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  });
  
  return data;
};

export const processEventBySeason = (eloData: EloData, selectedSchools: string[], selectedEvents: string[]): EventSeasonData => {
  const data: EventSeasonData = {};
  
  selectedSchools.forEach(schoolNameWithState => {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = {};
      selectedEvents.forEach(event => {
        data[schoolNameWithState][event] = {};
        Object.entries(school.seasons).forEach(([season, seasonData]) => {
          const eventData = seasonData.events[event];
          if (eventData) {
            data[schoolNameWithState][event][season] = eventData.rating;
          }
        });
      });
    }
  });
  
  return data;
};

export const processEventByTournament = (eloData: EloData, selectedSchools: string[], selectedEvents: string[]): EventTournamentData => {
  const data: EventTournamentData = {};
  
  selectedSchools.forEach(schoolNameWithState => {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = {};
      selectedEvents.forEach(event => {
        data[schoolNameWithState][event] = [];
        Object.entries(school.seasons).forEach(([season, seasonData]) => {
          const eventData = seasonData.events[event];
          if (eventData && eventData.history) {
            eventData.history.forEach(entry => {
              // Add 1 day to the tournament date
              const originalDate = new Date(entry.date);
              const adjustedDate = new Date(originalDate.getTime() + 24 * 60 * 60 * 1000);
              
              data[schoolNameWithState][event].push({
                ...entry,
                date: adjustedDate.toISOString().split('T')[0],
                season
              });
            });
          }
        });
        
        // Sort by date
        data[schoolNameWithState][event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
    }
  });
  
  return data;
};

export const processChartData = (
  eloData: EloData,
  chartType: ChartType,
  selectedSchools: string[],
  selectedEvents: string[] = [],
  viewMode: 'season' | 'tournament' = 'season'
): ChartData => {
  if (chartType === 'overall') {
    return viewMode === 'season' 
      ? processOverallBySeason(eloData, selectedSchools)
      : processOverallByTournament(eloData, selectedSchools);
  } else {
    return viewMode === 'season'
      ? processEventBySeason(eloData, selectedSchools, selectedEvents)
      : processEventByTournament(eloData, selectedSchools, selectedEvents);
  }
};

// New function to get leaderboard data
export const getLeaderboard = (
  eloData: EloData,
  event?: string,
  season?: string,
  limit: number = 50
): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];
      
      Object.entries(school.seasons).forEach(([seasonKey, seasonData]) => {
        if (season && seasonKey !== season) return;
        
        if (event) {
          // Event-specific leaderboard
          const eventData = seasonData.events[event];
          if (eventData) {
            entries.push({
              school: schoolName,
              state: stateCode,
              elo: eventData.rating,
              season: seasonKey,
              event: event
            });
          }
        } else {
          // Overall leaderboard
          const overallEvent = seasonData.events['__OVERALL__'];
          if (overallEvent) {
            entries.push({
              school: schoolName,
              state: stateCode,
              elo: overallEvent.rating,
              season: seasonKey
            });
          }
        }
      });
    }
  }
  
  // Sort by Elo rating (highest first) and limit results
  return entries
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
};

// New function to calculate win probability between two schools
export const calculateWinProbability = (elo1: number, elo2: number): number => {
  const eloDifference = elo1 - elo2;
  return 1 / (1 + Math.pow(10, -eloDifference / 400));
};

// List of trial events to exclude from comparisons
const TRIAL_EVENTS_2025 = [
  'Aerial Scramble',
  'Agricultural Science',
  'Botany',
  'Engineering CAD',
  'Hovercraft',
  'Protein Modeling'
];

// New function to compare two schools
export const compareSchools = (
  eloData: EloData,
  school1: string,
  school2: string,
  season?: string
): { eventResults: ComparisonResult[]; overallResult: ComparisonResult | null } => {
  const eventResults: ComparisonResult[] = [];
  let overallResult: ComparisonResult | null = null;
  
  const school1Data = findSchool(eloData, school1);
  const school2Data = findSchool(eloData, school2);
  
  if (!school1Data || !school2Data) {
    return { eventResults, overallResult };
  }
  
  // Get overall Elo ratings for comparison
  let school1OverallElo = 0;
  let school2OverallElo = 0;
  let school1OverallFound = false;
  let school2OverallFound = false;
  
  Object.entries(school1Data.seasons).forEach(([seasonKey, seasonData]) => {
    if (season && seasonKey !== season) return;
    
    const overallEvent = seasonData.events['__OVERALL__'];
    if (overallEvent && overallEvent.rating > school1OverallElo) {
      school1OverallElo = overallEvent.rating;
      school1OverallFound = true;
    }
  });
  
  Object.entries(school2Data.seasons).forEach(([seasonKey, seasonData]) => {
    if (season && seasonKey !== season) return;
    
    const overallEvent = seasonData.events['__OVERALL__'];
    if (overallEvent && overallEvent.rating > school2OverallElo) {
      school2OverallElo = overallEvent.rating;
      school2OverallFound = true;
    }
  });
  
  // Calculate overall win probability
  if (school1OverallFound && school2OverallFound) {
    const overallWinPercentage = calculateWinProbability(school1OverallElo, school2OverallElo) * 100;
    overallResult = {
      event: 'Overall',
      school1WinPercentage: overallWinPercentage,
      school1Elo: school1OverallElo,
      school2Elo: school2OverallElo
    };
  }
  
  // Get all events that both schools have participated in
  const events = new Set<string>();
  
  Object.values(school1Data.seasons).forEach(seasonData => {
    Object.keys(seasonData.events).forEach(event => {
      if (event !== '__OVERALL__') {
        events.add(event);
      }
    });
  });
  
  Object.values(school2Data.seasons).forEach(seasonData => {
    Object.keys(seasonData.events).forEach(event => {
      if (event !== '__OVERALL__') {
        events.add(event);
      }
    });
  });
  
  // Calculate win probabilities for each event
  events.forEach(eventName => {
    // Skip trial events from 2025 season
    if (TRIAL_EVENTS_2025.includes(eventName)) {
      return;
    }
    
    let school1Elo = 0;
    let school2Elo = 0;
    let school1Found = false;
    let school2Found = false;
    
    // Find the most recent Elo ratings for both schools in this event
    Object.entries(school1Data.seasons).forEach(([seasonKey, seasonData]) => {
      if (season && seasonKey !== season) return;
      
      const eventData = seasonData.events[eventName];
      if (eventData && eventData.rating > school1Elo) {
        school1Elo = eventData.rating;
        school1Found = true;
      }
    });
    
    Object.entries(school2Data.seasons).forEach(([seasonKey, seasonData]) => {
      if (season && seasonKey !== season) return;
      
      const eventData = seasonData.events[eventName];
      if (eventData && eventData.rating > school2Elo) {
        school2Elo = eventData.rating;
        school2Found = true;
      }
    });
    
    if (school1Found && school2Found) {
      const winPercentage = calculateWinProbability(school1Elo, school2Elo) * 100;
      eventResults.push({
        event: eventName,
        school1WinPercentage: winPercentage,
        school1Elo,
        school2Elo
      });
    }
  });
  
  // Sort by win percentage (highest first)
  eventResults.sort((a, b) => b.school1WinPercentage - a.school1WinPercentage);
  
  return { eventResults, overallResult };
};

/**
 * Converts optimized JSON format back to the original format expected by the frontend
 * The optimized format uses metadata maps and shortened property names to reduce file size
 */
export function convertOptimizedData(optimizedData: any): EloData {
  if (!optimizedData.meta || !optimizedData.data) {
    // If it's already in the old format, return as-is
    return optimizedData as EloData;
  }

  const { meta, data } = optimizedData;
  const convertedData: EloData = {};

  // Convert each state
  for (const stateCode in data) {
    convertedData[stateCode] = {};
    
    // Convert each team
    for (const teamName in data[stateCode]) {
      const teamData = data[stateCode][teamName];
      convertedData[stateCode][teamName] = {
        seasons: {},
        meta: teamData.meta
      };

      // Convert each season
      for (const season in teamData.seasons) {
        convertedData[stateCode][teamName].seasons[season] = {
          events: {}
        };

        // Convert each event
        for (const eventName in teamData.seasons[season].events) {
          const eventData = teamData.seasons[season].events[eventName];
          convertedData[stateCode][teamName].seasons[season].events[eventName] = {
            rating: eventData.rating,
            history: eventData.history.map((entry: any) => ({
              date: entry.d,
              tournament: meta.tournaments[entry.t],
              place: entry.p,
              elo: entry.e,
              duosmiumLink: entry.l,
              ...(entry.n && { note: entry.n })
            }))
          };
        }
      }
    }
  }

  return convertedData;
}
