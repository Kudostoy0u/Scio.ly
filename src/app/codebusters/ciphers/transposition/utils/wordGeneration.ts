import { toUniqueLetters } from "./wordBank";

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
