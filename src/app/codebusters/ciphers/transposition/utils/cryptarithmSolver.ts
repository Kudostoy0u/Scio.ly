// Cryptarithm solver using backtracking with column-wise validation

interface CryptarithmSolverState {
	letterToDigit: Record<string, number>;
	digitToLetter: Record<number, string>;
	letters: string[];
	leadingLetters: Set<string>;
	maxDepth: number;
	currentDepth: number;
}

// Get character at position from right (0 = rightmost)
function getCharAt(w: string, pos: number): string | undefined {
	const idx = w.length - 1 - pos;
	return idx >= 0 ? w[idx] : undefined;
}

// Check column constraint for addition with carry propagation
function checkColumnAddition(
	w1: string,
	w2: string,
	w3: string,
	col: number,
	state: CryptarithmSolverState,
	carryIn: number,
): { valid: boolean; carryOut: number } {
	const c1 = getCharAt(w1, col);
	const c2 = getCharAt(w2, col);
	const c3 = getCharAt(w3, col);

	// If we're past all words, check if carry is 0
	if (!c1 && !c2 && !c3) {
		return { valid: carryIn === 0, carryOut: 0 };
	}

	const d1 = c1 ? state.letterToDigit[c1] : undefined;
	const d2 = c2 ? state.letterToDigit[c2] : undefined;
	const d3 = c3 ? state.letterToDigit[c3] : undefined;

	// If result letter is not assigned, we can't fully validate but check constraints
	if (d3 === undefined) {
		// If both operands are assigned, we can check if the expected result digit is available
		if (d1 !== undefined && d2 !== undefined) {
			const sum = d1 + d2 + carryIn;
			const expectedDigit = sum % 10;
			const expectedCarry = Math.floor(sum / 10);

			// If expectedDigit is already used by another letter, invalid
			if (
				state.digitToLetter[expectedDigit] !== undefined &&
				state.digitToLetter[expectedDigit] !== c3
			) {
				return { valid: false, carryOut: 0 };
			}

			return { valid: true, carryOut: expectedCarry };
		}
		// Can't fully validate yet
		return { valid: true, carryOut: 0 };
	}

	// Result digit is known - check if operands match
	if (d1 !== undefined && d2 !== undefined) {
		const sum = d1 + d2 + carryIn;
		const expectedDigit = sum % 10;
		const expectedCarry = Math.floor(sum / 10);

		if (d3 !== expectedDigit) {
			return { valid: false, carryOut: 0 };
		}

		return { valid: true, carryOut: expectedCarry };
	}

	// Can't fully validate yet (some operands missing)
	return { valid: true, carryOut: 0 };
}

// Check column constraint for subtraction with borrow propagation
function checkColumnSubtraction(
	w1: string,
	w2: string,
	w3: string,
	col: number,
	state: CryptarithmSolverState,
	borrowIn: number,
): { valid: boolean; borrowOut: number } {
	const c1 = getCharAt(w1, col);
	const c2 = getCharAt(w2, col);
	const c3 = getCharAt(w3, col);

	// If we're past all words, check if borrow is 0
	if (!c1 && !c2 && !c3) {
		return { valid: borrowIn === 0, borrowOut: 0 };
	}

	const d1 = c1 ? state.letterToDigit[c1] : undefined;
	const d2 = c2 ? state.letterToDigit[c2] : undefined;
	const d3 = c3 ? state.letterToDigit[c3] : undefined;

	// If result letter is not assigned, we can't fully validate
	if (d3 === undefined) {
		if (d1 === undefined || d2 === undefined) {
			return { valid: true, borrowOut: 0 };
		}

		// Check if subtraction is possible
		const diff = d1 - d2 - borrowIn;
		if (diff < 0) {
			// Need to borrow - check if it's possible
			const borrowedDiff = d1 + 10 - d2 - borrowIn;
			const expectedDigit = borrowedDiff % 10;
			const expectedBorrow = 1;

			if (
				state.digitToLetter[expectedDigit] !== undefined &&
				state.digitToLetter[expectedDigit] !== c3
			) {
				return { valid: false, borrowOut: 0 };
			}

			return { valid: true, borrowOut: expectedBorrow };
		}

		const expectedDigit = diff % 10;
		if (
			state.digitToLetter[expectedDigit] !== undefined &&
			state.digitToLetter[expectedDigit] !== c3
		) {
			return { valid: false, borrowOut: 0 };
		}

		return { valid: true, borrowOut: 0 };
	}

	// All three digits are known
	if (d1 === undefined || d2 === undefined) {
		return { valid: true, borrowOut: 0 };
	}

	let diff = d1 - d2 - borrowIn;
	let borrowOut = 0;

	if (diff < 0) {
		diff += 10;
		borrowOut = 1;
	}

	if (d3 !== diff) {
		return { valid: false, borrowOut: 0 };
	}

	return { valid: true, borrowOut };
}

// Check if partial assignment is valid using column-wise validation
function isValidPartial(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
	state: CryptarithmSolverState,
): boolean {
	const maxLen = Math.max(w1.length, w2.length, w3.length);

	if (operation === "+") {
		let carry = 0;
		for (let col = 0; col < maxLen; col++) {
			const result = checkColumnAddition(w1, w2, w3, col, state, carry);
			if (!result.valid) {
				return false;
			}
			carry = result.carryOut;
		}
		// Check final carry
		return carry === 0;
	}
	let borrow = 0;
	for (let col = 0; col < maxLen; col++) {
		const result = checkColumnSubtraction(w1, w2, w3, col, state, borrow);
		if (!result.valid) {
			return false;
		}
		borrow = result.borrowOut;
	}
	// Check final borrow
	return borrow === 0;
}

// Order letters by constraint (most constrained first)
function orderLettersByConstraint(
	letters: string[],
	w1: string,
	w2: string,
	w3: string,
	leadingLetters: Set<string>,
): string[] {
	// Count how many times each letter appears
	const frequency: Record<string, number> = {};
	for (const letter of letters) {
		frequency[letter] = 0;
	}
	for (const ch of w1 + w2 + w3) {
		if (frequency[ch] !== undefined) {
			frequency[ch]++;
		}
	}

	// Sort: leading letters first, then by frequency (most frequent first)
	return [...letters].sort((a, b) => {
		const aIsLeading = leadingLetters.has(a) ? 1 : 0;
		const bIsLeading = leadingLetters.has(b) ? 1 : 0;
		if (aIsLeading !== bIsLeading) {
			return bIsLeading - aIsLeading;
		}
		return (frequency[b] ?? 0) - (frequency[a] ?? 0);
	});
}

// Backtracking solver with depth limit and early pruning
function solveCryptarithmBacktrack(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
	state: CryptarithmSolverState,
	letterIndex: number,
): boolean {
	// Depth limit to prevent infinite loops
	if (state.currentDepth > state.maxDepth) {
		return false;
	}
	state.currentDepth++;

	// Base case: all letters assigned
	if (letterIndex >= state.letters.length) {
		state.currentDepth--;
		return isValidPartial(w1, w2, w3, operation, state);
	}

	const currentLetter = state.letters[letterIndex];
	if (currentLetter === undefined) {
		state.currentDepth--;
		return false;
	}

	// If already assigned, move to next
	if (state.letterToDigit[currentLetter] !== undefined) {
		const result = solveCryptarithmBacktrack(
			w1,
			w2,
			w3,
			operation,
			state,
			letterIndex + 1,
		);
		state.currentDepth--;
		return result;
	}

	// Try each digit (prioritize non-zero for leading letters)
	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
	if (state.leadingLetters.has(currentLetter)) {
		// Leading letters: try 1-9 first
		digits.splice(9, 1); // Remove 0
		digits.push(0); // Add 0 at end (won't be used)
	}

	for (const digit of digits) {
		// Leading letters can't be 0
		if (digit === 0 && state.leadingLetters.has(currentLetter)) {
			continue;
		}

		// Digit already used
		if (state.digitToLetter[digit] !== undefined) {
			continue;
		}

		// Try this assignment
		state.letterToDigit[currentLetter] = digit;
		state.digitToLetter[digit] = currentLetter;

		// Early pruning with column-wise validation
		if (isValidPartial(w1, w2, w3, operation, state)) {
			// Recurse
			const solved = solveCryptarithmBacktrack(
				w1,
				w2,
				w3,
				operation,
				state,
				letterIndex + 1,
			);
			if (solved) {
				state.currentDepth--;
				return true;
			}
		}

		// Backtrack
		delete state.letterToDigit[currentLetter];
		delete state.digitToLetter[digit];
	}

	state.currentDepth--;
	return false;
}

// Main solver function with timeout protection
export function solveCryptarithm(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
): Record<string, number> | null {
	// Get all unique letters
	const allLettersSet = new Set<string>();
	for (const ch of w1 + w2 + w3) {
		allLettersSet.add(ch);
	}
	const letters = Array.from(allLettersSet);

	// Leading letters can't be 0
	const leadingLetters = new Set<string>();
	if (w1[0]) leadingLetters.add(w1[0]);
	if (w2[0]) leadingLetters.add(w2[0]);
	if (w3[0]) leadingLetters.add(w3[0]);

	// Order letters by constraint (most constrained first)
	const orderedLetters = orderLettersByConstraint(
		letters,
		w1,
		w2,
		w3,
		leadingLetters,
	);

	const state: CryptarithmSolverState = {
		letterToDigit: {},
		digitToLetter: {},
		letters: orderedLetters,
		leadingLetters,
		maxDepth: 1000, // Limit search depth
		currentDepth: 0,
	};

	// Try with ordered letters (most constrained first)
	if (solveCryptarithmBacktrack(w1, w2, w3, operation, state, 0)) {
		return state.letterToDigit;
	}

	// If that fails, try a few random orderings (but limit attempts)
	const maxAttempts = 3;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const shuffledLetters = [...letters].sort(() => Math.random() - 0.5);
		state.letters = shuffledLetters;
		state.letterToDigit = {};
		state.digitToLetter = {};
		state.currentDepth = 0;

		if (solveCryptarithmBacktrack(w1, w2, w3, operation, state, 0)) {
			return state.letterToDigit;
		}
	}

	return null;
}
