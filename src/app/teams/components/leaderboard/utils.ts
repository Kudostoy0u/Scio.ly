import type { EloData } from "@/app/analytics/types/elo";
import { getLeaderboard } from "@/app/analytics/utils/eloDataProcessor";
import logger from "@/lib/utils/logger";

/**
 * Collect all available seasons from ELO data
 * Extracts unique season identifiers from the ELO data structure
 *
 * @param {EloData} eloData - ELO rating data structure
 * @returns {string[]} Array of unique season identifiers, sorted alphabetically
 * @example
 * ```typescript
 * const seasons = collectSeasons(eloData);
 * console.log(seasons); // ['2023-2024', '2024-2025']
 * ```
 */
export function collectSeasons(eloData: EloData): string[] {
	const seasons = new Set<string>();
	for (const stateCode in eloData) {
		for (const schoolName in eloData[stateCode]) {
			const school = eloData[stateCode][schoolName];
			if (school) {
				for (const season of Object.keys(school.seasons)) {
					seasons.add(season);
				}
			}
		}
	}
	return Array.from(seasons).sort();
}

/**
 * Collect all available states from ELO data
 * Extracts unique state codes from the ELO data structure
 *
 * @param {EloData} eloData - ELO rating data structure
 * @returns {string[]} Array of unique state codes, sorted alphabetically
 * @example
 * ```typescript
 * const states = collectStates(eloData);
 * console.log(states); // ['CA', 'IL', 'NY', 'TX']
 * ```
 */
export function collectStates(eloData: EloData): string[] {
	return Object.keys(eloData).sort();
}

/**
 * Get available events for a specific season and division
 * Filters events based on the whitelist and available data
 *
 * @param {EloData} eloData - ELO rating data structure
 * @param {string} selectedSeason - The season to filter by
 * @param {'b' | 'c'} division - Division to filter by (B or C)
 * @param {Record<string, Record<string, string[]>>} whitelist - Allowed events by season and division
 * @returns {string[]} Array of available event names, sorted alphabetically
 * @example
 * ```typescript
 * const events = eventsForSeason(eloData, '2023-2024', 'c', whitelist);
 * console.log(events); // ['Anatomy & Physiology', 'Codebusters', 'Forensics']
 * ```
 */
export function eventsForSeason(
	eloData: EloData,
	selectedSeason: string,
	division: "b" | "c",
	whitelist: Record<string, Record<string, string[]>>,
): string[] {
	const allowed =
		whitelist[selectedSeason]?.[division.toUpperCase() as "B" | "C"] || [];
	const events = new Set<string>();
	for (const stateCode in eloData) {
		for (const schoolName in eloData[stateCode]) {
			const school = eloData[stateCode][schoolName];
			if (school) {
				const seasonData = school.seasons[selectedSeason];
				if (seasonData) {
					for (const event of Object.keys(seasonData.events)) {
						if (event !== "__OVERALL__" && allowed.includes(event)) {
							events.add(event);
						}
					}
				}
			}
		}
	}
	return Array.from(events).sort();
}

/**
 * Tournament date information interface
 * Contains tournament date and metadata
 */
export type TournamentDate = {
	/** Tournament date string */
	date: string;
	/** Tournament name */
	tournament: string;
	/** All available tournaments */
	allTournaments: string[];
	/** Season identifier */
	season: string;
};

/**
 * Build tournament dates from metadata for a specific season
 * Processes tournament timeline metadata to create date information
 *
 * @param {any} metadata - Tournament metadata object
 * @param {string} season - Season identifier
 * @returns {TournamentDate[]} Array of tournament date information
 * @example
 * ```typescript
 * const dates = buildTournamentDates(metadata, '2023-2024');
 * console.log(dates[0].tournament); // Tournament name
 * ```
 */
export function buildTournamentDates(
	metadata: Record<string, unknown>,
	season: string,
): TournamentDate[] {
	try {
		const tournamentTimeline = metadata?.tournamentTimeline as
			| Record<string, unknown>
			| undefined;
		if (!tournamentTimeline?.[season]) {
			return [];
		}
		const tournaments = tournamentTimeline[season] as Record<string, unknown>[];
		const byDate = new Map<string, string[]>();
		for (const t of tournaments) {
			const date = t.date as string | undefined;
			const tournamentName = t.tournamentName as string | undefined;
			if (date && tournamentName) {
				if (!byDate.has(date)) {
					byDate.set(date, []);
				}
				byDate.get(date)?.push(tournamentName);
			}
		}
		return Array.from(byDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, list]) => ({
				date,
				tournament:
					list.length <= 2
						? list.join(", ")
						: `${list[0]}, ${list[1]} and ${list.length - 2} more`,
				allTournaments: list,
				season,
			}));
	} catch {
		logger.warn("No metadata available for tournament timeline");
		return [];
	}
}

export function computeRankingChanges(
	eloData: EloData,
	selectedEvent: string,
	selectedSeason: string,
	selectedState: string,
	selectedDate: string,
	fallbackToPreviousSeason: boolean,
): Map<string, number> {
	const changes = new Map<string, number>();
	try {
		const currentYear = Number.parseInt(selectedSeason);
		const previousYear = (currentYear - 1).toString();

		let current = getLeaderboard(
			eloData,
			selectedEvent || undefined,
			selectedSeason,
			1000,
			selectedDate,
			fallbackToPreviousSeason,
		);
		let prev = getLeaderboard(
			eloData,
			selectedEvent || undefined,
			previousYear,
			1000,
			undefined,
			fallbackToPreviousSeason,
		);
		if (selectedState) {
			current = current
				.filter((e) => e.state === selectedState)
				.sort((a, b) => b.elo - a.elo);
			prev = prev
				.filter((e) => e.state === selectedState)
				.sort((a, b) => b.elo - a.elo);
		}
		const currentRankMap = new Map<string, number>();
		const previousRankMap = new Map<string, number>();
		for (const [idx, entry] of current.entries()) {
			currentRankMap.set(`${entry.school}-${entry.state}`, idx + 1);
		}
		for (const [idx, entry] of prev.entries()) {
			previousRankMap.set(`${entry.school}-${entry.state}`, idx + 1);
		}
		for (const entry of current) {
			const key = `${entry.school}-${entry.state}`;
			const currentRank = currentRankMap.get(key) || 0;
			const previousRank = previousRankMap.get(key) || 0;
			changes.set(
				key,
				currentRank > 0 && previousRank > 0 ? previousRank - currentRank : 0,
			);
		}
	} catch (error) {
		logger.error("Error calculating ranking changes:", error);
	}
	return changes;
}

export function formatRankingChange(
	darkMode: boolean,
	change: number,
): { text: string; colorClass: string } {
	if (change > 0) {
		return {
			text: `+${change}`,
			colorClass: darkMode ? "text-green-400" : "text-green-600",
		};
	}
	if (change < 0) {
		return {
			text: `${change}`,
			colorClass: darkMode ? "text-red-400" : "text-red-600",
		};
	}
	return {
		text: "-",
		colorClass: darkMode ? "text-gray-400" : "text-gray-500",
	};
}

export function rankColor(darkMode: boolean, rank: number): string {
	if (rank === 1) {
		return darkMode
			? "bg-yellow-900/30 text-yellow-200"
			: "bg-yellow-100 text-yellow-800";
	}
	if (rank === 2) {
		return darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800";
	}
	if (rank === 3) {
		return darkMode
			? "bg-orange-900/30 text-orange-200"
			: "bg-orange-100 text-orange-800";
	}
	return darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-600";
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
