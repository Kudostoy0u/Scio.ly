import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./index";
import { longquotes, quotes } from "./schema";

export async function getQuotesByLanguage(
	language: string,
	limit?: number,
	charLengthRange?: { min: number; max: number },
) {
	console.log("[getQuotesByLanguage] Starting:", {
		language,
		limit,
		charLengthRange,
	});

	const maxLimit =
		typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50;

	console.log("[getQuotesByLanguage] Max limit:", maxLimit);

	// Determine which table(s) to query based on character length range
	// If no range specified, default to quotes table (original behavior)
	// If max <= 100, query only quotes
	// If min > 100, query only longquotes
	// If min <= 100 and max > 100, query both tables
	const useBoth =
		charLengthRange && charLengthRange.min <= 100 && charLengthRange.max > 100;
	const useQuotes = !charLengthRange || charLengthRange.max <= 100 || useBoth;
	const useLongquotes =
		(charLengthRange && charLengthRange.min > 100) || useBoth;

	console.log("[getQuotesByLanguage] Table selection:", {
		useQuotes,
		useLongquotes,
		useBoth,
	});

	try {
		const allRows: unknown[] = [];

		// Query quotes table if needed (for quotes <= 100 chars)
		if (useQuotes || useBoth) {
			let quotesCondition = eq(quotes.language, language);
			console.log("[getQuotesByLanguage] Querying quotes table");

			if (charLengthRange) {
				const minLength = charLengthRange.min;
				const maxLength = useBoth ? 100 : charLengthRange.max;
				console.log("[getQuotesByLanguage] Quotes char length filter:", {
					min: minLength,
					max: maxLength,
				});
				quotesCondition = and(
					quotesCondition,
					gte(quotes.charLength, minLength),
					lte(quotes.charLength, maxLength),
				) as NonNullable<typeof quotesCondition>;
			}

			const numBatches = Math.min(5, maxLimit);
			const batchSize = Math.ceil(maxLimit / numBatches);

			console.log("[getQuotesByLanguage] Quotes batch strategy:", {
				numBatches,
				batchSize,
			});

			for (let i = 0; i < numBatches && allRows.length < maxLimit; i++) {
				const randomStart = Math.random();
				const needed = Math.min(batchSize, maxLimit - allRows.length);

				console.log("[getQuotesByLanguage] Quotes batch", i + 1, ":", {
					randomStart,
					needed,
					currentCount: allRows.length,
				});

				const batchRows = await db
					.select()
					.from(quotes)
					.where(and(quotesCondition, gte(quotes.randomF, randomStart)))
					.orderBy(quotes.randomF)
					.limit(needed);

				console.log("[getQuotesByLanguage] Quotes batch", i + 1, "result:", {
					count: batchRows.length,
				});

				allRows.push(...batchRows);
			}
		}

		// Query longquotes table if needed (for quotes > 100 chars)
		if (useLongquotes || useBoth) {
			let longquotesCondition = eq(longquotes.language, language);
			console.log("[getQuotesByLanguage] Querying longquotes table");

			if (charLengthRange) {
				const minLength = useBoth ? 101 : charLengthRange.min;
				const maxLength = charLengthRange.max;
				console.log("[getQuotesByLanguage] Longquotes char length filter:", {
					min: minLength,
					max: maxLength,
				});
				longquotesCondition = and(
					longquotesCondition,
					gte(longquotes.charLength, minLength),
					lte(longquotes.charLength, maxLength),
				) as NonNullable<typeof longquotesCondition>;
			}

			const remainingLimit = maxLimit - allRows.length;
			if (remainingLimit > 0) {
				const numBatches = Math.min(5, remainingLimit);
				const batchSize = Math.ceil(remainingLimit / numBatches);

				console.log("[getQuotesByLanguage] Longquotes batch strategy:", {
					numBatches,
					batchSize,
					remainingLimit,
				});

				for (let i = 0; i < numBatches && allRows.length < maxLimit; i++) {
					const randomStart = Math.random();
					const needed = Math.min(batchSize, maxLimit - allRows.length);

					console.log("[getQuotesByLanguage] Longquotes batch", i + 1, ":", {
						randomStart,
						needed,
						currentCount: allRows.length,
					});

					const batchRows = await db
						.select()
						.from(longquotes)
						.where(
							and(longquotesCondition, gte(longquotes.randomF, randomStart)),
						)
						.orderBy(longquotes.randomF)
						.limit(needed);

					console.log(
						"[getQuotesByLanguage] Longquotes batch",
						i + 1,
						"result:",
						{
							count: batchRows.length,
						},
					);

					allRows.push(...batchRows);
				}
			}
		}

		console.log(
			"[getQuotesByLanguage] Total rows before shuffle:",
			allRows.length,
		);

		for (let i = allRows.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[allRows[i], allRows[j]] = [allRows[j], allRows[i]];
		}

		const result = allRows.slice(0, maxLimit);
		console.log("[getQuotesByLanguage] Success:", {
			resultCount: result.length,
		});

		return result;
	} catch (error) {
		console.error("[getQuotesByLanguage] Error in optimized query:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			name: error instanceof Error ? error.name : typeof error,
		});

		// Fallback to simpler query if optimized query fails
		console.log("[getQuotesByLanguage] Attempting fallback query...");

		try {
			const fallbackRows: unknown[] = [];

			// Fallback: Query quotes table if needed
			if (useQuotes || useBoth) {
				let fallbackQuotesCondition = eq(quotes.language, language);

				if (charLengthRange) {
					const minLength = charLengthRange.min;
					const maxLength = useBoth ? 100 : charLengthRange.max;
					fallbackQuotesCondition = and(
						fallbackQuotesCondition,
						gte(quotes.charLength, minLength),
						lte(quotes.charLength, maxLength),
					) as NonNullable<typeof fallbackQuotesCondition>;
				}

				console.log("[getQuotesByLanguage] Executing fallback quotes query...");
				const quotesRows = await db
					.select()
					.from(quotes)
					.where(fallbackQuotesCondition)
					.orderBy(sql`RANDOM()`)
					.limit(maxLimit);

				fallbackRows.push(...quotesRows);
			}

			// Fallback: Query longquotes table if needed
			if ((useLongquotes || useBoth) && fallbackRows.length < maxLimit) {
				let fallbackLongquotesCondition = eq(longquotes.language, language);

				if (charLengthRange) {
					const minLength = useBoth ? 101 : charLengthRange.min;
					const maxLength = charLengthRange.max;
					fallbackLongquotesCondition = and(
						fallbackLongquotesCondition,
						gte(longquotes.charLength, minLength),
						lte(longquotes.charLength, maxLength),
					) as NonNullable<typeof fallbackLongquotesCondition>;
				}

				console.log(
					"[getQuotesByLanguage] Executing fallback longquotes query...",
				);
				const longquotesRows = await db
					.select()
					.from(longquotes)
					.where(fallbackLongquotesCondition)
					.orderBy(sql`RANDOM()`)
					.limit(maxLimit - fallbackRows.length);

				fallbackRows.push(...longquotesRows);
			}

			// Shuffle fallback results
			for (let i = fallbackRows.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[fallbackRows[i], fallbackRows[j]] = [fallbackRows[j], fallbackRows[i]];
			}

			const result = fallbackRows.slice(0, maxLimit);
			console.log("[getQuotesByLanguage] Fallback query success:", {
				count: result.length,
			});

			return result;
		} catch (fallbackError) {
			console.error("[getQuotesByLanguage] Fallback query also failed:", {
				message:
					fallbackError instanceof Error
						? fallbackError.message
						: "Unknown error",
				stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
				name:
					fallbackError instanceof Error
						? fallbackError.name
						: typeof fallbackError,
			});
			throw fallbackError;
		}
	}
}

// Removed unused exports: getQuotesByIndices, getAllQuotes, getQuotesByUUIDs, getAllLongQuotes, getLongQuotesByLanguage, getQuoteStats
