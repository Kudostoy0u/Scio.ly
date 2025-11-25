const SCHOOL_NAME_WITH_STATE_REGEX = /^(.+?)\s*\(([A-Z]{2})\)$/;

import type {
  ChartData,
  ChartType,
  ComparisonResult,
  EloData,
  EloHistoryEntry,
  EloMetadata,
  EloSeason,
  EventSeasonData,
  EventTournamentData,
  LeaderboardEntry,
  OverallSeasonData,
  OverallTournamentData,
} from "@/app/analytics/types/elo";

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
    const stateData = eloData[stateCode];
    if (!stateData) {
      continue;
    }
    for (const schoolName in stateData) {
      const school = stateData[schoolName];
      if (!school) {
        continue;
      }
      for (const season of Object.values(school.seasons)) {
        for (const event of Object.keys(season.events)) {
          if (event !== "__OVERALL__") {
            events.add(event);
          }
        }
      }
    }
  }

  return Array.from(events).sort();
};

const findSchool = (eloData: EloData, schoolNameWithState: string) => {
  const match = SCHOOL_NAME_WITH_STATE_REGEX.exec(schoolNameWithState);
  if (!match) {
    for (const stateCode in eloData) {
      const stateData = eloData[stateCode];
      if (stateData?.[schoolNameWithState]) {
        return stateData[schoolNameWithState];
      }
    }
    return null;
  }

  const [, schoolName, stateCode] = match;
  if (!(stateCode && schoolName)) {
    return null;
  }
  return eloData[stateCode]?.[schoolName] || null;
};

export const processOverallBySeason = (
  eloData: EloData,
  selectedSchools: string[]
): OverallSeasonData => {
  const data: OverallSeasonData = {};

  for (const schoolNameWithState of selectedSchools) {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = {};
      for (const [season, seasonData] of Object.entries(school.seasons)) {
        const seasonTyped = seasonData as EloSeason;
        const overallEvent = seasonTyped.events.__OVERALL__;
        if (overallEvent) {
          const schoolData = data[schoolNameWithState];
          if (schoolData) {
            schoolData[season] = overallEvent.rating;
          }
        }
      }
    }
  }

  return data;
};

export const processOverallByTournament = (
  eloData: EloData,
  selectedSchools: string[],
  metadata?: EloMetadata
): OverallTournamentData => {
  const data: OverallTournamentData = {};

  for (const schoolNameWithState of selectedSchools) {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = [];
      for (const [season, seasonData] of Object.entries(school.seasons)) {
        const seasonTyped = seasonData as EloSeason;
        const overallEvent = seasonTyped.events.__OVERALL__;
        if (overallEvent?.history) {
          for (const entry of overallEvent.history) {
            const tournamentName = metadata?.tournaments?.[String(entry.t)];
            data[schoolNameWithState]?.push({
              date: entry.d,
              tournament: tournamentName || `Tournament ${entry.t}`,
              place: entry.p,
              elo: entry.e,
              duosmiumLink: entry.l,
              season,
            });
          }
        }
      }

      data[schoolNameWithState].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (Number.isNaN(dateA.getTime()) && Number.isNaN(dateB.getTime())) {
          return 0;
        }
        if (Number.isNaN(dateA.getTime())) {
          return 1;
        }
        if (Number.isNaN(dateB.getTime())) {
          return -1;
        }

        return dateA.getTime() - dateB.getTime();
      });
    }
  }

  return data;
};

export const processEventBySeason = (
  eloData: EloData,
  selectedSchools: string[],
  selectedEvents: string[]
): EventSeasonData => {
  const data: EventSeasonData = {};

  for (const schoolNameWithState of selectedSchools) {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = {};
      for (const event of selectedEvents) {
        const schoolData = data[schoolNameWithState];
        if (schoolData) {
          schoolData[event] = {};
        }
        for (const [season, seasonData] of Object.entries(school.seasons)) {
          const seasonTyped = seasonData as EloSeason;
          const eventData = seasonTyped.events[event];
          const schoolDataInner = data[schoolNameWithState];
          if (eventData && schoolDataInner && schoolDataInner[event]) {
            const eventDataInner = schoolDataInner[event];
            if (eventDataInner) {
              eventDataInner[season] = eventData.rating;
            }
          }
        }
      }
    }
  }

  return data;
};

function processEventHistory(
  eventData: { history: Array<{ d: string; t: number; p: number; e: number; l?: string }> },
  season: string,
  metadata?: EloMetadata
): Array<{
  date: string;
  tournament: string;
  place: number;
  elo: number;
  duosmiumLink: string;
  season?: string;
}> {
  const entries: Array<{
    date: string;
    tournament: string;
    place: number;
    elo: number;
    duosmiumLink: string;
    season?: string;
  }> = [];

  for (const entry of eventData.history) {
    const tournamentName = metadata?.tournaments?.[String(entry.t)];
    entries.push({
      date: entry.d,
      tournament: tournamentName || `Tournament ${entry.t}`,
      place: entry.p,
      elo: entry.e,
      duosmiumLink: entry.l || "",
      season,
    });
  }

  return entries;
}

function processSchoolEvents(
  school: { seasons: Record<string, EloSeason> },
  selectedEvents: string[],
  metadata?: EloMetadata
): Record<
  string,
  Array<{
    date: string;
    tournament: string;
    place: number;
    elo: number;
    duosmiumLink: string;
    season?: string;
  }>
> {
  const schoolData: Record<
    string,
    Array<{
      date: string;
      tournament: string;
      place: number;
      elo: number;
      duosmiumLink: string;
      season?: string;
    }>
  > = {};

  for (const event of selectedEvents) {
    schoolData[event] = [];

    for (const [season, seasonData] of Object.entries(school.seasons)) {
      const eventData = seasonData.events[event];
      if (eventData?.history) {
        const entries = processEventHistory(eventData, season, metadata);
        const eventDataArray = schoolData[event];
        if (eventDataArray) {
          for (const entry of entries) {
            eventDataArray.push({
              date: entry.date,
              tournament: entry.tournament,
              place: entry.place,
              elo: entry.elo,
              duosmiumLink: entry.duosmiumLink,
              season: entry.season ?? undefined,
            });
          }
        }
      }
    }

    const eventDataArray = schoolData[event];
    if (eventDataArray) {
      eventDataArray.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (Number.isNaN(dateA.getTime()) && Number.isNaN(dateB.getTime())) {
          return 0;
        }
        if (Number.isNaN(dateA.getTime())) {
          return 1;
        }
        if (Number.isNaN(dateB.getTime())) {
          return -1;
        }
        return dateA.getTime() - dateB.getTime();
      });
    }
  }

  // Convert to match EventTournamentData type
  const result: Record<
    string,
    Array<{
      date: string;
      tournament: string;
      place: number;
      elo: number;
      duosmiumLink: string;
      season?: string;
    }>
  > = {};
  for (const [event, data] of Object.entries(schoolData)) {
    result[event] = data.map((entry) => ({
      date: entry.date,
      tournament: entry.tournament,
      place: entry.place,
      elo: entry.elo,
      duosmiumLink: entry.duosmiumLink || "",
      season: entry.season,
    }));
  }
  return result;
}

export const processEventByTournament = (
  eloData: EloData,
  selectedSchools: string[],
  selectedEvents: string[],
  metadata?: EloMetadata
): EventTournamentData => {
  const data: EventTournamentData = {};

  for (const schoolNameWithState of selectedSchools) {
    const school = findSchool(eloData, schoolNameWithState);
    if (school) {
      data[schoolNameWithState] = processSchoolEvents(school, selectedEvents, metadata);
    }
  }

  return data;
};

export const processChartData = (
  eloData: EloData,
  chartType: ChartType,
  selectedSchools: string[],
  selectedEvents: string[] = [],
  viewMode: "season" | "tournament" = "season",
  metadata?: EloMetadata
): ChartData => {
  if (chartType === "overall") {
    return viewMode === "season"
      ? processOverallBySeason(eloData, selectedSchools)
      : processOverallByTournament(eloData, selectedSchools, metadata);
  }
  return viewMode === "season"
    ? processEventBySeason(eloData, selectedSchools, selectedEvents)
    : processEventByTournament(eloData, selectedSchools, selectedEvents, metadata);
};

const findEloAtDate = (history: EloHistoryEntry[], targetDate: string): number | null => {
  if (!history || history.length === 0) {
    return null;
  }

  let left = 0;
  let right = history.length - 1;
  let bestMatch: EloHistoryEntry | null = null;

  const targetTime = new Date(targetDate).getTime();

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const entry = history[mid];
    if (!entry) {
      break;
    }
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

function getEloRatingForEvent(
  eventData: { rating: number; history?: Array<{ d: string; r: number }> },
  date?: string
): number {
  if (!(date && eventData.history) || eventData.history.length === 0) {
    return eventData.rating;
  }

  const sortedHistory = [...eventData.history].sort((a, b) => {
    const dateA = new Date(a.d).getTime();
    const dateB = new Date(b.d).getTime();
    return dateA - dateB;
  });

  // Convert to EloHistoryEntry format for findEloAtDate
  const eloHistoryEntries: EloHistoryEntry[] = sortedHistory.map((entry) => ({
    d: entry.d,
    t: 0, // tournament id not available in this format
    p: 0, // place not available in this format
    e: entry.r, // rating
    l: "", // duosmiumlink not available
  }));

  const historicalElo = findEloAtDate(eloHistoryEntries, date);
  return historicalElo !== null ? historicalElo : 1500;
}

function processSchoolForLeaderboard(
  schoolName: string,
  stateCode: string,
  school: {
    seasons: Record<
      string,
      { events: Record<string, { rating: number; history?: Array<{ d: string; r: number }> }> }
    >;
  },
  event: string | undefined,
  season: string | undefined,
  date: string | undefined
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  for (const [seasonKey, seasonData] of Object.entries(school.seasons)) {
    if (season && seasonKey !== season) {
      continue;
    }

    if (event) {
      const eventData = seasonData.events[event];
      if (eventData) {
        const eloRating = getEloRatingForEvent(eventData, date);
        entries.push({
          school: schoolName,
          state: stateCode,
          elo: eloRating,
          season: seasonKey,
          event: event,
        });
      }
    } else {
      const overallEvent = seasonData.events.__OVERALL__;
      if (overallEvent) {
        const eloRating = getEloRatingForEvent(overallEvent, date);
        entries.push({
          school: schoolName,
          state: stateCode,
          elo: eloRating,
          season: seasonKey,
        });
      }
    }
  }

  return entries;
}

export const getLeaderboard = (
  eloData: EloData,
  event?: string,
  season?: string,
  limit = 50,
  date?: string
): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];

  for (const stateCode in eloData) {
    const stateData = eloData[stateCode];
    if (!stateData) {
      continue;
    }
    for (const schoolName in stateData) {
      const school = stateData[schoolName];
      if (!school) {
        continue;
      }

      const schoolEntries = processSchoolForLeaderboard(
        schoolName,
        stateCode,
        school as unknown as {
          seasons: Record<
            string,
            {
              events: Record<string, { rating: number; history?: Array<{ d: string; r: number }> }>;
            }
          >;
        },
        event,
        season,
        date
      );
      entries.push(...schoolEntries);
    }
  }

  return entries.sort((a, b) => b.elo - a.elo).slice(0, limit);
};

export const calculateWinProbability = (elo1: number, elo2: number): number => {
  const eloDifference = elo1 - elo2;
  return 1 / (1 + 10 ** (-eloDifference / 400));
};

const TRIAL_EVENTS_2025 = [
  "Aerial Scramble",
  "Agricultural Science",
  "Botany",
  "Engineering CAD",
  "Hovercraft",
  "Protein Modeling",
];

function getMaxOverallElo(
  schoolData: { seasons: Record<string, EloSeason> },
  season?: string
): number | null {
  let maxElo = 0;
  let found = false;

  for (const [seasonKey, seasonData] of Object.entries(schoolData.seasons)) {
    if (season && seasonKey !== season) {
      continue;
    }

    const overallEvent = seasonData.events.__OVERALL__;
    if (overallEvent && overallEvent.rating > maxElo) {
      maxElo = overallEvent.rating;
      found = true;
    }
  }

  return found ? maxElo : null;
}

function getAllEventsForComparison(
  school1Data: { seasons: Record<string, EloSeason> },
  school2Data: { seasons: Record<string, EloSeason> }
): Set<string> {
  const events = new Set<string>();

  for (const seasonData of Object.values(school1Data.seasons)) {
    for (const event of Object.keys(seasonData.events)) {
      if (event !== "__OVERALL__") {
        events.add(event);
      }
    }
  }

  for (const seasonData of Object.values(school2Data.seasons)) {
    for (const event of Object.keys(seasonData.events)) {
      if (event !== "__OVERALL__") {
        events.add(event);
      }
    }
  }

  return events;
}

function getMaxEventElo(
  schoolData: { seasons: Record<string, EloSeason> },
  eventName: string,
  season?: string
): number | null {
  let maxElo = 0;
  let found = false;

  for (const [seasonKey, seasonData] of Object.entries(schoolData.seasons)) {
    if (season && seasonKey !== season) {
      continue;
    }

    const eventData = seasonData.events[eventName];
    if (eventData && eventData.rating > maxElo) {
      maxElo = eventData.rating;
      found = true;
    }
  }

  return found ? maxElo : null;
}

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

  if (!(school1Data && school2Data)) {
    return { eventResults, overallResult };
  }

  const school1OverallElo = getMaxOverallElo(school1Data, season);
  const school2OverallElo = getMaxOverallElo(school2Data, season);

  if (school1OverallElo !== null && school2OverallElo !== null) {
    const overallWinPercentage =
      calculateWinProbability(school1OverallElo, school2OverallElo) * 100;
    overallResult = {
      event: "Overall",
      school1WinPercentage: overallWinPercentage,
      school1Elo: school1OverallElo,
      school2Elo: school2OverallElo,
    };
  }

  const events = getAllEventsForComparison(school1Data, school2Data);

  for (const eventName of events) {
    if (TRIAL_EVENTS_2025.includes(eventName)) {
      continue;
    }

    const school1Elo = getMaxEventElo(school1Data, eventName, season);
    const school2Elo = getMaxEventElo(school2Data, eventName, season);

    if (school1Elo !== null && school2Elo !== null) {
      const winPercentage = calculateWinProbability(school1Elo, school2Elo) * 100;
      eventResults.push({
        event: eventName,
        school1WinPercentage: winPercentage,
        school1Elo,
        school2Elo,
      });
    }
  }

  eventResults.sort((a, b) => b.school1WinPercentage - a.school1WinPercentage);

  return { eventResults, overallResult };
};

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format (e.g., "May 24th, 2025")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

/**
 * Get all available tournament dates from the precalculated metadata
 * This is used for the timeline slider to show all tournaments efficiently
 * Groups tournaments by date to handle multiple tournaments on the same day
 */
export const getAllTournamentDates = (
  _eloData: EloData,
  metadata?: EloMetadata
): Array<{ x: Date; y: number; tournament: string; link?: string }> => {
  if (!metadata?.tournamentTimeline) {
    return [];
  }

  const allDataPoints: Array<{ x: Date; y: number; tournament: string; link?: string }> = [];

  for (const tournaments of Object.values(metadata.tournamentTimeline)) {
    if (!tournaments) {
      continue;
    }

    const tournamentsByDate = new Map<string, Array<{ tournament: string; link?: string }>>();

    for (const tournament of tournaments) {
      if (!tournamentsByDate.has(tournament.date)) {
        tournamentsByDate.set(tournament.date, []);
      }
      tournamentsByDate.get(tournament.date)?.push({
        tournament: tournament.tournamentName,
        link: tournament.link,
      });
    }

    for (const [date, tournamentsArray] of tournamentsByDate) {
      if (tournamentsArray.length === 0) {
        continue;
      }

      const [firstTournament] = tournamentsArray;
      if (!firstTournament) {
        continue;
      }

      const tournamentNames = tournamentsArray.map((t) => t.tournament).join(", ");
      const tournamentLabel =
        tournamentsArray.length === 1 ? firstTournament.tournament : tournamentNames;

      allDataPoints.push({
        x: new Date(date),
        y: 0,
        tournament: tournamentLabel,
        link: firstTournament.link,
      });
    }
  }

  return allDataPoints.sort((a, b) => a.x.getTime() - b.x.getTime());
};
