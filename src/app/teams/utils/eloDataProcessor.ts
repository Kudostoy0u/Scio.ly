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


const findSchool = (eloData: EloData, schoolNameWithState: string) => {

  const match = schoolNameWithState.match(/^(.+?)\s*\(([A-Z]{2})\)$/);
  if (!match) {

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

export const processOverallByTournament = (eloData: EloData, selectedSchools: string[], metadata?: any): OverallTournamentData => {
  const data: OverallTournamentData = {};
  
  selectedSchools.forEach(schoolNameWithState => {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = [];
      Object.entries(school.seasons).forEach(([season, seasonData]) => {
        const overallEvent = seasonData.events['__OVERALL__'];
        if (overallEvent && overallEvent.history) {
          overallEvent.history.forEach(entry => {

            data[schoolNameWithState].push({
              date: entry.d,
              tournament: metadata?.tournaments?.[entry.t] || `Tournament ${entry.t}`,
              place: entry.p,
              elo: entry.e,
              duosmiumLink: entry.l,
              season
            });
          });
        }
      });
      

      data[schoolNameWithState].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        

        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA.getTime() - dateB.getTime();
      });
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

export const processEventByTournament = (eloData: EloData, selectedSchools: string[], selectedEvents: string[], metadata?: any): EventTournamentData => {
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

              data[schoolNameWithState][event].push({
                date: entry.d,
                tournament: metadata?.tournaments?.[entry.t] || `Tournament ${entry.t}`,
                place: entry.p,
                elo: entry.e,
                duosmiumLink: entry.l,
                season
              });
            });
          }
        });
        

        data[schoolNameWithState][event].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          

          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          
          return dateA.getTime() - dateB.getTime();
        });
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
  viewMode: 'season' | 'tournament' = 'season',
  metadata?: any
): ChartData => {
  if (chartType === 'overall') {
    return viewMode === 'season' 
      ? processOverallBySeason(eloData, selectedSchools)
      : processOverallByTournament(eloData, selectedSchools, metadata);
  } else {
    return viewMode === 'season'
      ? processEventBySeason(eloData, selectedSchools, selectedEvents)
      : processEventByTournament(eloData, selectedSchools, selectedEvents, metadata);
  }
};


const findEloAtDate = (history: any[], targetDate: string): number | null => {
  if (!history || history.length === 0) return null;
  

  let left = 0;
  let right = history.length - 1;
  let bestMatch: any = null;
  
  const targetTime = new Date(targetDate).getTime();
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const entry = history[mid];
    const entryTime = new Date(entry.d).getTime();
    
    if (entryTime <= targetTime) {
      bestMatch = entry;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return bestMatch ? bestMatch.e : null;
};


export const getLeaderboard = (
  eloData: EloData,
  event?: string,
  season?: string,
  limit: number = 50,
  date?: string
): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];
      
      Object.entries(school.seasons).forEach(([seasonKey, seasonData]) => {
        if (season && seasonKey !== season) return;
        
        if (event) {

          const eventData = seasonData.events[event];
          if (eventData) {
            let eloRating = eventData.rating;
            

            if (date && eventData.history && eventData.history.length > 0) {

              const sortedHistory = [...eventData.history].sort((a, b) => {
                const dateA = new Date(a.d).getTime();
                const dateB = new Date(b.d).getTime();
                return dateA - dateB;
              });
              
              const historicalElo = findEloAtDate(sortedHistory, date);
              if (historicalElo !== null) {
                eloRating = historicalElo;
              } else {

                eloRating = 1500;
              }
            }
            
            entries.push({
              school: schoolName,
              state: stateCode,
              elo: eloRating,
              season: seasonKey,
              event: event
            });
          }
        } else {

          const overallEvent = seasonData.events['__OVERALL__'];
          if (overallEvent) {
            let eloRating = overallEvent.rating;
            

            if (date && overallEvent.history && overallEvent.history.length > 0) {

              const sortedHistory = [...overallEvent.history].sort((a, b) => {
                const dateA = new Date(a.d).getTime();
                const dateB = new Date(b.d).getTime();
                return dateA - dateB;
              });
              
              const historicalElo = findEloAtDate(sortedHistory, date);
              if (historicalElo !== null) {
                eloRating = historicalElo;
              } else {

                eloRating = 1500;
              }
            }
            
            entries.push({
              school: schoolName,
              state: stateCode,
              elo: eloRating,
              season: seasonKey
            });
          }
        }
      });
    }
  }
  

  return entries
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
};


export const calculateWinProbability = (elo1: number, elo2: number): number => {
  const eloDifference = elo1 - elo2;
  return 1 / (1 + Math.pow(10, -eloDifference / 400));
};


const TRIAL_EVENTS_2025 = [
  'Aerial Scramble',
  'Agricultural Science',
  'Botany',
  'Engineering CAD',
  'Hovercraft',
  'Protein Modeling'
];


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
  

  if (school1OverallFound && school2OverallFound) {
    const overallWinPercentage = calculateWinProbability(school1OverallElo, school2OverallElo) * 100;
    overallResult = {
      event: 'Overall',
      school1WinPercentage: overallWinPercentage,
      school1Elo: school1OverallElo,
      school2Elo: school2OverallElo
    };
  }
  

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
  

  events.forEach(eventName => {

    if (TRIAL_EVENTS_2025.includes(eventName)) {
      return;
    }
    
    let school1Elo = 0;
    let school2Elo = 0;
    let school1Found = false;
    let school2Found = false;
    

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
  

  eventResults.sort((a, b) => b.school1WinPercentage - a.school1WinPercentage);
  
  return { eventResults, overallResult };
};

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format (e.g., "May 24th, 2025")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Get all available tournament dates from the precalculated metadata
 * This is used for the timeline slider to show all tournaments efficiently
 * Groups tournaments by date to handle multiple tournaments on the same day
 */
export const getAllTournamentDates = (eloData: EloData, metadata?: any): Array<{ x: Date; y: number; tournament: string; link?: string }> => {

  if (metadata?.tournamentTimeline) {
    const allDataPoints: Array<{ x: Date; y: number; tournament: string; link?: string }> = [];
    

    Object.entries(metadata.tournamentTimeline).forEach(([_season, tournaments]) => {
      if (Array.isArray(tournaments)) {

        const tournamentsByDate = new Map<string, Array<{ tournament: string; link?: string }>>();
        
        tournaments.forEach((tournament: any) => {
          if (tournament.date && tournament.tournamentName) {
            if (!tournamentsByDate.has(tournament.date)) {
              tournamentsByDate.set(tournament.date, []);
            }
            tournamentsByDate.get(tournament.date)!.push({
              tournament: tournament.tournamentName,
              link: tournament.link
            });
          }
        });
        

        tournamentsByDate.forEach((tournaments, date) => {
          if (tournaments.length === 1) {

            allDataPoints.push({
              x: new Date(date),
              y: 0,
              tournament: tournaments[0].tournament,
              link: tournaments[0].link
            });
          } else {

            const tournamentNames = tournaments.map(t => t.tournament).join(', ');
            const firstLink = tournaments[0].link;
            
            allDataPoints.push({
              x: new Date(date),
              y: 0,
              tournament: tournamentNames,
              link: firstLink
            });
          }
        });
      }
    });
    

    return allDataPoints.sort((a, b) => a.x.getTime() - b.x.getTime());
  }
  

  return [];
};
