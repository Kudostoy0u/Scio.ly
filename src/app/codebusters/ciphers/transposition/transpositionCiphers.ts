/**
 * Transposition cipher encryption functions
 */

import type {
	ColumnarTranspositionResult,
	CryptarithmResult,
} from "@/app/codebusters/ciphers/types/cipherTypes";
import { attemptGenerateCryptarithm } from "./utils/equationGeneration";
import { getUniqueWords, pickWord } from "./utils/wordBank";

// Helper function to create transposition matrix
const createTranspositionMatrix = (
	cleanText: string,
	keyLength: number,
): string[][] => {
	const matrix: string[][] = [];
	const numRows = Math.ceil(cleanText.length / keyLength);
	for (let i = 0; i < numRows; i++) {
		const row: string[] = [];
		for (let j = 0; j < keyLength; j++) {
			const index = i * keyLength + j;
			const char = index < cleanText.length ? cleanText[index] : undefined;
			row[j] = char !== undefined ? char : "X";
		}
		matrix[i] = row;
	}
	return matrix;
};

// Helper function to get key order (sorted indices)
const getKeyOrder = (key: string): number[] => {
	const keyArray = key.split("");
	return keyArray
		.map((char, index) => ({ char, index }))
		.sort((a, b) => a.char.localeCompare(b.char))
		.map((item) => item.index);
};

// Helper function to encrypt using matrix and key order
const encryptWithMatrix = (matrix: string[][], keyOrder: number[]): string => {
	let encrypted = "";
	for (const colIndex of keyOrder) {
		if (colIndex === undefined) {
			continue;
		}
		for (const row of matrix) {
			const char = row[colIndex];
			if (char !== undefined) {
				encrypted += char;
			}
		}
	}
	return encrypted;
};

/**
 * Encrypts text using Columnar Transposition cipher
 * @param {string} text - Text to encrypt
 * @returns {ColumnarTranspositionResult} Encrypted text and key
 */
export const encryptColumnarTransposition = (
	text: string,
): ColumnarTranspositionResult => {
	const cleanText = text.toUpperCase().replace(/[^A-Z]/g, "");

	// Get words from the word pool and pick one with length 3-7
	const uniqueWords = getUniqueWords();
	const wordsOfValidLength = uniqueWords.filter(
		(w) => w.length >= 3 && w.length <= 7,
	);

	// Pick a random word from the pool, or fallback to random letters if no words available
	let key: string;
	if (wordsOfValidLength.length > 0) {
		const randomIndex = Math.floor(Math.random() * wordsOfValidLength.length);
		key = wordsOfValidLength[randomIndex] ?? "";
	} else {
		// Fallback to random letters if no words available (shouldn't happen in practice)
		const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters
		key = Array.from({ length: keyLength }, () =>
			String.fromCharCode(65 + Math.floor(Math.random() * 26)),
		).join("");
	}

	const keyLength = key.length;
	const matrix = createTranspositionMatrix(cleanText, keyLength);
	const keyOrder = getKeyOrder(key);
	const encrypted = encryptWithMatrix(matrix, keyOrder);

	return { encrypted, key };
};

/**
 * Encrypts text using Cryptarithm cipher
 * @param {string} text - Text to encrypt
 * @returns {CryptarithmResult} Encrypted text and cryptarithm data
 */
export const encryptCryptarithm = (_text: string): CryptarithmResult => {
	const uniqueWords = getUniqueWords();
	const pickWordFn = (exclude: Set<string> = new Set()) =>
		pickWord(uniqueWords, exclude);

	const generateCryptarithm = (): {
		equation: string;
		numericExample: string | null;
		digitGroups: Array<{ digits: string; word: string }>;
		operation: "+" | "-";
	} => {
		// 75% chance addition, 25% chance subtraction
		const isSubtraction = Math.random() < 0.25;
		const attempts = 100000; // Significantly increased attempts

		// Try multiple rounds with different random shuffles
		const maxRounds = 10;
		for (let round = 0; round < maxRounds; round++) {
			// Try the preferred operation first
			const result = attemptGenerateCryptarithm(
				isSubtraction ? "-" : "+",
				attempts,
				uniqueWords,
				pickWordFn,
			);
			if (result) {
				return result;
			}

			// If subtraction failed, try addition as fallback
			if (isSubtraction) {
				const additionResult = attemptGenerateCryptarithm(
					"+",
					attempts,
					uniqueWords,
					pickWordFn,
				);
				if (additionResult) {
					return additionResult;
				}
			}

			// Try the other operation if preferred one failed
			const otherOperation = isSubtraction ? "+" : "-";
			const otherResult = attemptGenerateCryptarithm(
				otherOperation,
				attempts,
				uniqueWords,
				pickWordFn,
			);
			if (otherResult) {
				return otherResult;
			}
		}

		// If all rounds failed, throw an error instead of using fallback
		throw new Error(
			"Failed to generate cryptarithm after multiple attempts. Please try again.",
		);
	};

	const cryptarithmData = generateCryptarithm();
	const encrypted = cryptarithmData.equation;

	return { encrypted, cryptarithmData };
};
