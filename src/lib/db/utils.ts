import { eq, desc, inArray, gte, lt, and, sql } from 'drizzle-orm';
import { db } from './index';
import { quotes } from './schema';

// Note: Bookmarks, game points, and user stats are handled in Supabase now.

// Quotes operations
export async function getQuotesByLanguage(language: string, limit?: number) {
  // Use indexed-random selection on (language, random_f)
  const maxLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 200) : 50;
  const r = Math.random();

  try {
    const first = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.language, language), gte(quotes.randomF, r)))
      .orderBy(quotes.randomF)
      .limit(maxLimit);

    if (first.length >= maxLimit) {
      return first;
    }

    const remaining = maxLimit - first.length;
    const second = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.language, language), lt(quotes.randomF, r)))
      .orderBy(quotes.randomF)
      .limit(remaining);

    return [...first, ...second];
  } catch (err) {
    console.log('Error fetching quotes', err);
    // Fallback while migrations roll out: random() sort
    const rows = await db
      .select()
      .from(quotes)
      .where(eq(quotes.language, language))
      .orderBy(sql`RANDOM()`) 
      .limit(maxLimit);
    return rows;
  }
}

export async function getQuotesByIndices(indices: number[], language: string) {
  const allQuotes = await getQuotesByLanguage(language);
  
  // Filter quotes by the provided indices
  return indices
    .map(index => allQuotes[index])
    .filter(Boolean);
}

export async function getAllQuotes() {
  return await db
    .select()
    .from(quotes)
    .orderBy(desc(quotes.createdAt));
}

export async function getQuotesByUUIDs(uuids: string[]) {
  if (uuids.length === 0) return [];
  
  return await db
    .select()
    .from(quotes)
    .where(inArray(quotes.id, uuids));
} 