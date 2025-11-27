/**
 * Processors for individual event ELO data
 */

import type {
  EloData,
  EloMetadata,
  EloSeason,
  EventSeasonData,
  EventTournamentData,
} from "@/app/analytics/types/elo";
import { findSchool } from "../utils/schoolHelpers";

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
