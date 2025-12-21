// Cryptarithm solver that ensures exactly ONE unique solution
// Adapted from Python script to TypeScript

interface Assignment {
	[key: string]: number;
}

interface SolverState {
	assign: Assignment;
	used: Set<number>;
}

// Get character at position from right (0 = rightmost)
function getCharAt(w: string, col: number): string | undefined {
	const idx = w.length - 1 - col;
	return idx >= 0 ? w[idx] : undefined;
}

// Get leading letters (first character of each word)
function getLeadingLetters(words: string[]): Set<string> {
	const leading = new Set<string>();
	for (const w of words) {
		if (w.length > 0) {
			leading.add(w[0] ?? "");
		}
	}
	return leading;
}

// Get all unique letters from words
function getLettersIn(words: string[]): string[] {
	const s = new Set<string>();
	for (const w of words) {
		for (const ch of w) {
			s.add(ch);
		}
	}
	return Array.from(s).sort();
}

// Solve addition with uniqueness check
export function solveAddUnique(
	a: string,
	b: string,
	c: string,
	maxSolutions = 2,
): Assignment[] {
	const words = [a, b, c];
	const letters = getLettersIn(words);
	if (letters.length > 10) {
		return [];
	}

	const leading = getLeadingLetters(words);
	// maxCols is the maximum of all three words (matching Python script)
	const maxCols = Math.max(a.length, b.length, c.length);

	const solutions: Assignment[] = [];
	const state: SolverState = {
		assign: {},
		used: new Set(),
	};

	function possibleDigits(letter: string): number[] {
		const digits: number[] = [];
		for (let d = 0; d < 10; d++) {
			if (state.used.has(d)) {
				continue;
			}
			if (leading.has(letter) && d === 0) {
				continue;
			}
			digits.push(d);
		}
		return digits;
	}

	function rec(col: number, carry: number): void {
		if (solutions.length >= maxSolutions) {
			return;
		}

		if (col >= maxCols) {
			// All columns processed - carry must be 0 (matching Python script)
			if (carry === 0) {
				solutions.push({ ...state.assign });
			}
			return;
		}

		const la = getCharAt(a, col);
		const lb = getCharAt(b, col);
		const lc = getCharAt(c, col);

		const da = la ? state.assign[la] : undefined;
		const db = lb ? state.assign[lb] : undefined;
		const dc = lc ? state.assign[lc] : undefined;

		// Build list of unassigned letters in this column
		const colLetters: string[] = [];
		if (la && state.assign[la] === undefined) {
			colLetters.push(la);
		}
		if (lb && state.assign[lb] === undefined && !colLetters.includes(lb)) {
			colLetters.push(lb);
		}
		if (lc && state.assign[lc] === undefined && !colLetters.includes(lc)) {
			colLetters.push(lc);
		}

		// If all digits are known, check constraint
		if (colLetters.length === 0) {
			if (!lc) {
				// No output digit here; sum%10 must be 0
				const va = da ?? 0;
				const vb = db ?? 0;
				const s = va + vb + carry;
				if (s % 10 !== 0) {
					return;
				}
				rec(col + 1, Math.floor(s / 10));
				return;
			}

			// All three digits known - check if they match
			const va = da ?? 0;
			const vb = db ?? 0;
			const vc = dc ?? 0;
			const s = va + vb + carry;
			if (s % 10 !== vc) {
				return;
			}
			rec(col + 1, Math.floor(s / 10));
			return;
		}

		// Assign missing letters in this column
		function tryAssign(i: number): void {
			if (solutions.length >= maxSolutions) {
				return;
			}
			if (i === colLetters.length) {
				// After assignments, verify and recurse
				if (!lc) {
					const va = la ? (state.assign[la] ?? 0) : 0;
					const vb = lb ? (state.assign[lb] ?? 0) : 0;
					const s = va + vb + carry;
					if (s % 10 !== 0) {
						return;
					}
					rec(col + 1, Math.floor(s / 10));
					return;
				}

				const va = la ? (state.assign[la] ?? 0) : 0;
				const vb = lb ? (state.assign[lb] ?? 0) : 0;
				const vc = lc ? (state.assign[lc] ?? 0) : 0;
				const s = va + vb + carry;
				if (s % 10 !== vc) {
					return;
				}
				rec(col + 1, Math.floor(s / 10));
				return;
			}

			const L = colLetters[i];
			if (L === undefined) {
				return;
			}

			const digits = possibleDigits(L);
			for (const d of digits) {
				state.assign[L] = d;
				state.used.add(d);
				tryAssign(i + 1);
				state.used.delete(d);
				delete state.assign[L];
				if (solutions.length >= maxSolutions) {
					return;
				}
			}
		}

		tryAssign(0);
	}

	rec(0, 0);
	return solutions;
}

// Solve subtraction with uniqueness check
export function solveSubUnique(
	m: string,
	s: string,
	d: string,
	maxSolutions = 2,
): Assignment[] {
	const words = [m, s, d];
	const letters = getLettersIn(words);
	if (letters.length > 10) {
		return [];
	}

	const leading = getLeadingLetters(words);
	const maxCols = Math.max(m.length, s.length, d.length);

	const solutions: Assignment[] = [];
	const state: SolverState = {
		assign: {},
		used: new Set(),
	};

	function possibleDigits(letter: string): number[] {
		const digits: number[] = [];
		for (let dgt = 0; dgt < 10; dgt++) {
			if (state.used.has(dgt)) {
				continue;
			}
			if (leading.has(letter) && dgt === 0) {
				continue;
			}
			digits.push(dgt);
		}
		return digits;
	}

	function rec(col: number, borrow: number): void {
		if (solutions.length >= maxSolutions) {
			return;
		}

		if (col >= maxCols) {
			if (borrow === 0) {
				solutions.push({ ...state.assign });
			}
			return;
		}

		const lm = getCharAt(m, col);
		const ls = getCharAt(s, col);
		const ld = getCharAt(d, col);

		// vm, vs, vd are assigned but not used - kept for clarity
		// const vm = lm ? state.assign[lm] : undefined;
		// const vs = ls ? state.assign[ls] : undefined;
		// const vd = ld ? state.assign[ld] : undefined;

		const colLetters: string[] = [];
		if (lm && state.assign[lm] === undefined) {
			colLetters.push(lm);
		}
		if (ls && state.assign[ls] === undefined && !colLetters.includes(ls)) {
			colLetters.push(ls);
		}
		if (ld && state.assign[ld] === undefined && !colLetters.includes(ld)) {
			colLetters.push(ld);
		}

		function checkAndNext(): number | null {
			const a = lm ? (state.assign[lm] ?? 0) : 0;
			const b = ls ? (state.assign[ls] ?? 0) : 0;
			const c = ld ? (state.assign[ld] ?? 0) : 0;

			let temp = a - b - borrow;
			let borrowOut = 0;
			if (temp < 0) {
				temp += 10;
				borrowOut = 1;
			}

			// If output digit missing, it must be 0
			if (!ld) {
				if (temp !== 0) {
					return null;
				}
				return borrowOut;
			}

			if (temp !== c) {
				return null;
			}
			return borrowOut;
		}

		if (colLetters.length === 0) {
			const bo = checkAndNext();
			if (bo !== null) {
				rec(col + 1, bo);
			}
			return;
		}

		function tryAssign(i: number): void {
			if (solutions.length >= maxSolutions) {
				return;
			}
			if (i === colLetters.length) {
				const bo = checkAndNext();
				if (bo !== null) {
					rec(col + 1, bo);
				}
				return;
			}

			const L = colLetters[i];
			if (L === undefined) {
				return;
			}

			const digits = possibleDigits(L);
			for (const dgt of digits) {
				state.assign[L] = dgt;
				state.used.add(dgt);
				tryAssign(i + 1);
				state.used.delete(dgt);
				delete state.assign[L];
				if (solutions.length >= maxSolutions) {
					return;
				}
			}
		}

		tryAssign(0);
	}

	rec(0, 0);
	return solutions;
}

// Check if a cryptarithm has exactly one unique solution
export function hasUniqueSolution(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
): boolean {
	if (operation === "+") {
		const solutions = solveAddUnique(w1, w2, w3, 2);
		return solutions.length === 1;
	}
	const solutions = solveSubUnique(w1, w2, w3, 2);
	return solutions.length === 1;
}

// Get the unique solution if it exists
export function getUniqueSolution(
	w1: string,
	w2: string,
	w3: string,
	operation: "+" | "-",
): Assignment | null {
	if (operation === "+") {
		const solutions = solveAddUnique(w1, w2, w3, 2);
		return solutions.length === 1 ? (solutions[0] ?? null) : null;
	}
	const solutions = solveSubUnique(w1, w2, w3, 2);
	return solutions.length === 1 ? (solutions[0] ?? null) : null;
}
