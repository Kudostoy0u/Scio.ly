export function normalizeIj(s: string): string {
	return s.replace(/J/g, "I");
}

export function normalizeToken(t: string): string {
	return (t || "").replace(/J/g, "I");
}

export function normalizeInputValue(raw: string): string {
	if (raw === "") {
		return "";
	}
	return raw.includes("I") || raw.includes("J") ? "I/J" : raw;
}
