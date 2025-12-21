import wordsJson from "@/../public/words.json";
import {
	FALLBACK_WORDS,
	getCustomWordBank,
} from "@/app/codebusters/utils/common";

const UPPERCASE_LETTER_REGEX = /^[A-Z]$/;

// Cache processed words to avoid reprocessing on every call
let cachedWords: string[] | null = null;

export function getUniqueWords(): string[] {
	// Return cached words if available
	if (cachedWords !== null) {
		return cachedWords;
	}

	const custom = getCustomWordBank();
	const wordBank = (custom && custom.length > 0 ? custom : FALLBACK_WORDS).map(
		(w) => w.toUpperCase(),
	);

	// Load words from words.json and combine with word bank
	const wordsFromJson = (wordsJson as string[])
		.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
		.filter((w) => w.length >= 2 && w.length <= 6);

	// Combine word banks and filter to valid words (2-6 letters, all uppercase)
	const allWords = [...wordBank, ...wordsFromJson]
		.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
		.filter((w) => w.length >= 2 && w.length <= 6);

	// Remove duplicates and cache
	cachedWords = Array.from(new Set(allWords));
	return cachedWords;
}

export function pickWord(
	uniqueWords: string[],
	exclude: Set<string> = new Set(),
): string {
	const available = uniqueWords.filter((w) => !exclude.has(w));
	if (available.length === 0) {
		return (
			uniqueWords[Math.floor(Math.random() * uniqueWords.length)] || "WORD"
		);
	}
	const index = Math.floor(Math.random() * available.length);
	return available[index] || "WORD";
}

export function toUniqueLetters(w: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const ch of w) {
		if (UPPERCASE_LETTER_REGEX.test(ch) && !seen.has(ch)) {
			seen.add(ch);
			out.push(ch);
		}
	}
	return out;
}
