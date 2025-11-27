/**
 * Processors for overall (all events combined) ELO data
 */

import type {
  EloData,
  EloMetadata,
  EloSeason,
  OverallSeasonData,
  OverallTournamentData,
} from "@/app/analytics/types/elo";
import { findSchool } from "../utils/schoolHelpers";

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

