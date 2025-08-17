import { pgTable, uuid, text, timestamp, jsonb, numeric, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Quotes table
export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  author: text('author').notNull(),
  quote: text('quote').notNull(),
  language: text('language').notNull(),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
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

// Edits table
export const edits = pgTable('edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  event: text('event').notNull(),
  originalQuestion: jsonb('original_question').notNull(),
  editedQuestion: jsonb('edited_question').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Blacklists table
export const blacklists = pgTable('blacklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  event: text('event').notNull(),
  questionData: jsonb('question_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ID Events table (image-based identification questions)
export const idEvents = pgTable('id_events', {
  id: uuid('id').primaryKey(),
  question: text('question').notNull(),
  tournament: text('tournament').notNull(),
  division: text('division').notNull(),
  options: jsonb('options').default('[]'),
  answers: jsonb('answers').notNull(),
  subtopics: jsonb('subtopics').default('[]'),
  difficulty: numeric('difficulty').default('0.5'),
  event: text('event').notNull(),
  images: jsonb('images').default('[]').notNull(),
  randomF: doublePrecision('random_f').notNull().default(sql`random()`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Base52 codes table for efficient question lookups
export const base52Codes = pgTable('base52_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  questionId: uuid('question_id').notNull(),
  tableName: text('table_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
 