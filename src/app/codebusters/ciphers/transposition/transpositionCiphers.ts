/**
 * Transposition cipher encryption functions
 */

import type {
	ColumnarTranspositionResult,
	CryptarithmResult,
} from "@/app/codebusters/ciphers/types/cipherTypes";
import { attemptGenerateCryptarithm } from "./utils/equationGeneration";
import { generateFallbackCryptarithm } from "./utils/fallbackCryptarithm";
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
	const keyLength = Math.floor(Math.random() * 5) + 3; // 3-7 characters

	const key = Array.from({ length: keyLength }, () =>
		String.fromCharCode(65 + Math.floor(Math.random() * 26)),
	).join("");

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
		const isSubtraction = Math.random() < 0.5;
		const attempts = 200;

		const result = attemptGenerateCryptarithm(
			isSubtraction ? "-" : "+",
			attempts,
			uniqueWords,
			pickWordFn,
		);
		if (result) {
			return result;
		}

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

		return generateFallbackCryptarithm(uniqueWords);
	};

	const cryptarithmData = generateCryptarithm();
	const encrypted = cryptarithmData.equation;

	return { encrypted, cryptarithmData };
};
