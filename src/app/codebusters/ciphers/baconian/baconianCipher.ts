/**
 * Baconian cipher encryption function
 */

import type { BaconianCipherResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import { selectRandomScheme } from "@/app/codebusters/schemes/baconian-schemes";

/**
 * Encrypts text using Baconian cipher
 * @param {string} text - Text to encrypt
 * @returns {BaconianCipherResult} Encrypted text and binary type
 */
export const encryptBaconian = (text: string): BaconianCipherResult => {
	const baconianMap: { [key: string]: string } = {
		A: "AAAAA",
		B: "AAAAB",
		C: "AAABA",
		D: "AAABB",
		E: "AABAA",
		F: "AABAB",
		G: "AABBA",
		H: "AABBB",
		I: "ABAAA",
		J: "ABAAA",
		K: "ABAAB",
		L: "ABABA",
		M: "ABABB",
		N: "ABBAA",
		O: "ABBAB",
		P: "ABBBA",
		Q: "ABBBB",
		R: "BAAAA",
		S: "BAAAB",
		T: "BAABA",
		U: "BAABB",
		V: "BAABB",
		W: "BABAA",
		X: "BABAB",
		Y: "BABBA",
		Z: "BABBB",
	};

	const selectedScheme = selectRandomScheme();
	const cleanedText = text.toUpperCase().replace(/[^A-Z]/g, "");
	const normalizedLetters = cleanedText
		.split("")
		.map((letter) => {
			if (letter === "J") {
				return "I";
			}
			if (letter === "V") {
				return "U";
			}
			return letter;
		})
		.filter((letter) => Boolean(letter));

	const uniqueLetters = Array.from(new Set(normalizedLetters));
	const patternPool = Array.from(new Set(Object.values(baconianMap)));
	for (let i = patternPool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = patternPool[i];
		if (temp !== undefined && patternPool[j] !== undefined) {
			patternPool[i] = patternPool[j];
			patternPool[j] = temp;
		}
	}

	const letterToPattern = new Map<string, string>();
	uniqueLetters.forEach((letter, index) => {
		const pattern = patternPool[index];
		if (pattern) {
			letterToPattern.set(letter, pattern);
		}
	});

	const encryptedGroups = normalizedLetters.map(
		(letter) => letterToPattern.get(letter) || "",
	);
	const encrypted = encryptedGroups.join(" ");

	return { encrypted, binaryType: selectedScheme.type };
};
