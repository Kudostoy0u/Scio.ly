/**
 * Date utility functions for ELO data processing
 */

import type { EloData, EloMetadata } from "@/app/analytics/types/elo";

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
