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
  eventData: { rating: number; history?: EloHistoryEntry[] },
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

  const historicalElo = findEloAtDate(sortedHistory, date);
  // Check for both null and NaN
  if (historicalElo !== null && Number.isFinite(historicalElo)) {
    return historicalElo;
  }
  // If no history entry exists before the target date, fall back to baseline 1500
  // instead of the current rating, as the rating represents the current state
  return 1500;
}

function processSchoolForLeaderboard(
  schoolName: string,
  stateCode: string,
  school: {
    seasons: Record<
      string,
      { events: Record<string, { rating: number; history?: EloHistoryEntry[] }> }
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
  date?: string,
  fallbackToPreviousSeason = false
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
              events: Record<string, { rating: number; history?: EloHistoryEntry[] }>;
            }
          >;
        },
        event,
        season,
        date
      );

      if (schoolEntries.length > 0) {
        entries.push(...schoolEntries);
      } else if (fallbackToPreviousSeason && season) {
        const currentSeasonInt = Number.parseInt(season, 10);
        const previousSeason = (currentSeasonInt - 1).toString();

        const previousSeasonEntries = processSchoolForLeaderboard(
          schoolName,
          stateCode,
          school as unknown as {
            seasons: Record<
              string,
              {
                events: Record<string, { rating: number; history?: EloHistoryEntry[] }>;
              }
            >;
          },
          event,
          previousSeason, // Try previous season
          undefined // No specific date for previous season fallback
        );

        for (const entry of previousSeasonEntries) {
          entries.push({
            ...entry,
            isHistorical: true,
            season: `${previousSeason} (historical)`,
          });
        }
      }
    }
  }

  return entries.sort((a, b) => b.elo - a.elo).slice(0, limit);
};
