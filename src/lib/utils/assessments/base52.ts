/** Base52 alphabet containing uppercase and lowercase letters */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** Base52 radix (52 characters) */
const BASE = ALPHABET.length; // 52
/** Core identifier length (4 characters) */
const CORE_LENGTH = 4; // 4 letters for the core identifier

/**
 * Encodes a number to Base52 string
 * Converts numeric index to URL-safe string using 52-character alphabet
 *
 * @param {number} index - Numeric index to encode
 * @returns {string} Base52 encoded string (4 characters)
 * @example
 * ```typescript
 * const encoded = encodeBase52(12345);
 * console.log(encoded); // "ABCd"
 * ```
 */
export function encodeBase52(index: number): string {
	let n = index;
	let out = "";
	for (let i = 0; i < CORE_LENGTH; i++) {
		out = ALPHABET[n % BASE] + out;
		n = Math.floor(n / BASE);
	}
	return out;
}

/**
 * Decodes a Base52 string to number
 * Converts Base52 string back to numeric index
 *
 * @param {string} core - Base52 encoded string (4 characters)
 * @returns {number} Decoded numeric index
 * @throws {Error} When core is not 4 characters or contains invalid characters
 * @example
 * ```typescript
 * const decoded = decodeBase52("ABCd");
 * console.log(decoded); // 12345
 * ```
 */
export function decodeBase52(core: string): number {
	if (typeof core !== "string" || core.length !== CORE_LENGTH) {
		throw new Error("Code core must be 4 characters");
	}
	let value = 0;
	for (const c of core) {
		if (c === undefined) {
			throw new Error("Invalid base52 character");
		}
		const digit = ALPHABET.indexOf(c);
		if (digit === -1) {
			throw new Error("Invalid base52 character");
		}
		value = value * BASE + digit;
	}
	return value;
}

/**
 * Generates a unique Base52 code for a question
 * Creates URL-safe identifiers for question sharing
 *
 * @param {string} questionId - UUID of the question
 * @param {'questions' | 'idEvents'} [table='questions'] - Database table name
 * @returns {Promise<string>} Unique 5-character Base52 code (4 chars + type suffix)
 * @throws {Error} When question not found or code generation fails
 * @example
 * ```typescript
 * const code = await generateQuestionCode('uuid-123', 'questions');
 * console.log(code); // "ABCdS" (S for questions table)
 * ```
 */
