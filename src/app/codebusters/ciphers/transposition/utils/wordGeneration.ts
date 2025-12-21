import { toUniqueLetters } from "./wordBank";

// Helper function to find valid words from word bank
export function findValidWordsFromBank(
	availableSet: Set<string>,
	uniqueWords: string[],
	numWords: number,
	usedWords: Set<string>,
): string[] {
	const solutionWords: string[] = [];
	const validWords = uniqueWords.filter((word) => {
		const wordLetters = word.split("");
		return wordLetters.every((letter) => availableSet.has(letter));
	});
	const shuffledValidWords = [...validWords].sort(() => Math.random() - 0.5);

	for (const candidate of shuffledValidWords) {
		if (solutionWords.length >= numWords) {
			break;
		}
		if (candidate && !usedWords.has(candidate) && candidate.length >= 2) {
			const candidateLetters = candidate.split("");
			if (candidateLetters.every((letter) => availableSet.has(letter))) {
				solutionWords.push(candidate);
				usedWords.add(candidate);
			}
		}
	}
	return solutionWords;
}

// Helper function to generate words from available letters
export function generateWordsFromLetters(
	availableLetters: string[],
	numWords: number,
	usedWords: Set<string>,
): string[] {
	const solutionWords: string[] = [];
	const remaining = numWords;
	for (let i = 0; i < remaining && solutionWords.length < numWords; i++) {
		const wordLength = Math.floor(Math.random() * 3) + 2; // 2-4 letters
		const shuffledLetters = [...availableLetters].sort(
			() => Math.random() - 0.5,
		);
		const generatedWord = shuffledLetters.slice(0, wordLength).join("");
		if (
			generatedWord &&
			!usedWords.has(generatedWord) &&
			generatedWord.length >= 2
		) {
			solutionWords.push(generatedWord);
			usedWords.add(generatedWord);
		}
	}
	return solutionWords;
}

// Generate solution words using only letters from the equation
export function generateSolutionWords(
	availableLetters: string[],
	_mapping: Record<string, number>,
	numWords: number,
	uniqueWords: string[],
	excludeWords: Set<string> = new Set(),
): string[] {
	const usedWords = new Set(excludeWords);
	const availableSet = new Set(availableLetters);

	const wordsFromBank = findValidWordsFromBank(
		availableSet,
		uniqueWords,
		numWords,
		usedWords,
	);
	const solutionWords = [...wordsFromBank];

	if (solutionWords.length < numWords) {
		const generatedWords = generateWordsFromLetters(
			availableLetters,
			numWords,
			usedWords,
		);
		solutionWords.push(...generatedWords);
	}

	return solutionWords.length >= 3
		? solutionWords.slice(0, numWords)
		: solutionWords;
}

// Helper function to validate words with mathematical constraints
export function validateWords(
	w1: string,
	w2: string,
	w3: string,
	operation?: "+" | "-",
): boolean {
	if (w1 === w2 || w1 === w3 || w2 === w3) {
		return false;
	}
	if (w1.length < 2 || w2.length < 2 || w3.length < 2) {
		return false;
	}
	if (w1.length > 6 || w2.length > 6 || w3.length > 6) {
		return false;
	}
	const allLetters = toUniqueLetters(w1 + w2 + w3);
	if (allLetters.length > 10) {
		return false;
	}

	// Mathematical validation based on operation
	if (operation === "+") {
		// For addition: result length must be equal to or one more than the longer operand
		const maxOperandLength = Math.max(w1.length, w2.length);
		if (w3.length < maxOperandLength || w3.length > maxOperandLength + 1) {
			return false;
		}
	} else if (operation === "-") {
		// For subtraction: w1 must be >= w2, and result length must be <= w1.length
		if (w1.length < w2.length) {
			return false;
		}
		// Result can be same length or one less (if there's no leading digit)
		if (w3.length > w1.length || w3.length < w1.length - 1) {
			return false;
		}
		// Result cannot be longer than first operand
		if (w3.length > w1.length) {
			return false;
		}
	}

	return true;
}

// Helper function to create leading letters set
export function createLeadingLetters(
	w1: string,
	w2: string,
	w3: string,
): Set<string> {
	const leadingLetters = new Set<string>();
	const w1First = w1[0];
	const w2First = w2[0];
	const w3First = w3[0];
	if (w1First !== undefined) {
		leadingLetters.add(w1First);
	}
	if (w2First !== undefined) {
		leadingLetters.add(w2First);
	}
	if (w3First !== undefined) {
		leadingLetters.add(w3First);
	}
	return leadingLetters;
}
