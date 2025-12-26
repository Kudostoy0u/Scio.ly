import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "./index";
import { quotes } from "./schema";

/**
 * Get quotes for a single language using efficient random selection.
 * Uses the randomF column with a wrap-around strategy for better distribution.
 */
async function getQuotesForLanguage(
	language: "en" | "es",
	count: number,
	charLengthRange?: { min: number; max: number },
) {
	const r = Math.random();

	// Build the where condition
	let condition = eq(quotes.language, language);
	if (charLengthRange) {
		condition = and(
			condition,
			gte(quotes.charLength, charLengthRange.min),
			lte(quotes.charLength, charLengthRange.max),
		) as NonNullable<typeof condition>;
	}

	// First query: get quotes with randomF >= r
	const first = await db
		.select()
		.from(quotes)
		.where(and(condition, gte(quotes.randomF, r)))
		.orderBy(asc(quotes.randomF))
		.limit(count);

	if (first.length >= count) return first;

	// Second query: wrap around to get remaining quotes with randomF < r
	const second = await db
		.select()
		.from(quotes)
		.where(and(condition, lt(quotes.randomF, r)))
		.orderBy(asc(quotes.randomF))
		.limit(count - first.length);

	return first.concat(second);
}

/**
 * Get quotes by language with optional character length filtering.
 * Simplified version that uses the single quotes table with BTREE index.
 */
export async function getQuotesByLanguage(
	language: string,
	limit?: number,
	charLengthRange?: { min: number; max: number },
) {
	const maxLimit =
		typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50;

	// Validate language
	if (language !== "en" && language !== "es") {
		throw new Error(`Invalid language: ${language}. Must be "en" or "es"`);
	}

	return getQuotesForLanguage(
		language as "en" | "es",
		maxLimit,
		charLengthRange,
	);
}
