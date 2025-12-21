/**
 * Nihilist cipher encryption function
 */

import wordsJson from "@/../public/words.json";
import type { NihilistCipherResult } from "@/app/codebusters/ciphers/types/cipherTypes";
import {
	createPolybiusSquare,
	letterToCoordinates,
} from "@/app/codebusters/ciphers/utils/cipherUtils";

// Top-level regex for performance
const LETTER_REGEX = /^[A-Za-z]$/;

// Cache processed words
let cachedWords: string[] | null = null;

// Helper function to get words from words.json
function getWords(): string[] {
	if (cachedWords !== null) {
		return cachedWords;
	}
	const words = (wordsJson as string[])
		.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
		.filter((w) => w.length >= 3 && w.length <= 15);
	cachedWords = words;
	return words;
}

// Helper function to generate a key from real words
function generateWordKey(minLength: number, maxLength: number): string {
	const words = getWords();
	const suitableWords = words.filter(
		(w) => w.length >= minLength && w.length <= maxLength,
	);

	if (suitableWords.length === 0) {
		// Fallback: combine shorter words
		const shortWords = words.filter((w) => w.length >= 3 && w.length <= 8);
		if (shortWords.length === 0) {
			// Ultimate fallback: random letters
			return Array.from({ length: minLength }, () =>
				String.fromCharCode(65 + Math.floor(Math.random() * 26)),
			).join("");
		}

		let result = "";
		while (result.length < minLength && shortWords.length > 0) {
			const word =
				shortWords[Math.floor(Math.random() * shortWords.length)] || "";
			if (word) {
				result += word;
			}
		}
		return result.slice(0, maxLength);
	}

	// Select a random word from suitable words
	const selectedWord =
		suitableWords[Math.floor(Math.random() * suitableWords.length)] || "";
	return selectedWord.slice(0, maxLength);
}

// Helper function to convert text to numbers
function textToNumbers(
	text: string,
	polybiusSquare: ReturnType<typeof createPolybiusSquare>,
): number[] {
	const numbers: number[] = [];
	for (const char of text) {
		const coords = letterToCoordinates(char, polybiusSquare);
		numbers.push(Number.parseInt(coords));
	}
	return numbers;
}

// Helper function to create running key
function createRunningKey(
	plaintextNumbers: number[],
	keyNumbers: number[],
): number[] {
	const runningKey: number[] = [];
	for (let i = 0; i < plaintextNumbers.length; i++) {
		const keyIndex = i % keyNumbers.length;
		const keyNum = keyNumbers[keyIndex];
		if (keyNum !== undefined) {
			runningKey.push(keyNum);
		}
	}
	return runningKey;
}

// Helper function to encrypt numbers
function encryptNumbers(
	plaintextNumbers: number[],
	runningKey: number[],
): number[] {
	const ciphertextNumbers: number[] = [];
	for (let i = 0; i < plaintextNumbers.length; i++) {
		const plainNum = plaintextNumbers[i];
		const runKey = runningKey[i];
		if (plainNum !== undefined && runKey !== undefined) {
			ciphertextNumbers.push(plainNum + runKey);
		}
	}
	return ciphertextNumbers;
}

// Helper function to determine block size
function determineBlockSize(): number {
	const roll = Math.random();
	return roll < 0.2 ? 0 : roll < 0.4 ? 4 : roll < 0.8 ? 5 : 6;
}

// Helper function to add pair with spacing
function addPairWithSpacing(encrypted: string, pair: string): string {
	if (encrypted.length > 0 && !encrypted.endsWith(" ")) {
		return `${encrypted} ${pair}`;
	}
	return `${encrypted}${pair}`;
}

// Helper function to process original text characters
function processOriginalText(
	originalText: string,
	pairs: string[],
): { encrypted: string; pairIndex: number } {
	let encrypted = "";
	let pi = 0;
	for (let i = 0; i < originalText.length && pi < pairs.length; i++) {
		const ch = originalText[i];
		if (ch && LETTER_REGEX.test(ch)) {
			const pair = pairs[pi];
			if (pair !== undefined) {
				encrypted = addPairWithSpacing(encrypted, pair);
				pi++;
			}
		} else if (ch === " ") {
			encrypted += "   ";
		}
	}
	return { encrypted, pairIndex: pi };
}

// Helper function to add remaining pairs
function addRemainingPairs(
	encrypted: string,
	pairs: string[],
	startIndex: number,
): string {
	let result = encrypted;
	for (let i = startIndex; i < pairs.length; i++) {
		const pair = pairs[i];
		if (pair !== undefined) {
			result = addPairWithSpacing(result, pair);
		}
	}
	return result;
}

// Helper function to format with no blocking (preserve spaces)
function formatWithNoBlocking(pairs: string[], originalText: string): string {
	const { encrypted, pairIndex } = processOriginalText(originalText, pairs);
	return addRemainingPairs(encrypted, pairs, pairIndex);
}

// Helper function to format with blocking
function formatWithBlocking(pairs: string[], blockSize: number): string {
	const blocks: string[] = [];
	for (let i = 0; i < pairs.length; i += blockSize) {
		blocks.push(pairs.slice(i, i + blockSize).join(" "));
	}
	return blocks.join("   "); // triple-space between blocks
}

/**
 * Encrypts text using Nihilist cipher
 * @param {string} text - Text to encrypt
 * @returns {NihilistCipherResult} Encrypted text and keys
 */
export const encryptNihilist = (text: string): NihilistCipherResult => {
	// Generate keys from real words
	const polybiusKey = generateWordKey(5, 12);
	const cipherKey = generateWordKey(4, 10);
	const polybiusSquare = createPolybiusSquare(polybiusKey);

	// Clean text and convert to numbers
	const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");
	const plaintextNumbers = textToNumbers(cleanText, polybiusSquare);

	// Convert cipher key to numbers
	const keyNumbers = textToNumbers(cipherKey.toUpperCase(), polybiusSquare);

	// Create running key
	const runningKey = createRunningKey(plaintextNumbers, keyNumbers);

	// Encrypt by adding plaintext and key numbers
	const ciphertextNumbers = encryptNumbers(plaintextNumbers, runningKey);

	// Format output with visual grouping
	const numberString = ciphertextNumbers
		.map((n) => n.toString().padStart(2, "0"))
		.join(" ");
	const pairs = numberString.split(" ");

	// New distribution for visual grouping: 0 (20%), 4 (20%), 5 (40%), 6 (20%)
	const blockSize = determineBlockSize();
	const encrypted =
		blockSize === 0
			? formatWithNoBlocking(pairs, text)
			: formatWithBlocking(pairs, blockSize);

	return { encrypted, polybiusKey, cipherKey };
};
