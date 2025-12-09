/**
 * Team Data Hashing Utilities
 *
 * Generates stable hashes for team data to detect changes.
 * Used for cache invalidation via cookies.
 */

/**
 * Simple, fast hash function for strings
 * Based on DJB2 algorithm
 */
function hashString(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 33) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
}

/**
 * Create a deterministic hash from an object
 */
export function hashObject(obj: unknown): string {
	// Sort keys for consistency
	const sorted = JSON.stringify(obj, Object.keys(obj as object).sort());
	return hashString(sorted);
}

/**
 * Create a hash from an array of objects
 */
export function hashArray(arr: unknown[]): string {
	const combined = arr.map((item) => hashObject(item)).join("|");
	return hashString(combined);
}

/**
 * Generate hashes for all team data tables
 */
export interface TeamDataHashes {
	groupHash: string;
	unitsHash: string;
	membershipsHash: string;
	rosterHash: string;
	assignmentsHash: string;
	usersHash: string;
}

export function generateTeamDataHashes(data: {
	group: unknown;
	units: unknown[];
	memberships: unknown[];
	rosterEntries: unknown[];
	assignments: unknown[];
	users: unknown[];
}): TeamDataHashes {
	return {
		groupHash: hashObject(data.group),
		unitsHash: hashArray(data.units),
		membershipsHash: hashArray(data.memberships),
		rosterHash: hashArray(data.rosterEntries),
		assignmentsHash: hashArray(data.assignments),
		usersHash: hashArray(data.users),
	};
}

/**
 * Compare two sets of hashes
 */
export function hashesMatch(a: TeamDataHashes, b: TeamDataHashes): boolean {
	return (
		a.groupHash === b.groupHash &&
		a.unitsHash === b.unitsHash &&
		a.membershipsHash === b.membershipsHash &&
		a.rosterHash === b.rosterHash &&
		a.assignmentsHash === b.assignmentsHash &&
		a.usersHash === b.usersHash
	);
}

/**
 * Serialize hashes to cookie-safe string
 */
export function serializeHashes(hashes: TeamDataHashes): string {
	return `${hashes.groupHash}|${hashes.unitsHash}|${hashes.membershipsHash}|${hashes.rosterHash}|${hashes.assignmentsHash}|${hashes.usersHash}`;
}

/**
 * Deserialize hashes from cookie string
 */
export function deserializeHashes(str: string): TeamDataHashes | null {
	const parts = str.split("|");
	if (parts.length !== 6) {
		return null;
	}

	return {
		groupHash: parts[0] || "",
		unitsHash: parts[1] || "",
		membershipsHash: parts[2] || "",
		rosterHash: parts[3] || "",
		assignmentsHash: parts[4] || "",
		usersHash: parts[5] || "",
	};
}
