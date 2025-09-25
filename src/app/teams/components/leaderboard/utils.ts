import type { EloData } from '../../types/elo';
import { getLeaderboard } from '../../utils/eloDataProcessor';
import logger from '@/lib/utils/logger';

export function collectSeasons(eloData: EloData): string[] {
  const seasons = new Set<string>();
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];
      Object.keys(school.seasons).forEach((season) => seasons.add(season));
    }
  }
  return Array.from(seasons).sort();
}

export function collectStates(eloData: EloData): string[] {
  return Object.keys(eloData).sort();
}

export function eventsForSeason(
  eloData: EloData,
  selectedSeason: string,
  division: 'b' | 'c',
  whitelist: Record<string, Record<string, string[]>>
): string[] {
  const allowed = whitelist[selectedSeason]?.[division.toUpperCase() as 'B' | 'C'] || [];
  const events = new Set<string>();
  for (const stateCode in eloData) {
    for (const schoolName in eloData[stateCode]) {
      const school = eloData[stateCode][schoolName];
      const seasonData = school.seasons[selectedSeason];
      if (seasonData) {
        Object.keys(seasonData.events).forEach((event) => {
          if (event !== '__OVERALL__' && allowed.includes(event)) events.add(event);
        });
      }
    }
  }
  return Array.from(events).sort();
}

export type TournamentDate = { date: string; tournament: string; allTournaments: string[]; season: string };

export function buildTournamentDates(metadata: any, season: string): TournamentDate[] {
  try {
    if (!metadata?.tournamentTimeline?.[season]) return [];
    const tournaments = metadata.tournamentTimeline[season];
    const byDate = new Map<string, string[]>();
    tournaments.forEach((t: any) => {
      if (t.date && t.tournamentName) {
        if (!byDate.has(t.date)) byDate.set(t.date, []);
        byDate.get(t.date)!.push(t.tournamentName);
      }
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => ({
        date,
        tournament: list.length <= 2 ? list.join(', ') : `${list[0]}, ${list[1]} and ${list.length - 2} more`,
        allTournaments: list,
        season,
      }));
  } catch {
    logger.warn('No metadata available for tournament timeline');
    return [];
  }
}

export function computeRankingChanges(
  eloData: EloData,
  selectedEvent: string,
  selectedSeason: string,
  selectedState: string,
  selectedDate: string,
): Map<string, number> {
  const changes = new Map<string, number>();
  try {
    const currentYear = parseInt(selectedSeason);
    const previousYear = (currentYear - 1).toString();

    let current = getLeaderboard(eloData, selectedEvent || undefined, selectedSeason, 1000, selectedDate);
    let prev = getLeaderboard(eloData, selectedEvent || undefined, previousYear, 1000);
    if (selectedState) {
      current = current.filter((e) => e.state === selectedState).sort((a, b) => b.elo - a.elo);
      prev = prev.filter((e) => e.state === selectedState).sort((a, b) => b.elo - a.elo);
    }
    const currentRankMap = new Map<string, number>();
    const previousRankMap = new Map<string, number>();
    current.forEach((entry, idx) => currentRankMap.set(`${entry.school}-${entry.state}`, idx + 1));
    prev.forEach((entry, idx) => previousRankMap.set(`${entry.school}-${entry.state}`, idx + 1));
    current.forEach((entry) => {
      const key = `${entry.school}-${entry.state}`;
      const currentRank = currentRankMap.get(key) || 0;
      const previousRank = previousRankMap.get(key) || 0;
      changes.set(key, currentRank > 0 && previousRank > 0 ? previousRank - currentRank : 0);
    });
  } catch (error) {
    logger.error('Error calculating ranking changes:', error);
  }
  return changes;
}

export function formatRankingChange(darkMode: boolean, change: number): { text: string; colorClass: string } {
  if (change > 0) return { text: `+${change}`, colorClass: darkMode ? 'text-green-400' : 'text-green-600' };
  if (change < 0) return { text: `${change}`, colorClass: darkMode ? 'text-red-400' : 'text-red-600' };
  return { text: '-', colorClass: darkMode ? 'text-gray-400' : 'text-gray-500' };
}

export function rankColor(darkMode: boolean, rank: number): string {
  if (rank === 1) return darkMode ? 'bg-yellow-900/30 text-yellow-200' : 'bg-yellow-100 text-yellow-800';
  if (rank === 2) return darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800';
  if (rank === 3) return darkMode ? 'bg-orange-900/30 text-orange-200' : 'bg-orange-100 text-orange-800';
  return darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


