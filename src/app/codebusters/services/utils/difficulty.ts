export type DifficultyInput = {
	cipherType: string;
	quote: string;
	baconianBinaryType?: string;
};

export const computeCipherDifficulty = (q: DifficultyInput): number => {
	const baseByType: Record<string, number> = {
		Atbash: 0.15,
		Caesar: 0.2,
		Affine: 0.35,
		Porta: 0.45,
		Checkerboard: 0.55,
		Baconian: 0.45,
		"Complete Columnar": 0.55,
		"Fractionated Morse": 0.65,
		"Hill 2x2": 0.6,
		"Hill 3x3": 0.8,
		"K1 Aristocrat": 0.55,
		"K2 Aristocrat": 0.7,
		"K3 Aristocrat": 0.75,
		"Random Aristocrat": 0.8,
		"K1 Patristocrat": 0.65,
		"K2 Patristocrat": 0.78,
		"K3 Patristocrat": 0.82,
		"Random Patristocrat": 0.9,
		"Random Xenocrypt": 0.95,
		"K1 Xenocrypt": 0.8,
		"K2 Xenocrypt": 0.85,
		"K3 Xenocrypt": 0.9,
		Cryptarithm: 0.7,
	};
	let d = baseByType[q.cipherType] ?? 0.5;

	const len = q.quote.replace(/[^A-Za-z]/g, "").length;
	const norm = Math.max(0, Math.min(1, (len - 40) / 160));
	d += (norm - 0.5) * 0.25;

	if (q.cipherType === "Baconian" && q.baconianBinaryType) {
		const t = q.baconianBinaryType;
		if (t === "A/B") {
			d -= 0.15;
		} else if (t === "Vowels/Consonants") {
			d += 0.05;
		} else if (t === "Odd/Even") {
			d += 0.08;
		} else if (t.includes(" vs ")) {
			d += 0.12;
		}
		d = Math.max(0.1, Math.min(0.98, d));
	}
	return Math.max(0.1, Math.min(0.98, d));
};
