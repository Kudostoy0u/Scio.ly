import type { EloData } from "@/app/analytics/types/elo";

export function getMostRecentSeason(eloData: EloData): string {
  const allSeasons: string[] = [];

  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode]?.[schoolName];
      if (!school) {
        continue;
      }
      for (const season of Object.keys(school.seasons)) {
        if (!allSeasons.includes(season)) {
          allSeasons.push(season);
        }
      }
    }
  }

  return allSeasons.sort().pop() || "2024";
}
