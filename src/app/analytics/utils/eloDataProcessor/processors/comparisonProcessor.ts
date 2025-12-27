/**
 * Processors for comparing schools
 */

import type {
	ComparisonResult,
	EloData,
	EloSeason,
} from "@/app/analytics/types/elo";
import { findSchool } from "../utils/schoolHelpers";

// 2026 Division B Events
// Single source of truth for 2026 Division B events
export const DIVISION_B_EVENTS_2026 = [
	"Anatomy and Physiology",
	"Disease Detectives",
	"Entomology",
	"Heredity",
	"Water Quality",
	"Dynamic Planet",
	"Meteorology",
	"Remote Sensing",
	"Rocks and Minerals",
	"Solar System",
	"Circuit Lab",
	"Crime Busters",
	"Hovercraft",
	"Machines",
	"Potions and Poisons",
	"Boomilever",
	"Helicopter",
	"Mission Possible",
	"Scrambler",
	"Codebusters",
	"Experimental Design",
	"Metric Mastery",
	"Write It Do It",
];

// 2026 Division C Events
// Single source of truth for 2026 Division C events
export const DIVISION_C_EVENTS_2026 = [
	"Anatomy and Physiology",
	"Designer Genes",
	"Disease Detectives",
	"Entomology",
	"Water Quality",
	"Astronomy",
	"Dynamic Planet",
	"Remote Sensing",
	"Rocks and Minerals",
	"Chemistry Lab",
	"Circuit Lab",
	"Forensics",
	"Hovercraft",
	"Machines",
	"Materials Science",
	"Boomilever",
	"Electric Vehicle",
	"Helicopter",
	"Robot Tour",
	"Bungee Drop",
	"Codebusters",
	"Engineering CAD",
	"Experimental Design",
];

const ELO_PROBABILITY_DIVISOR = 180;

export const calculateWinProbability = (elo1: number, elo2: number): number => {
	const eloDifference = elo1 - elo2;
	// Use a tighter divisor to reflect more decisive gaps in our Elo scale.
	return 1 / (1 + 10 ** (-eloDifference / ELO_PROBABILITY_DIVISOR));
};

function getMaxOverallElo(
	schoolData: { seasons: Record<string, EloSeason> },
	season?: string,
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
	school2Data: { seasons: Record<string, EloSeason> },
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
	season?: string,
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
	season?: string,
	division?: "b" | "c",
): {
	eventResults: ComparisonResult[];
	overallResult: ComparisonResult | null;
} => {
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

	// Get the allowed events list based on division
	const allowedEvents =
		division === "b"
			? DIVISION_B_EVENTS_2026
			: division === "c"
				? DIVISION_C_EVENTS_2026
				: null;

	for (const eventName of events) {
		// Only include events that are in the allowed list for the division
		if (allowedEvents && !allowedEvents.includes(eventName)) {
			continue;
		}

		const school1Elo = getMaxEventElo(school1Data, eventName, season);
		const school2Elo = getMaxEventElo(school2Data, eventName, season);

		if (school1Elo !== null && school2Elo !== null) {
			const winPercentage =
				calculateWinProbability(school1Elo, school2Elo) * 100;
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
