import type { QuoteData } from "@/app/codebusters/types";
import { useCallback } from "react";

const generateKeywordAlphabet = (keyword: string): string => {
	const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, "");
	const used = new Set<string>();
	const result: string[] = [];

	for (const char of cleanKeyword) {
		if (!used.has(char)) {
			used.add(char);
			result.push(char);
		}
	}

	for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		if (!used.has(char)) {
			result.push(char);
		}
	}

	return result.join("");
};

// Helper function to check Caesar cipher with known shift
const checkCaesarWithShift = (quote: QuoteData): boolean => {
	if (quote.caesarShift === undefined || !quote.solution) {
		return false;
	}
	const shift = quote.caesarShift;
	for (let i = 0; i < 26; i++) {
		const plainLetter = String.fromCharCode(65 + i);
		const cipherLetter = String.fromCharCode(((i + shift) % 26) + 65);
		if (quote.solution[cipherLetter] !== plainLetter) {
			return false;
		}
	}
	return true;
};

// Helper function to check Caesar cipher without known shift
const checkCaesarWithoutShift = (quote: QuoteData): boolean => {
	if (!quote.solution) {
		return false;
	}
	const ciphertext = quote.encrypted.toUpperCase().replace(/[^A-Z]/g, "");
	const expectedPlaintext = quote.quote.toUpperCase().replace(/[^A-Z]/g, "");
	let decipheredText = "";
	for (const cipherLetter of ciphertext) {
		const userPlainLetter = quote.solution[cipherLetter] || "";
		decipheredText += userPlainLetter;
	}
	return decipheredText === expectedPlaintext;
};

// Helper function to check Atbash cipher
const checkAtbash = (quote: QuoteData): boolean => {
	if (!quote.solution) {
		return false;
	}
	const atbashMap = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
	for (let i = 0; i < 26; i++) {
		const plainLetter = String.fromCharCode(65 + i);
		const cipherLetter = atbashMap[i];
		if (
			cipherLetter !== undefined &&
			quote.solution[cipherLetter] !== plainLetter
		) {
			return false;
		}
	}
	return true;
};

// Helper function to check Affine cipher
const checkAffine = (quote: QuoteData): boolean => {
	if (
		quote.affineA === undefined ||
		quote.affineB === undefined ||
		!quote.solution
	) {
		return false;
	}
	const a = quote.affineA;
	const b = quote.affineB;
	for (let i = 0; i < 26; i++) {
		const plainLetter = String.fromCharCode(65 + i);
		const cipherLetter = String.fromCharCode(((a * i + b) % 26) + 65);
		if (quote.solution[cipherLetter] !== plainLetter) {
			return false;
		}
	}
	return true;
};

// Helper function to check Fractionated Morse cipher
const checkFractionatedMorse = (quote: QuoteData): boolean => {
	if (!(quote.solution && quote.fractionationTable)) {
		return false;
	}
	for (const [cipherLetter, triplet] of Object.entries(quote.solution)) {
		if (quote.fractionationTable[triplet] !== cipherLetter) {
			return false;
		}
	}
	return true;
};

// Valid substitution cipher types
const SUBSTITUTION_CIPHER_TYPES = [
	"K1 Aristocrat",
	"K2 Aristocrat",
	"K3 Aristocrat",
	"K1 Patristocrat",
	"K2 Patristocrat",
	"K3 Patristocrat",
	"Random Aristocrat",
	"Random Patristocrat",
	"Caesar",
	"Atbash",
	"Affine",
	"Random Xenocrypt",
	"K1 Xenocrypt",
	"K2 Xenocrypt",
	"Nihilist",
	"Fractionated Morse",
	"Complete Columnar",
] as const;

export const useAnswerChecking = (quotes: QuoteData[]) => {
	// Helper function to check specific cipher types
	const checkSpecificCipherType = useCallback(
		(quote: QuoteData): boolean | null => {
			if (quote.cipherType === "Caesar") {
				return quote.caesarShift !== undefined
					? checkCaesarWithShift(quote)
					: checkCaesarWithoutShift(quote);
			}
			if (quote.cipherType === "Atbash") {
				return checkAtbash(quote);
			}
			if (quote.cipherType === "Affine") {
				return checkAffine(quote);
			}
			if (quote.cipherType === "Fractionated Morse") {
				return checkFractionatedMorse(quote);
			}
			return null;
		},
		[],
	);

	const checkSubstitutionAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote?.solution) {
				return false;
			}
			if (
				!SUBSTITUTION_CIPHER_TYPES.includes(
					quote.cipherType as (typeof SUBSTITUTION_CIPHER_TYPES)[number],
				)
			) {
				return false;
			}

			const specificResult = checkSpecificCipherType(quote);
			if (specificResult !== null) {
				return specificResult;
			}

			// Helper function to build substitution map for K3 ciphers
			const buildK3SubstitutionMap = (
				keyword: string,
				isXeno: boolean,
				kShift: number,
				_quoteIndex: number,
			): { [key: string]: string } => {
				const substitutionMap: { [key: string]: string } = {};
				const base = generateKeywordAlphabet(keyword);
				const alpha = isXeno ? `${base}Ñ` : base;
				const len = isXeno ? 27 : 26;
				for (let i = 0; i < len; i++) {
					const shiftedIndex = (i + kShift) % len;
					const alphaI = alpha[i];
					const alphaShifted = alpha[shiftedIndex];
					if (alphaI !== undefined && alphaShifted !== undefined) {
						substitutionMap[alphaI] = alphaShifted;
					}
				}
				return substitutionMap;
			};

			// Helper function to get plain alphabet for K1/K2
			const getPlainAlphabet = (
				keyword: string,
				isXeno: boolean,
				isK1: boolean,
			): string => {
				if (isK1) {
					const base = generateKeywordAlphabet(keyword);
					return isXeno ? `${base}Ñ` : base;
				}
				return isXeno
					? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
					: "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			};

			// Helper function to get base cipher alphabet for K1/K2
			const getBaseCipher = (
				keyword: string,
				isXeno: boolean,
				isK1: boolean,
			): string => {
				if (isK1) {
					return isXeno
						? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
						: "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				}
				const base = generateKeywordAlphabet(keyword);
				return isXeno ? `${base}Ñ` : base;
			};

			// Helper function to build substitution map for K1/K2 ciphers
			const buildK1K2SubstitutionMap = (
				keyword: string,
				isXeno: boolean,
				isK1: boolean,
				kShift: number,
			): { [key: string]: string } => {
				const substitutionMap: { [key: string]: string } = {};
				const plainAlphabet = getPlainAlphabet(keyword, isXeno, isK1);
				const baseCipher = getBaseCipher(keyword, isXeno, isK1);
				const cipherAlphabet =
					baseCipher.slice(kShift) + baseCipher.slice(0, kShift);
				const len = isXeno ? 27 : 26;
				for (let i = 0; i < len; i++) {
					const plainChar = plainAlphabet[i];
					const cipherChar = cipherAlphabet[i];
					if (plainChar !== undefined && cipherChar !== undefined) {
						substitutionMap[plainChar] = cipherChar;
					}
				}
				return substitutionMap;
			};

			// Helper function to build substitution map from provided alphabets
			const buildSubstitutionMapFromAlphabets = (
				plainAlphabet: string[],
				cipherAlphabet: string[],
			): { [key: string]: string } => {
				const substitutionMap: { [key: string]: string } = {};
				const len = Math.min(plainAlphabet.length, cipherAlphabet.length);
				for (let i = 0; i < len; i++) {
					const paChar = plainAlphabet[i];
					const caChar = cipherAlphabet[i];
					if (paChar !== undefined && caChar !== undefined) {
						substitutionMap[paChar] = caChar;
					}
				}
				return substitutionMap;
			};

			// Helper function to validate solution against substitution map
			const validateSolutionAgainstMap = (
				solution: { [key: string]: string },
				substitutionMap: { [key: string]: string },
			): boolean => {
				for (const [cipherLetter, plainLetter] of Object.entries(solution)) {
					if (substitutionMap[plainLetter] !== cipherLetter) {
						return false;
					}
				}
				return true;
			};

			// Helper function to check keyword-only answer
			const checkKeywordOnly = (quote: QuoteData): boolean => {
				const userKeyword = (quote.keywordSolution || "")
					.toUpperCase()
					.replace(/[^A-Z]/g, "");
				const expectedKeyword = quote.key || "";
				return userKeyword === expectedKeyword.toUpperCase();
			};

			// Helper function to check non-keyword ciphers with key array
			const checkNonKeywordCipher = (quote: QuoteData): boolean => {
				if (!quote.solution) {
					return false;
				}
				for (const [cipherLetter, plainLetter] of Object.entries(
					quote.solution,
				)) {
					if (
						quote.key &&
						quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter
					) {
						return false;
					}
				}
				return true;
			};

			// Helper function to build substitution map for keyword ciphers
			const buildKeywordSubstitutionMap = (
				quote: QuoteData,
				quoteIndex: number,
				keyword: string,
				isXeno: boolean,
			): { [key: string]: string } => {
				if (quote.plainAlphabet && quote.cipherAlphabet) {
					return buildSubstitutionMapFromAlphabets(
						quote.plainAlphabet.split(""),
						quote.cipherAlphabet.split(""),
					);
				}
				if (quote.cipherType.includes("K3")) {
					const kShift = quotes[quoteIndex]?.kShift ?? 1;
					return buildK3SubstitutionMap(keyword, isXeno, kShift, quoteIndex);
				}
				const isK1 = quote.cipherType.includes("K1");
				const kShift = quotes[quoteIndex]?.kShift ?? 0;
				return buildK1K2SubstitutionMap(keyword, isXeno, isK1, kShift);
			};

			// Helper function to check keyword-based ciphers
			const checkKeywordBasedCipher = (
				quote: QuoteData,
				quoteIndex: number,
			): boolean => {
				if (quote.askForKeyword) {
					return checkKeywordOnly(quote);
				}

				const keywordCipherTypes = [
					"K1 Aristocrat",
					"K2 Aristocrat",
					"K3 Aristocrat",
					"K1 Patristocrat",
					"K2 Patristocrat",
					"K3 Patristocrat",
					"K1 Xenocrypt",
					"K2 Xenocrypt",
					"K3 Xenocrypt",
				];

				if (!keywordCipherTypes.includes(quote.cipherType)) {
					return checkNonKeywordCipher(quote);
				}

				const keyword = quote.key || "";
				const isXeno = quote.cipherType.includes("Xenocrypt");
				const substitutionMap = buildKeywordSubstitutionMap(
					quote,
					quoteIndex,
					keyword,
					isXeno,
				);
				if (!quote.solution) {
					return false;
				}
				return validateSolutionAgainstMap(quote.solution, substitutionMap);
			};

			return checkKeywordBasedCipher(quote, quoteIndex);
		},
		[quotes, checkSpecificCipherType],
	);

	// Helper function to validate a single Hill matrix row
	const validateHillMatrixRow = useCallback(
		(
			expectedRow: (number | undefined)[],
			actualRow: (string | undefined)[] | undefined,
			_rowIndex: number,
		): boolean => {
			if (!(expectedRow && actualRow)) {
				return false;
			}
			for (let j = 0; j < expectedRow.length; j++) {
				const expectedVal = expectedRow[j];
				if (expectedVal === undefined) {
					return false;
				}
				const expected = expectedVal.toString();
				const actual = actualRow[j] || "";
				if (actual !== expected) {
					return false;
				}
			}
			return true;
		},
		[],
	);

	// Helper function to validate Hill matrix
	const validateHillMatrix = useCallback(
		(
			expectedMatrix: (number | undefined)[][],
			actualMatrix: (string | undefined)[][],
		): boolean => {
			for (let i = 0; i < expectedMatrix.length; i++) {
				const expectedRow = expectedMatrix[i];
				if (!expectedRow) {
					return false;
				}
				if (!validateHillMatrixRow(expectedRow, actualMatrix[i], i)) {
					return false;
				}
			}
			return true;
		},
		[validateHillMatrixRow],
	);

	// Helper function to validate Hill plaintext
	const validateHillPlaintext = useCallback(
		(expectedPlaintext: string, actualPlaintext: string): boolean => {
			for (let i = 0; i < expectedPlaintext.length; i++) {
				const expected = expectedPlaintext[i];
				const actual = actualPlaintext[i] || "";
				if (actual !== expected) {
					return false;
				}
			}
			return true;
		},
		[],
	);

	const checkHillAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (
				(quote.cipherType !== "Hill 2x2" && quote.cipherType !== "Hill 3x3") ||
				!quote.hillSolution
			) {
				return false;
			}

			const expectedMatrix = quote.matrix;
			if (!expectedMatrix) {
				return false;
			}

			if (!validateHillMatrix(expectedMatrix, quote.hillSolution.matrix)) {
				return false;
			}

			const expectedPlaintext = quote.quote
				.toUpperCase()
				.replace(/[^A-Z]/g, "");
			// Convert plaintext object to string by extracting values in order
			if (!quote.hillSolution.plaintext) {
				return false;
			}
			const plaintext = quote.hillSolution.plaintext;
			const actualPlaintextString = Object.keys(plaintext)
				.sort((a, b) => Number(a) - Number(b))
				.map((key) => plaintext[Number(key)] || "")
				.join("");
			return validateHillPlaintext(expectedPlaintext, actualPlaintextString);
		},
		[quotes, validateHillMatrix, validateHillPlaintext],
	);

	const checkPortaAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (quote.cipherType !== "Porta" || !quote.solution) {
				return false;
			}

			for (const [cipherLetter, plainLetter] of Object.entries(
				quote.solution,
			)) {
				if (
					quote.key &&
					quote.key[plainLetter.charCodeAt(0) - 65] !== cipherLetter
				) {
					return false;
				}
			}
			return true;
		},
		[quotes],
	);

	const checkBaconianAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (quote.cipherType !== "Baconian" || !quote.solution) {
				return false;
			}

			const expectedPlaintext = quote.quote
				.toUpperCase()
				.replace(/[^A-Z]/g, "");
			for (let i = 0; i < expectedPlaintext.length; i++) {
				const expected = expectedPlaintext[i];
				const actual = quote.solution[i] || "";
				if (actual !== expected) {
					return false;
				}
			}
			return true;
		},
		[quotes],
	);

	const checkCheckerboardAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (quote.cipherType !== "Checkerboard" || !quote.checkerboardSolution) {
				return false;
			}
			const expectedPlaintext = quote.quote
				.toUpperCase()
				.replace(/[^A-Z]/g, "");
			for (let i = 0; i < expectedPlaintext.length; i++) {
				const expected = expectedPlaintext[i];
				const actual = quote.checkerboardSolution[i] || "";
				if (actual !== expected) {
					return false;
				}
			}
			return true;
		},
		[quotes],
	);

	const checkCryptarithmAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (
				quote.cipherType !== "Cryptarithm" ||
				!quote.cryptarithmSolution ||
				!quote.cryptarithmData
			) {
				return false;
			}

			const expectedWords = quote.cryptarithmData.digitGroups.map((group) =>
				group.word.replace(/\s/g, ""),
			);
			const allExpectedLetters = expectedWords.join("");

			for (let i = 0; i < allExpectedLetters.length; i++) {
				const expected = allExpectedLetters[i];
				const actual = quote.cryptarithmSolution[i] || "";
				if (actual !== expected) {
					return false;
				}
			}

			return true;
		},
		[quotes],
	);

	const checkNihilistAnswer = useCallback(
		(quoteIndex: number): boolean => {
			const quote = quotes[quoteIndex];
			if (!quote) {
				return false;
			}
			if (!quote?.solution) {
				return false;
			}

			// Add nihilist answer checking logic here
			return true;
		},
		[quotes],
	);

	const checkAnswers = useCallback(() => {
		// Add overall answer checking logic here
		return true;
	}, []);

	const getCorrectAnswers = useCallback(() => {
		// Add correct answers logic here
		return 0;
	}, []);

	return {
		checkSubstitutionAnswer,
		checkHillAnswer,
		checkPortaAnswer,
		checkBaconianAnswer,
		checkCheckerboardAnswer,
		checkCryptarithmAnswer,
		checkNihilistAnswer,
		checkAnswers,
		getCorrectAnswers,
	};
};
