import { eq, desc, sql, inArray } from 'drizzle-orm';
import { db } from './index';
import { quotes } from './schema';

// Note: Bookmarks, game points, and user stats are handled in Supabase now.

// Quotes operations
export async function getQuotesByLanguage(language: string, limit?: number) {
  // Get total count first to determine how many to fetch
  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(eq(quotes.language, language));
  
  const total = totalCount[0]?.count || 0;
  
  if (total === 0) {
    console.log(`❌ No ${language} quotes found`);
    return [];
  }
  
  // If no limit specified or limit is greater than total, return all
  if (!limit || limit >= total) {
    const allQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.language, language));
    
    // Shuffle the quotes to randomize the order
    const shuffledQuotes = [...allQuotes].sort(() => Math.random() - 0.5);
    
    console.log(`🔀 Randomized ${shuffledQuotes.length} ${language} quotes`);
    
    return shuffledQuotes;
  }
  
  // For smaller limits, use a more efficient approach
  // Fetch a larger sample to ensure we get enough after shuffling
  const sampleSize = Math.min(limit * 3, total); // Fetch up to 3x the limit
  
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.language, language))
    .limit(sampleSize);
  
  // Shuffle and take the first 'limit' items
  const shuffledQuotes = [...allQuotes].sort(() => Math.random() - 0.5).slice(0, limit);
  
  console.log(`🔀 Randomized ${shuffledQuotes.length} ${language} quotes (from ${sampleSize} sample)`);
  
  return shuffledQuotes;
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