import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./index";
import { quotes } from "./schema";

export async function getQuotesByLanguage(
  language: string,
  limit?: number,
  charLengthRange?: { min: number; max: number }
) {
  const maxLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 200) : 50;

  try {
    let baseCondition = eq(quotes.language, language);

    if (charLengthRange) {
      baseCondition = and(
        baseCondition,
        gte(quotes.charLength, charLengthRange.min),
        lte(quotes.charLength, Math.min(charLengthRange.max, 100))
      )!;
    }

    /*
    const rows = await db
      .select()
      .from(quotes)
      .where(baseCondition)
      .orderBy(sql`RANDOM()`)
      .limit(maxLimit);
    return rows;
    */

    const numBatches = Math.min(5, maxLimit);
    const batchSize = Math.ceil(maxLimit / numBatches);
    const allRows: any[] = [];

    for (let i = 0; i < numBatches && allRows.length < maxLimit; i++) {
      const randomStart = Math.random();
      const needed = Math.min(batchSize, maxLimit - allRows.length);

      const batchRows = await db
        .select()
        .from(quotes)
        .where(and(baseCondition, gte(quotes.randomF, randomStart)))
        .orderBy(quotes.randomF)
        .limit(needed);

      allRows.push(...batchRows);
    }

    for (let i = allRows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allRows[i], allRows[j]] = [allRows[j], allRows[i]];
    }

    return allRows.slice(0, maxLimit);
  } catch {
    // Fallback to simpler query if optimized query fails
    let fallbackCondition = eq(quotes.language, language);

    if (charLengthRange && charLengthRange.min <= 100) {
      fallbackCondition = and(
        fallbackCondition,
        gte(quotes.charLength, charLengthRange.min),
        lte(quotes.charLength, Math.min(charLengthRange.max, 100))
      )!;
    }

    const rows = await db
      .select()
      .from(quotes)
      .where(fallbackCondition)
      .orderBy(sql`RANDOM()`)
      .limit(maxLimit);
    return rows;
  }
}

// Removed unused exports: getQuotesByIndices, getAllQuotes, getQuotesByUUIDs, getAllLongQuotes, getLongQuotesByLanguage, getQuoteStats
