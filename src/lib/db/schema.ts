import { pgTable, uuid, text, timestamp, integer, jsonb, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Bookmarks table
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  questionData: jsonb('question_data').notNull(),
  eventName: text('event_name').notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Game points table
export const gamePoints = pgTable('game_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  points: integer('points').notNull(), // Note: DB has bigint, but we'll use integer for compatibility
  source: text('source').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User stats table
export const userStats = pgTable('user_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  date: text('date').notNull(),
  questionsAttempted: integer('questions_attempted').default(0).notNull(), // Note: DB has bigint
  correctAnswers: integer('correct_answers').default(0).notNull(), // Note: DB has bigint
  eventsPracticed: jsonb('events_practiced').default('[]').notNull(),
  eventQuestions: jsonb('event_questions').default('{}').notNull(),
  gamePoints: integer('game_points').default(0).notNull(), // Note: DB has bigint
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey(),
  question: text('question').notNull(),
  tournament: text('tournament').notNull(),
  division: text('division').notNull(),
  options: jsonb('options').default('[]'),
  answers: jsonb('answers').notNull(),
  subtopics: jsonb('subtopics').default('[]'),
  difficulty: numeric('difficulty').default('0.5'),
  event: text('event').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Quotes table
export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  author: text('author').notNull(),
  quote: text('quote').notNull(),
  language: text('language').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Share codes table
export const shareCodes = pgTable('share_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  indices: jsonb('indices'),
  testParamsRaw: jsonb('test_params_raw').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations (for future use if needed)
export const bookmarksRelations = relations(bookmarks, () => ({
  // user: one('users', {
  //   fields: [bookmarks.userId],
  //   references: [users.id],
  // }),
}));

export const gamePointsRelations = relations(gamePoints, () => ({
  // user: one('users', {
  //   fields: [gamePoints.userId],
  //   references: [users.id],
  // }),
}));

export const userStatsRelations = relations(userStats, () => ({
  // user: one('users', {
  //   fields: [userStats.userId],
  //   references: [users.id],
  // }),
})); 