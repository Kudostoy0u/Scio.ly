import { eq, desc, inArray, gte, lte, and, sql } from 'drizzle-orm';
import { db } from './index';
import { quotes, longquotes } from './schema';








export async function getQuotesByLanguage(language: string, limit?: number, charLengthRange?: { min: number; max: number }) {
  const maxLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 200) : 50;

  try {

    if (charLengthRange && charLengthRange.min > 100) {
      return await getLongQuotesByLanguage(language, maxLimit);
    }


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
  } catch (err) {
    console.log('Error fetching quotes', err);

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

export async function getQuotesByIndices(indices: number[], language: string) {
  const allQuotes = await getQuotesByLanguage(language);
  

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


export async function getAllLongQuotes() {
  return await db
    .select()
    .from(longquotes)
    .orderBy(desc(longquotes.createdAt));
}

export async function getLongQuotesByLanguage(language: string, limit?: number) {
  const maxLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 200) : 50;
  
  return await db
    .select()
    .from(longquotes)
    .where(eq(longquotes.language, language))
    .orderBy(sql`RANDOM()`) 
    .limit(maxLimit);
}

export async function getQuoteStats() {
  const mainStats = await db
    .select({
      table: sql<string>`'quotes'`,
      count: sql<number>`COUNT(*)`,
      minLength: sql<number>`MIN(char_length)`,
      maxLength: sql<number>`MAX(char_length)`,
      avgLength: sql<number>`AVG(char_length)`
    })
    .from(quotes);

  const longStats = await db
    .select({
      table: sql<string>`'longquotes'`,
      count: sql<number>`COUNT(*)`,
      minLength: sql<number>`MIN(char_length)`,
      maxLength: sql<number>`MAX(char_length)`,
      avgLength: sql<number>`AVG(char_length)`
    })
    .from(longquotes);

  return [...mainStats, ...longStats];
} 