/**
 * Processors for leaderboard data
 */

import type { EloData, EloHistoryEntry, LeaderboardEntry } from "@/app/analytics/types/elo";

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

  if (!bestMatch) {
    return null;
  }

  // Validate that bestMatch.e is a valid number
  const eloValue = bestMatch.e;
  if (!Number.isFinite(eloValue)) {
    return null;
  }

  return eloValue;
};

function getEloRatingForEvent(
  eventData: { rating: number; history?: Array<{ d: string; r: number }> },
  date?: string
): number {
  // Validate eventData.rating is a valid number
  const defaultRating = Number.isFinite(eventData.rating) ? eventData.rating : 1500;

  if (!(date && eventData.history) || eventData.history.length === 0) {
    return defaultRating;
  }

  const sortedHistory = [...eventData.history].sort((a, b) => {
    const dateA = new Date(a.d).getTime();
    const dateB = new Date(b.d).getTime();
    return dateA - dateB;
  });

  const eloHistoryEntries: EloHistoryEntry[] = sortedHistory.map((entry) => ({
    d: entry.d,
    t: 0,
    p: 0,
    e: entry.r,
    l: "",
  }));

  const historicalElo = findEloAtDate(eloHistoryEntries, date);
  // Check for both null and NaN
  if (historicalElo !== null && Number.isFinite(historicalElo)) {
    return historicalElo;
  }
  return defaultRating;
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
