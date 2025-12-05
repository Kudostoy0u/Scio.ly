// Helper function to build correct mapping from fractionation table
export function buildMappingFromFractionationTable(
	fractionationTable: Record<string, string>,
): Record<string, string> {
	const mapping: Record<string, string> = {};
	for (const [triplet, letter] of Object.entries(fractionationTable)) {
		mapping[letter] = triplet;
	}
	return mapping;
}

// Helper function to build correct mapping from key
export function buildMappingFromKey(
	key: string[] | undefined,
): Record<string, string> {
	const mapping: Record<string, string> = {};
	if (!key) {
		return mapping;
	}
	for (let i = 0; i < 26; i++) {
		const plainLetter = String.fromCharCode(65 + i);
		const cipherLetter = key[i];
		if (cipherLetter !== undefined) {
			mapping[cipherLetter] = plainLetter;
		}
	}
	return mapping;
}
