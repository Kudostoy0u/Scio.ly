/**
 * Fractionated Morse cipher encryption function
 */

import wordsJson from "@/../public/words.json";
import { FRACTIONATED_MORSE_TRIPLET_ORDER } from "@/app/codebusters/ciphers/fractionatedMorse/tripletOrder";
import {
	pickWord,
	toUniqueLetters,
} from "@/app/codebusters/ciphers/transposition/utils/wordBank";
import type { FractionatedMorseResult } from "@/app/codebusters/ciphers/types/cipherTypes";

/**
 * Encrypts text using Fractionated Morse cipher
 * @param {string} text - Text to encrypt
 * @returns {FractionatedMorseResult} Encrypted text, key, and fractionation table
 */
export const encryptFractionatedMorse = (
	text: string,
): FractionatedMorseResult => {
	// Morse code mapping
	const morseCode: Record<string, string> = {
		A: ".-",
		B: "-...",
		C: "-.-.",
		D: "-..",
		E: ".",
		F: "..-.",
		G: "--.",
		H: "....",
		I: "..",
		J: ".---",
		K: "-.-",
		L: ".-..",
		M: "--",
		N: "-.",
		O: "---",
		P: ".--.",
		Q: "--.-",
		R: ".-.",
		S: "...",
		T: "-",
		U: "..-",
		V: "...-",
		W: ".--",
		X: "-..-",
		Y: "-.--",
		Z: "--..",
	} as Record<string, string>;

	// Remove apostrophes before processing (so "it's" becomes "its")
	const textWithoutApostrophes = text.replace(/'/g, "");

	// Process text character by character to handle x placement rules
	// Rules:
	// - If a letter is followed by another letter, add "x" between them
	// - If a letter is followed by a non-letter (space, comma, period, etc.), add "xx" after it
	// - If the letter is the final one, add "xx" at the end
	const upperText = textWithoutApostrophes.toUpperCase();
	const letters: Array<{
		char: string;
		isFollowedByLetter: boolean;
		isLastOverall: boolean;
	}> = [];

	// First pass: collect all letters and track their positions
	for (let i = 0; i < upperText.length; i++) {
		const char = upperText[i];
		if (char && char >= "A" && char <= "Z") {
			// Check if the immediate next character is a letter (A-Z)
			// If there's any non-letter (space, comma, etc.) between this and the next letter, add "xx"
			const nextChar = i < upperText.length - 1 ? upperText[i + 1] : null;
			const isFollowedByLetter =
				nextChar !== null &&
				nextChar !== undefined &&
				nextChar >= "A" &&
				nextChar <= "Z";

			// Check if this is the last letter overall
			let isLastOverall = true;
			for (let j = i + 1; j < upperText.length; j++) {
				const futureChar = upperText[j];
				if (futureChar && futureChar >= "A" && futureChar <= "Z") {
					isLastOverall = false;
					break;
				}
			}
			letters.push({ char, isFollowedByLetter, isLastOverall });
		}
	}

	// Second pass: convert to morse with proper separators
	let morseString = "";
	for (let i = 0; i < letters.length; i++) {
		const letter = letters[i];
		if (!letter) continue;
		const { char, isFollowedByLetter, isLastOverall } = letter;
		const morse = morseCode[char];
		if (morse) {
			morseString += morse;

			// Determine what separator to add
			if (isLastOverall) {
				// Final letter: add "xx"
				morseString += "xx";
			} else if (!isFollowedByLetter) {
				// Followed by non-letter (space, comma, period, etc.): add "xx"
				morseString += "xx";
			} else {
				// Followed by another letter: add "x"
				morseString += "x";
			}
		}
	}

	// Pad with "x" to make length divisible by 3
	while (morseString.length % 3 !== 0) {
		morseString += "x";
	}

	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	const wordBank = (wordsJson as string[])
		.map((word) => word.toUpperCase().replace(/[^A-Z]/g, ""))
		.filter((word) => word.length >= 7);
	const pickedKeyword = wordBank.length > 0 ? pickWord(wordBank) : "";
	const keywordLetters = toUniqueLetters(pickedKeyword);
	const remainingLetters = alphabet.filter(
		(letter) => !keywordLetters.includes(letter),
	);
	const cipherAlphabet = [...keywordLetters, ...remainingLetters];

	if (FRACTIONATED_MORSE_TRIPLET_ORDER.length !== 26) {
		throw new Error(
			`Expected 26 triplets, got ${FRACTIONATED_MORSE_TRIPLET_ORDER.length}`,
		);
	}

	if (cipherAlphabet.length !== 26) {
		throw new Error(`Expected 26 letters, got ${cipherAlphabet.length}`);
	}

	const fractionationTable: { [key: string]: string } = {};
	for (let i = 0; i < FRACTIONATED_MORSE_TRIPLET_ORDER.length; i++) {
		const triplet = FRACTIONATED_MORSE_TRIPLET_ORDER[i];
		const letter = cipherAlphabet[i];
		if (triplet !== undefined && letter !== undefined) {
			fractionationTable[triplet] = letter;
		}
	}

	// Store the keyword (unique letters) for compatibility/debugging
	const key = keywordLetters.join("");

	// Split morse string into triplets and map each to its assigned letter
	const triplets: string[] = [];
	for (let i = 0; i < morseString.length; i += 3) {
		const triplet = morseString.slice(i, i + 3);
		triplets.push(triplet);
	}

	// Map each triplet to its assigned letter
	let encrypted = "";
	for (const triplet of triplets) {
		const letter = fractionationTable[triplet];
		if (letter) {
			encrypted += letter;
		}
	}

	return { encrypted, key, fractionationTable };
};
