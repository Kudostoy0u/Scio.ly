/**
 * Strict types for difficulty values
 * Ensures difficulty is always a valid number between 0 and 1
 */

export type DifficultyValue = number;

export const DIFFICULTY_CONSTRAINTS = {
	MIN: 0,
	MAX: 1,
	DEFAULT: 0.5,
} as const;

/**
 * Validates that a difficulty value is within valid range
 * @param value - The difficulty value to validate
 * @returns The validated difficulty value
 * @throws Error if value is invalid
 */
export function validateDifficulty(value: unknown): DifficultyValue {
	if (typeof value !== "number") {
		throw new Error(
			`Invalid difficulty type: expected number, got ${typeof value}. Value: ${JSON.stringify(value)}`,
		);
	}

	if (Number.isNaN(value)) {
		throw new Error(
			`Invalid difficulty value: NaN. Original value: ${JSON.stringify(value)}`,
		);
	}

	if (
		value < DIFFICULTY_CONSTRAINTS.MIN ||
		value > DIFFICULTY_CONSTRAINTS.MAX
	) {
		throw new Error(
			`Invalid difficulty range: ${value}. Must be between ${DIFFICULTY_CONSTRAINTS.MIN} and ${DIFFICULTY_CONSTRAINTS.MAX}`,
		);
	}

	return value;
}

/**
 * Converts a string difficulty to a number with strict validation
 * @param value - The string difficulty value
 * @returns The validated difficulty number
 * @throws Error if conversion fails or value is invalid
 */
export function parseDifficulty(
	value: string | number | null | undefined,
): DifficultyValue {
	if (value === null || value === undefined) {
		throw new Error(
			"Missing difficulty value. Cannot use fallback - difficulty is required.",
		);
	}

	if (typeof value === "number") {
		return validateDifficulty(value);
	}

	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		if (Number.isNaN(parsed)) {
			throw new Error(
				`Failed to parse difficulty string: "${value}". Cannot convert to number.`,
			);
		}
		return validateDifficulty(parsed);
	}

	throw new Error(
		`Invalid difficulty type: expected string or number, got ${typeof value}. Value: ${JSON.stringify(value)}`,
	);
}
