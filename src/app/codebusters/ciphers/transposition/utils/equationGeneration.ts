import logger from "@/lib/utils/logging/logger";
import {
	getUniqueSolution,
	hasUniqueSolution,
} from "./uniqueCryptarithmSolver";
import { toUniqueLetters } from "./wordBank";
import { validateWords } from "./wordGeneration";

// Helper function to convert word to number using mapping
function wordToNumber(word: string, mapping: Record<string, number>): number {
	let num = 0;
	for (const ch of word) {
		const mapped = mapping[ch];
		if (mapped === undefined) {
			throw new Error(`No mapping found for character: ${ch}`);
		}
		num = num * 10 + mapped;
	}
	return num;
}

// Helper function to create digit groups from solution words
function createDigitGroups(
	solutionWords: string[],
	toNumber: (word: string) => number,
): Array<{ digits: string; word: string }> {
	return solutionWords.map((word) => {
		const num = toNumber(word);
		return {
			digits: num.toString().split("").join(" "),
			word: word,
		};
	});
}

// Helper function to try generating an equation for given words
export function tryGenerateEquation(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
	uniqueWords: string[],
): {
	equation: string;
	numericExample: string | null;
	digitGroups: Array<{ digits: string; word: string }>;
	operation: "+" | "-";
} | null {
	// Validate with operation-specific constraints
	if (!validateWords(w1, w2, w3, operation)) {
		return null;
	}

	// Use the uniqueness solver to find a solution with exactly ONE unique solution
	const mapping = getUniqueSolution(w1, w2, w3, operation);
	if (!mapping) {
		// No unique solution found - reject this cryptarithm
		return null;
	}

	const toNumber = (word: string): number => wordToNumber(word, mapping);
	const n1 = toNumber(w1);
	const n2 = toNumber(w2);
	const n3 = toNumber(w3);

	// Double-check that the equation is mathematically correct
	if (operation === "+") {
		if (n1 + n2 !== n3) {
			// Equation doesn't match - this shouldn't happen but validate anyway
			return null;
		}
	} else {
		if (n1 - n2 !== n3) {
			// Equation doesn't match - this shouldn't happen but validate anyway
			return null;
		}
	}

	// Verify uniqueness one more time (defensive check)
	if (!hasUniqueSolution(w1, w2, w3, operation)) {
		return null;
	}

	let equation: string;
	const op: "+" | "-" = operation;

	if (operation === "-") {
		equation = `${w1} - ${w2} = ${w3}`;
	} else {
		equation = `${w1} + ${w2} = ${w3}`;
	}

	const allLetters = toUniqueLetters(w1 + w2 + w3);
	const availableLettersSet = new Set(allLetters);
	const excludeWords = new Set([
		w1.toUpperCase(),
		w2.toUpperCase(),
		w3.toUpperCase(),
	]);

	// Randomly pick 3-5 words from words.json that only contain letters from the mapping
	const numSolutionWords = Math.floor(Math.random() * 3) + 3; // 3-5 words
	logger.log(
		`[Cryptarithm] Looking for ${numSolutionWords} solution words for equation: ${w1} ${operation} ${w2} = ${w3}`,
	);
	logger.log(
		`[Cryptarithm] Available letters: ${Array.from(availableLettersSet).join(", ")}`,
	);

	const solutionWords: string[] = [];
	const usedWords = new Set<string>();
	const shuffledWords = [...uniqueWords].sort(() => Math.random() - 0.5);

	for (const word of shuffledWords) {
		if (solutionWords.length >= numSolutionWords) {
			break;
		}

		const wordUpper = word.toUpperCase();

		// Skip if already used or is an equation word
		if (usedWords.has(wordUpper) || excludeWords.has(wordUpper)) {
			continue;
		}

		// Check if word only contains letters from the mapping
		const wordLetters = wordUpper.split("");
		const allLettersInWord = wordLetters.every((letter) =>
			availableLettersSet.has(letter),
		);

		if (allLettersInWord && wordLetters.length >= 2) {
			solutionWords.push(wordUpper);
			usedWords.add(wordUpper);
			logger.log(
				`[Cryptarithm] Added solution word: "${wordUpper}" (${solutionWords.length}/${numSolutionWords})`,
			);
		}
	}

	if (solutionWords.length < 3) {
		logger.log(
			`[Cryptarithm] Failed to find enough solution words. Found: ${solutionWords.length}, needed: 3`,
		);
		return null;
	}

	logger.log(
		`[Cryptarithm] Final solution words for "values to decode": ${solutionWords.join(", ")}`,
	);

	const digitGroups = createDigitGroups(solutionWords, toNumber);

	// Also include equation words in digitGroups so all letters are mapped
	const equationDigitGroups = [
		{ digits: n1.toString().split("").join(" "), word: w1 },
		{ digits: n2.toString().split("").join(" "), word: w2 },
		{ digits: n3.toString().split("").join(" "), word: w3 },
	];

	// Combine equation words with solution words
	const allDigitGroups = [...equationDigitGroups, ...digitGroups];

	return {
		equation,
		numericExample: null,
		digitGroups: allDigitGroups,
		operation: op,
	};
}

// Helper function to attempt generating cryptarithm with multiple tries
export function attemptGenerateCryptarithm(
	operation: "+" | "-",
	maxAttempts: number,
	uniqueWords: string[],
	_pickWord: (exclude?: Set<string>) => string,
): {
	equation: string;
	numericExample: string | null;
	digitGroups: Array<{ digits: string; word: string }>;
	operation: "+" | "-";
} | null {
	// Filter words that are reasonable for cryptarithms (3-8 letters, matching Python script)
	const candidateWords = uniqueWords.filter(
		(w) => w.length >= 3 && w.length <= 8,
	);

	if (candidateWords.length < 3) {
		return null;
	}

	// Increase attempts since uniqueness check is more restrictive (matching Python script)
	const maxTries = Math.min(maxAttempts, 100000);

	// Pre-shuffle for better distribution - use Fisher-Yates for better randomness
	const shuffled = [...candidateWords];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j] ?? "", shuffled[i] ?? ""];
	}

	// For addition: prefer combinations where result length makes sense
	// For subtraction: prefer w1 >= w2
	const getWordCombinations = (): Array<[string, string, string]> => {
		const combinations: Array<[string, string, string]> = [];

		// Expand search space - try more words
		const searchLimit = Math.min(shuffled.length, 100);

		for (let i = 0; i < searchLimit; i++) {
			for (let j = 0; j < searchLimit; j++) {
				if (i === j) continue;
				for (let k = 0; k < searchLimit; k++) {
					if (k === i || k === j) continue;

					const w1 = shuffled[i] ?? "";
					const w2 = shuffled[j] ?? "";
					const w3 = shuffled[k] ?? "";

					if (!w1 || !w2 || !w3) continue;

					// Prioritize mathematically valid combinations
					if (operation === "+") {
						const maxLen = Math.max(w1.length, w2.length);
						// Result should be maxLen or maxLen+1
						if (w3.length === maxLen || w3.length === maxLen + 1) {
							combinations.push([w1, w2, w3]);
						}
					} else {
						// For subtraction: w1 should be >= w2, result <= w1
						if (w1.length >= w2.length && w3.length <= w1.length) {
							combinations.push([w1, w2, w3]);
						}
					}

					// Limit combinations to prevent too many, but allow more
					if (combinations.length >= 500) break;
				}
				if (combinations.length >= 500) break;
			}
			if (combinations.length >= 500) break;
		}

		// Shuffle for randomness
		return combinations.sort(() => Math.random() - 0.5);
	};

	const validCombinations = getWordCombinations();

	// Try valid combinations first
	for (
		let attempt = 0;
		attempt < Math.min(maxTries, validCombinations.length);
		attempt++
	) {
		const [w1, w2, w3] = validCombinations[attempt] ?? ["", "", ""];

		if (!w1 || !w2 || !w3) continue;

		// Final validation
		if (!validateWords(w1, w2, w3, operation)) {
			continue;
		}

		// Check unique letters count (must be <= 10 for valid cryptarithm)
		const uniqueLetters = toUniqueLetters(w1 + w2 + w3);
		if (uniqueLetters.length > 10) {
			continue;
		}

		const result = tryGenerateEquation(w1, w2, w3, operation, uniqueWords);
		if (result) {
			return result;
		}
	}

	// Try random combinations with much larger search space
	for (let attempt = 0; attempt < maxTries; attempt++) {
		// Re-shuffle periodically for better variety
		if (attempt > 0 && attempt % 1000 === 0) {
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j] ?? "", shuffled[i] ?? ""];
			}
		}

		const i1 = Math.floor(Math.random() * shuffled.length);
		let i2 = Math.floor(Math.random() * shuffled.length);
		while (i2 === i1) {
			i2 = Math.floor(Math.random() * shuffled.length);
		}
		let i3 = Math.floor(Math.random() * shuffled.length);
		while (i3 === i1 || i3 === i2) {
			i3 = Math.floor(Math.random() * shuffled.length);
		}

		const w1 = shuffled[i1] ?? "";
		const w2 = shuffled[i2] ?? "";
		const w3 = shuffled[i3] ?? "";

		if (!w1 || !w2 || !w3 || w1 === w2 || w1 === w3 || w2 === w3) {
			continue;
		}

		if (!validateWords(w1, w2, w3, operation)) {
			continue;
		}

		// Check unique letters count (must be <= 10 for valid cryptarithm)
		const uniqueLetters = toUniqueLetters(w1 + w2 + w3);
		if (uniqueLetters.length > 10) {
			continue;
		}

		const result = tryGenerateEquation(w1, w2, w3, operation, uniqueWords);
		if (result) {
			return result;
		}
	}

	return null;
}
