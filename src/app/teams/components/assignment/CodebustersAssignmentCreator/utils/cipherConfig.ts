import { DISABLED_CIPHERS } from "@/app/codebusters/config";
import type { QuoteData } from "@/app/codebusters/types";

// Cipher types organized by division (same as practice page)
const DIVISION_B_ONLY_CIPHERS: QuoteData["cipherType"][] = [
	"Affine",
	"Atbash",
	"Caesar",
];

const DIVISION_C_ONLY_CIPHERS: QuoteData["cipherType"][] = [
	"Hill 2x2",
	"Hill 3x3",
	"K3 Aristocrat",
];

const BOTH_DIVISIONS_CIPHERS: QuoteData["cipherType"][] = [
	"Baconian",
	"Checkerboard",
	"Complete Columnar",
	"Cryptarithm",
	"Fractionated Morse",
	"K1 Aristocrat",
	"K2 Aristocrat",
	"Random Aristocrat",
	"K1 Patristocrat",
	"K2 Patristocrat",
	"K1 Xenocrypt",
	"K2 Xenocrypt",
	"Nihilist",
	"Porta",
];

// Filter out disabled ciphers
export function getAvailableCiphers(
	division: string,
): QuoteData["cipherType"][] {
	let allCiphers: QuoteData["cipherType"][] = [];

	if (division === "B") {
		allCiphers = [...DIVISION_B_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
	} else if (division === "C") {
		allCiphers = [...DIVISION_C_ONLY_CIPHERS, ...BOTH_DIVISIONS_CIPHERS];
	} else {
		// 'any' or default - include all
		allCiphers = [
			...DIVISION_B_ONLY_CIPHERS,
			...DIVISION_C_ONLY_CIPHERS,
			...BOTH_DIVISIONS_CIPHERS,
		];
	}

	return allCiphers.filter((cipher) => !DISABLED_CIPHERS.includes(cipher));
}
