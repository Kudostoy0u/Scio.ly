import { sql } from "drizzle-orm";
import {
	bool,
	cockroachTable,
	decimal,
	float,
	index,
	int8,
	jsonb,
	string,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/cockroach-core";

export const users = cockroachTable(
	"users",
	{
		id: uuid().primaryKey(),
		email: string().notNull(),
		username: string().notNull(),
		firstName: string("first_name"),
		lastName: string("last_name"),
		displayName: string("display_name"),
		photoUrl: string("photo_url"),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		supabaseUserId: uuid("supabase_user_id"),
		supabaseUsername: string("supabase_username"),
	},
	(table) => [
		uniqueIndex("users_supabase_user_id_unique").on(table.supabaseUserId),
		uniqueIndex("users_supabase_username_unique").on(table.supabaseUsername),
		uniqueIndex("users_username_key").on(table.username),
	],
);

export const apiKeyGenerations = cockroachTable(
	"api_key_generations",
	{
		id: uuid().defaultRandom().primaryKey(),
		ipAddress: string("ip_address").notNull(),
		apiKeyHash: string("api_key_hash").notNull(),
		userId: uuid("user_id"),
		generatedAt: timestamp("generated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_api_key_generations_ip").on(table.ipAddress),
		uniqueIndex("idx_api_key_generations_ip_unique").on(table.ipAddress),
		index("idx_api_key_generations_user").on(table.userId),
	],
);

export const questions = cockroachTable(
	"questions",
	{
		id: uuid().primaryKey(),
		question: string().notNull(),
		tournament: varchar({ length: 255 }).notNull(),
		division: varchar({ length: 10 }).notNull(),
		options: jsonb().default([]),
		answers: jsonb().notNull(),
		subtopics: jsonb().default([]),
		difficulty: decimal({ precision: 3, scale: 2 }).default("0.5"),
		event: varchar({ length: 255 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
		randomF: float("random_f").default(sql`random()`).notNull(),
	},
	(table) => [
		index("idx_questions_difficulty").on(table.difficulty),
		index("idx_questions_division").on(table.division),
		index("idx_questions_event").on(table.event),
		index("idx_questions_event_division").on(table.event, table.division),
		index("idx_questions_event_division_difficulty").on(
			table.event,
			table.division,
			table.difficulty,
		),
		index("idx_questions_subtopics").on(table.subtopics),
		index("idx_questions_tournament").on(table.tournament),
		index("questions_division_random_f_idx").on(table.division, table.randomF),
		index("questions_event_random_f_idx").on(table.event, table.randomF),
		index("questions_question_event_idx").on(table.question, table.event),
		index("questions_random_f_idx").on(table.randomF),
	],
);

export const idEvents = cockroachTable(
	"id_events",
	{
		id: uuid().primaryKey(),
		question: string().notNull(),
		tournament: string().notNull(),
		division: string().notNull(),
		options: jsonb().default([]),
		answers: jsonb().notNull(),
		subtopics: jsonb().default([]),
		difficulty: decimal().default("0.5"),
		event: string().notNull(),
		images: jsonb().default([]).notNull(),
		randomF: float("random_f").default(sql`random()`),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
		questionType: string("question_type").generatedAlwaysAs(
			sql`CASE WHEN (jsonb_typeof(options) = 'array') AND (jsonb_array_length(options) >= 2) THEN 'mcq' ELSE 'frq' END`,
		),
		pureId: bool("pure_id").default(false),
		rmType: string("rm_type"),
	},
	(table) => [index("idx_id_events_question_type").on(table.questionType)],
);

export const quotes = cockroachTable(
	"quotes",
	{
		id: uuid().defaultRandom().primaryKey(),
		author: varchar({ length: 255 }).notNull(),
		quote: string().notNull(),
		language: varchar({ length: 10 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		randomF: float("random_f").default(sql`random()`).notNull(),
		charLength: int8("char_length", { mode: "number" }),
	},
	(table) => [
		index("idx_quotes_author").on(table.author),
		index("idx_quotes_char_length").on(table.charLength),
		index("idx_quotes_language").on(table.language),
		index("idx_quotes_language_char_length").on(
			table.language,
			table.charLength,
		),
		index("idx_quotes_language_id").on(table.language, table.id),
		index("quotes_language_random_f_idx").on(table.language, table.randomF),
	],
);

export const longquotes = cockroachTable(
	"longquotes",
	{
		id: uuid().defaultRandom().primaryKey(),
		author: string().notNull(),
		quote: string().notNull(),
		language: string().notNull(),
		charLength: int8("char_length", { mode: "number" }).notNull(),
		randomF: float("random_f").default(sql`random()`).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		index("idx_longquotes_char_length").on(table.charLength),
		index("idx_longquotes_language").on(table.language),
		index("idx_longquotes_language_char_length").on(
			table.language,
			table.charLength,
		),
		index("idx_longquotes_random_f").on(table.randomF),
	],
);

export const shareLinks = cockroachTable(
	"share_links",
	{
		id: uuid().defaultRandom().primaryKey(),
		code: string().notNull(),
		indices: jsonb(),
		testParamsRaw: jsonb("test_params_raw").notNull(),
		expiresAt: timestamp("expires_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		createdAt: timestamp("created_at", {
			mode: "string",
			withTimezone: true,
		}).defaultNow(),
	},
	(table) => [
		index("idx_share_links_code").on(table.code),
		index("idx_share_links_expires").on(table.expiresAt),
		uniqueIndex("share_links_code_key").on(table.code),
	],
);

export const base52Codes = cockroachTable(
	"base52_codes",
	{
		id: uuid().defaultRandom().primaryKey(),
		code: varchar({ length: 5 }).notNull(),
		questionId: uuid("question_id").notNull(),
		tableName: varchar("table_name", { length: 20 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		index("base52_codes_code_idx").on(table.code),
		uniqueIndex("base52_codes_code_key").on(table.code),
		index("base52_codes_question_table_idx").on(
			table.questionId,
			table.tableName,
		),
		uniqueIndex("base52_codes_unique_code").on(table.code),
		uniqueIndex("base52_codes_unique_question").on(
			table.questionId,
			table.tableName,
		),
	],
);

export const edits = cockroachTable(
	"edits",
	{
		id: uuid().defaultRandom().primaryKey(),
		event: varchar({ length: 255 }).notNull(),
		originalQuestion: jsonb("original_question").notNull(),
		editedQuestion: jsonb("edited_question").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
	},
	(table) => [index("idx_edits_event").on(table.event)],
);

export const blacklists = cockroachTable(
	"blacklists",
	{
		id: uuid().defaultRandom().primaryKey(),
		event: varchar({ length: 255 }).notNull(),
		questionData: jsonb("question_data").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [index("idx_blacklists_event").on(table.event)],
);

export const geminiExplanationsCache = cockroachTable(
	"gemini_explanations_cache",
	{
		id: uuid().defaultRandom().primaryKey(),
		questionId: string("question_id"),
		questionHash: string("question_hash"),
		event: string().notNull(),
		userAnswer: string("user_answer"),
		explanation: string().notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		hitCount: int8("hit_count", { mode: "number" }).default(1).notNull(),
	},
	(table) => [index("idx_gemini_cache_created_at").on(table.createdAt)],
);
