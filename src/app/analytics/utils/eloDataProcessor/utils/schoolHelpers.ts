/**
 * Helper functions for finding and extracting school data
 */

import type { EloData } from "@/app/analytics/types/elo";

const SCHOOL_NAME_WITH_STATE_REGEX = /^(.+?)\s*\(([A-Z]{2})\)$/;

export const findSchool = (eloData: EloData, schoolNameWithState: string) => {
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
