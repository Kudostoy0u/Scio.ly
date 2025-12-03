import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	doublePrecision,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// ==================== CORE USER & AUTHENTICATION ====================

export const users = pgTable("users", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull().unique(),
	username: text("username").notNull().unique(),
	supabaseUserId: uuid("supabase_user_id").unique(),
	supabaseUsername: text("supabase_username").unique(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	displayName: text("display_name"),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const apiKeyGenerations = pgTable("api_key_generations", {
	id: uuid("id").primaryKey().defaultRandom(),
	ipAddress: text("ip_address").notNull(),
	apiKeyHash: text("api_key_hash").notNull(),
	userId: uuid("user_id").references(() => users.id),
	generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==================== CORE QUESTIONS & CONTENT ====================

export const questions = pgTable("questions", {
	id: uuid("id").primaryKey(),
	question: text("question").notNull(),
	tournament: text("tournament").notNull(),
	division: text("division").notNull(),
	options: jsonb("options").default("[]"),
	answers: jsonb("answers").notNull(),
	subtopics: jsonb("subtopics").default("[]"),
	difficulty: numeric("difficulty").default("0.5"),
	event: text("event").notNull(),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const idEvents = pgTable("id_events", {
	id: uuid("id").primaryKey(),
	question: text("question").notNull(),
	tournament: text("tournament").notNull(),
	division: text("division").notNull(),
	options: jsonb("options").default("[]"),
	answers: jsonb("answers").notNull(),
	subtopics: jsonb("subtopics").default("[]"),
	difficulty: numeric("difficulty").default("0.5"),
	event: text("event").notNull(),
	images: jsonb("images").notNull().default("[]"),
	randomF: doublePrecision("random_f").default(sql`random()`),
	questionType: text("question_type"),
	pureId: boolean("pure_id").default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const quotes = pgTable("quotes", {
	id: uuid("id").primaryKey().defaultRandom(),
	author: text("author").notNull(),
	quote: text("quote").notNull(),
	language: text("language").notNull(),
	charLength: bigint("char_length", { mode: "number" }),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
});

export const longquotes = pgTable("longquotes", {
	id: uuid("id").primaryKey().defaultRandom(),
	author: text("author").notNull(),
	quote: text("quote").notNull(),
	language: text("language").notNull(),
	charLength: bigint("char_length", { mode: "number" }).notNull(),
	randomF: doublePrecision("random_f").notNull().default(sql`random()`),
	createdAt: timestamp("created_at").defaultNow(),
});

export const shareLinks = pgTable("share_links", {
	id: uuid("id").primaryKey().defaultRandom(),
	code: text("code").notNull(),
	indices: jsonb("indices"),
	testParamsRaw: jsonb("test_params_raw").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const base52Codes = pgTable("base52_codes", {
	id: uuid("id").primaryKey().defaultRandom(),
	code: text("code").notNull(),
	questionId: uuid("question_id").notNull(),
	tableName: text("table_name").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

// ==================== CORE CONTENT MANAGEMENT ====================

export const edits = pgTable("edits", {
	id: uuid("id").primaryKey().defaultRandom(),
	event: text("event").notNull(),
	originalQuestion: jsonb("original_question").notNull(),
	editedQuestion: jsonb("edited_question").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const blacklists = pgTable("blacklists", {
	id: uuid("id").primaryKey().defaultRandom(),
	event: text("event").notNull(),
	questionData: jsonb("question_data").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const quoteBlacklists = pgTable("quote_blacklists", {
	id: uuid("id").primaryKey().defaultRandom(),
	quoteData: jsonb("quote_data").notNull(),
	cipherType: text("cipher_type").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const quoteEdits = pgTable("quote_edits", {
	id: uuid("id").primaryKey().defaultRandom(),
	originalQuote: jsonb("original_quote").notNull(),
	editedQuote: jsonb("edited_quote").notNull(),
	cipherType: text("cipher_type").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});
