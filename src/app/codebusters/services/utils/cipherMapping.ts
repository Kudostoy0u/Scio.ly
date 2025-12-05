import { filterEnabledCiphers } from "@/app/codebusters/config";
import type { QuoteData } from "@/app/codebusters/types";

export function mapSubtopicsToCipherTypes(cipherTypes: string[]): string[] {
	const subtopicToCipherMap: { [key: string]: string } = {
		"k1 aristocrat": "K1 Aristocrat",
		"k2 aristocrat": "K2 Aristocrat",
		"k3 aristocrat": "K3 Aristocrat",
		"k1 patristocrat": "K1 Patristocrat",
		"k2 patristocrat": "K2 Patristocrat",
		"k3 patristocrat": "K3 Patristocrat",
		"misc aristocrat": "Random Aristocrat",
		"misc patristocrat": "Random Patristocrat",
		caesar: "Caesar",
		atbash: "Atbash",
		affine: "Affine",
		hill: "Hill 2x2",
		baconian: "Baconian",
		porta: "Porta",
		nihilist: "Nihilist",
		"fractionated morse": "Fractionated Morse",
		"columnar transposition": "Complete Columnar",
		"random xenocrypt": "Random Xenocrypt",
		"k1 xenocrypt": "K1 Xenocrypt",
		"k2 xenocrypt": "K2 Xenocrypt",
		"k3 xenocrypt": "K3 Xenocrypt",
		checkerboard: "Checkerboard",
		"K1 Aristocrat": "K1 Aristocrat",
		"K2 Aristocrat": "K2 Aristocrat",
		"K3 Aristocrat": "K3 Aristocrat",
		"K1 Patristocrat": "K1 Patristocrat",
		"K2 Patristocrat": "K2 Patristocrat",
		"K3 Patristocrat": "K3 Patristocrat",
		"Misc. Aristocrat": "Random Aristocrat",
		"Misc. Patristocrat": "Random Patristocrat",
		Caesar: "Caesar",
		Atbash: "Atbash",
		Affine: "Affine",
		Hill: "Hill 2x2",
		Baconian: "Baconian",
		Porta: "Porta",
		Nihilist: "Nihilist",
		"Fractionated Morse": "Fractionated Morse",
		"Columnar Transposition": "Complete Columnar",
		"Random Xenocrypt": "Random Xenocrypt",
		"K1 Xenocrypt": "K1 Xenocrypt",
		"K2 Xenocrypt": "K2 Xenocrypt",
		"K3 Xenocrypt": "K3 Xenocrypt",
		Checkerboard: "Checkerboard",
		Cryptarithm: "Cryptarithm",
		aristocrat: "Random Aristocrat",
		patristocrat: "Random Patristocrat",
	};
	return cipherTypes.map(
		(subtopic: string) => subtopicToCipherMap[subtopic] || subtopic,
	);
}

export function getAvailableCipherTypes(
	cipherTypes: string[],
	division: string,
): QuoteData["cipherType"][] {
	const divisionBCipherTypes = {
		B: [
			"K1 Aristocrat",
			"K2 Aristocrat",
			"Random Aristocrat",
			"K1 Patristocrat",
			"K2 Patristocrat",
			"Random Patristocrat",
			"Baconian",
			"Fractionated Morse",
			"Complete Columnar",
			"Random Xenocrypt",
			"K1 Xenocrypt",
			"K2 Xenocrypt",
			"Porta",
			"Nihilist",
			"Atbash",
			"Caesar",
			"Affine",
			"Checkerboard",
			"Cryptarithm",
		] as QuoteData["cipherType"][],
		C: [
			"K1 Aristocrat",
			"K2 Aristocrat",
			"K3 Aristocrat",
			"Random Aristocrat",
			"K1 Patristocrat",
			"K2 Patristocrat",
			"K3 Patristocrat",
			"Random Patristocrat",
			"Baconian",
			"Random Xenocrypt",
			"K1 Xenocrypt",
			"K2 Xenocrypt",
			"Fractionated Morse",
			"Porta",
			"Complete Columnar",
			"Nihilist",
			"Hill 2x2",
			"Hill 3x3",
			"Checkerboard",
			"Cryptarithm",
		] as QuoteData["cipherType"][],
	};

	const baseDefault: QuoteData["cipherType"][] = [
		"K1 Aristocrat",
		"K2 Aristocrat",
		"K3 Aristocrat",
		"Random Aristocrat",
		"K1 Patristocrat",
		"K2 Patristocrat",
		"K3 Patristocrat",
		"Random Patristocrat",
		"Caesar",
		"Atbash",
		"Affine",
		"Hill 2x2",
		"Hill 3x3",
		"Porta",
		"Baconian",
		"Nihilist",
		"Fractionated Morse",
		"Complete Columnar",
		"Random Xenocrypt",
		"K1 Xenocrypt",
		"K2 Xenocrypt",
		"Cryptarithm",
	];

	const preFiltered =
		cipherTypes && cipherTypes.length > 0
			? (cipherTypes as QuoteData["cipherType"][])
			: division === "B" || division === "C"
				? divisionBCipherTypes[division as "B" | "C"]
				: baseDefault;

	let availableCipherTypes = filterEnabledCiphers(preFiltered);
	if (availableCipherTypes.length === 0) {
		availableCipherTypes = filterEnabledCiphers(baseDefault);
		if (availableCipherTypes.length === 0) {
			availableCipherTypes = ["K1 Aristocrat", "K2 Aristocrat"];
		}
	}
	return availableCipherTypes;
}
