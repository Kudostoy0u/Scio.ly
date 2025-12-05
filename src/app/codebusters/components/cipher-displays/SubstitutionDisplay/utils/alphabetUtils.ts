export function generateKeywordAlphabet(keyword: string): string {
	const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, "");
	const used = new Set<string>();
	const result: string[] = [];

	for (const char of cleanKeyword) {
		if (!used.has(char)) {
			used.add(char);
			result.push(char);
		}
	}

	for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		if (!used.has(char)) {
			result.push(char);
		}
	}

	return result.join("");
}
