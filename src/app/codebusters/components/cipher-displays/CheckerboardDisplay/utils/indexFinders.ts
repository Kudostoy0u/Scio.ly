import { normalizeIj } from "./normalizers";

export function findColIndex(ch: string, colLabels: string[]): number {
	const target = normalizeIj(ch.toUpperCase());
	for (let i = 0; i < 5; i++) {
		const colLabel = colLabels[i];
		if (!colLabel) {
			continue;
		}
		const label = colLabel.toUpperCase();
		if (label === "I/J") {
			if (target === "I") {
				return i;
			}
		} else if (normalizeIj(label) === target) {
			return i;
		}
	}
	return -1;
}

export function findRowIndex(ch: string, rowLabels: string[]): number {
	const target = normalizeIj(ch.toUpperCase());
	for (let i = 0; i < 5; i++) {
		const rowLabel = rowLabels[i];
		if (!rowLabel) {
			continue;
		}
		const label = rowLabel.toUpperCase();
		if (label === "I/J") {
			if (target === "I") {
				return i;
			}
		} else if (normalizeIj(label) === target) {
			return i;
		}
	}
	return -1;
}
