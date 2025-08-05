import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { db } from './index';
import { bookmarks, gamePoints, userStats, quotes } from './schema';

// Bookmarks operations
export async function createBookmark(data: {
  userId: string;
  questionData: Record<string, unknown>;
  eventName: string;
  source: string;
}) {
  return await db.insert(bookmarks).values(data).returning();
}

export async function getBookmarksByUserId(userId: string) {
  return await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

export async function deleteBookmark(id: string, userId: string) {
  return await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .returning();
}

// Game points operations
export async function createGamePoint(data: {
  userId: string;
  points: number;
  source: string;
  description?: string;
}) {
  return await db.insert(gamePoints).values(data).returning();
}

export async function getGamePointsByUserId(userId: string) {
  return await db
    .select()
    .from(gamePoints)
    .where(eq(gamePoints.userId, userId))
    .orderBy(desc(gamePoints.createdAt));
}

export async function getTotalGamePointsByUserId(userId: string) {
  const result = await db
    .select({ total: sql<number>`sum(${gamePoints.points})` })
    .from(gamePoints)
    .where(eq(gamePoints.userId, userId));
  
  return result[0]?.total || 0;
}

// User stats operations
export async function createUserStat(data: {
  userId: string;
  date: string;
  questionsAttempted?: number;
  correctAnswers?: number;
  eventsPracticed?: Record<string, unknown>[];
  eventQuestions?: Record<string, unknown>;
  gamePoints?: number;
}) {
  return await db.insert(userStats).values(data).returning();
}

export async function getUserStatsByUserId(userId: string) {
  return await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .orderBy(desc(userStats.date));
}

export async function updateUserStat(
  userId: string,
  date: string,
  updates: Partial<{
    questionsAttempted: number;
    correctAnswers: number;
    eventsPracticed: Record<string, unknown>[];
    eventQuestions: Record<string, unknown>;
    gamePoints: number;
  }>
) {
  return await db
    .update(userStats)
    .set(updates)
    .where(and(eq(userStats.userId, userId), eq(userStats.date, date)))
    .returning();
}

export async function getUserStatByDate(userId: string, date: string) {
  const result = await db
    .select()
    .from(userStats)
    .where(and(eq(userStats.userId, userId), eq(userStats.date, date)));
  
  return result[0] || null;
}

// Utility functions
export async function getBookmarksCount(userId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));
  
  return result[0]?.count || 0;
}

export async function getGamePointsCount(userId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(gamePoints)
    .where(eq(gamePoints.userId, userId));
  
  return result[0]?.count || 0;
}

// Quotes operations
export async function getQuotesByLanguage(language: string) {
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.language, language));
  
  // Shuffle the quotes to randomize the order
  const shuffledQuotes = [...allQuotes].sort(() => Math.random() - 0.5);
  
  console.log(`🔀 Randomized ${shuffledQuotes.length} ${language} quotes`);
  
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