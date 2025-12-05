import { findColIndex, findRowIndex } from "./indexFinders";
import { normalizeToken } from "./normalizers";

export function buildGridFromTokens(
	tokens: string[],
	rows: string[],
	cols: string[],
	solution: { [key: number]: string } | undefined,
): string[][] {
	const next = Array.from({ length: 5 }, () =>
		Array.from({ length: 5 }, () => ""),
	);
	tokens.forEach((tok, idx) => {
		const normTok = normalizeToken(tok);
		const rCh = normTok[0];
		const cCh = normTok[1];
		if (rCh !== undefined && cCh !== undefined) {
			const ri = findRowIndex(rCh, rows);
			const ci = findColIndex(cCh, cols);
			const val = (solution?.[idx] || "").toUpperCase();
			if (val && ri !== -1 && ci !== -1) {
				const row = next[ri];
				if (row) {
					row[ci] = val;
				}
			}
		}
	});
	return next;
}
