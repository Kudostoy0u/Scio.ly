import crypto from "node:crypto";
import { db } from "@/lib/db";
import { idEvents, questions } from "@/lib/db/schema";
import type { Question as ApiQuestion } from "@/lib/types/api";
import logger from "@/lib/utils/logging/logger";
import { type SQL, and, eq, gte, lt, lte, or, sql } from "drizzle-orm";

export const TRULY_RANDOM_SELECTION = true;

type DatabaseQuestion = {
	id: string;
	question: string;
	tournament: string;
	division: string;
	event: string;
	difficulty: string | null;
	options: unknown;
	answers: unknown;
	subtopics: unknown;
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
};

export interface QuestionQueryFilters {
	event?: string;
	division?: string;
	tournament?: string;
	subtopic?: string;
	subtopics?: string;
	difficulty_min?: string;
	difficulty_max?: string;
	question_type?: "mcq" | "frq";
	limit?: string;
}

export interface IdQuestionQueryFilters {
	event?: string;
	division?: string;
	subtopic?: string;
	subtopics?: string;
	difficulty_min?: string;
	difficulty_max?: string;
	limit?: string;
	question_type?: string;
	pure_id_only?: string;
	rm_type?: string;
}

export interface IdQuestionResult {
	id: string;
	question: string;
	tournament: string;
	division: string;
	event: string;
	difficulty: number;
	options: string[];
	answers: (string | number)[];
	subtopics: string[];
	images: string[];
	created_at?: string | null;
	updated_at?: string | null;
}

class QueryBuilder {
	private conditions: SQL[] = [];
	private limit = 50;

	addCondition(condition: SQL): this {
		this.conditions.push(condition);
		return this;
	}

	addEventFilter(event: string): this {
		return this.addCondition(eq(questions.event, event));
	}

	addDivisionFilter(division: string): this {
		return this.addCondition(eq(questions.division, division));
	}

	addTournamentFilter(tournament: string): this {
		return this.addCondition(
			sql`${questions.tournament} ILIKE ${`%${tournament}%`}`,
		);
	}

	addSubtopicsFilter(subtopics: string[]): this {
		if (subtopics.length === 0) {
			return this;
		}

		const subtopicConditions: SQL[] = subtopics.map(
			(subtopic) =>
				sql`${questions.subtopics} @> ${JSON.stringify([subtopic])}`,
		);

		if (subtopicConditions.length === 1) {
			const condition = subtopicConditions[0];
			if (!condition) {
				return this;
			}
			return this.addCondition(condition);
		}

		const orCondition = or(...subtopicConditions);
		if (!orCondition) {
			return this;
		}
		return this.addCondition(orCondition);
	}

	addQuestionTypeFilter(questionType: "mcq" | "frq"): this {
		if (questionType === "mcq") {
			return this.addCondition(
				sql`${questions.options} IS NOT NULL AND ${questions.options} != '[]'::jsonb AND jsonb_array_length(${questions.options}) > 0`,
			);
		}

		return this.addCondition(
			sql`(${questions.options} IS NULL OR ${questions.options} = '[]'::jsonb OR jsonb_array_length(${questions.options}) = 0)`,
		);
	}

	addDifficultyRange(min?: string, max?: string): this {
		if (min) {
			const difficulty = Number.parseFloat(min);
			if (!Number.isNaN(difficulty)) {
				this.addCondition(gte(questions.difficulty, difficulty.toString()));
			}
		}

		if (max) {
			const difficulty = Number.parseFloat(max);
			if (!Number.isNaN(difficulty)) {
				this.addCondition(lte(questions.difficulty, difficulty.toString()));
			}
		}

		return this;
	}

	setLimit(limit: string | undefined): this {
		const parsedLimit = limit ? Number.parseInt(limit) : 50;
		this.limit = Math.min(Math.max(parsedLimit > 0 ? parsedLimit : 50, 1), 200);
		return this;
	}

	getWhereCondition(): SQL | undefined {
		if (this.conditions.length === 0) {
			return undefined;
		}
		return this.conditions.length === 1
			? this.conditions[0]
			: and(...this.conditions);
	}

	getLimit(): number {
		return this.limit;
	}
}

function encodeBase52Local(index: number): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	const base = alphabet.length;
	const coreLength = 4;
	let n = index;
	let out = "";
	for (let i = 0; i < coreLength; i++) {
		out = alphabet[n % base] + out;
		n = Math.floor(n / base);
	}
	return out;
}

function hashIdToInt(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		const char = id.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return Math.abs(hash) % 7311616; // 52^4
}

export const transformDatabaseResult = (
	result: DatabaseQuestion,
): ApiQuestion => {
	const core = encodeBase52Local(hashIdToInt(result.id));
	const base52Code = `${core}S`;
	logger.dev.structured("info", "Transforming database result", result);

	const toISOString = (
		value: Date | string | null | undefined,
	): string | undefined => {
		if (!value) return undefined;
		if (value instanceof Date) return value.toISOString();
		if (typeof value === "string") {
			if (value.includes("T") && value.includes("Z")) return value;
			const date = new Date(value);
			if (!Number.isNaN(date.getTime())) return date.toISOString();
			return value;
		}
		return undefined;
	};

	return {
		id: result.id,
		question: result.question,
		tournament: result.tournament,
		division: result.division,
		event: result.event,
		difficulty: result.difficulty ? Number.parseFloat(result.difficulty) : 0.5,
		options: Array.isArray(result.options) ? result.options : [],
		answers: Array.isArray(result.answers) ? result.answers : [],
		subtopics: Array.isArray(result.subtopics) ? result.subtopics : [],
		created_at: toISOString(result.createdAt),
		updated_at: toISOString(result.updatedAt),
		base52: base52Code,
	};
};

const buildSubtopicsArray = (filters: QuestionQueryFilters): string[] => {
	const subtopics: string[] = [];

	if (filters.subtopics) {
		subtopics.push(...filters.subtopics.split(",").map((s) => s.trim()));
	} else if (filters.subtopic) {
		subtopics.push(filters.subtopic);
	}

	return subtopics;
};

const toArray = <T>(value: unknown): T[] =>
	Array.isArray(value) ? (value as T[]) : [];

const toNum = (value: unknown, fallback = 0.5) =>
	typeof value === "number"
		? value
		: Number.parseFloat(String(value ?? fallback)) || fallback;

export async function queryQuestions(
	filters: QuestionQueryFilters,
): Promise<ApiQuestion[]> {
	const queryBuilder = new QueryBuilder();

	if (filters.event) {
		queryBuilder.addEventFilter(filters.event);
	}

	if (filters.division) {
		queryBuilder.addDivisionFilter(filters.division);
	}

	if (filters.tournament) {
		queryBuilder.addTournamentFilter(filters.tournament);
	}

	const subtopics = buildSubtopicsArray(filters);
	if (subtopics.length > 0) {
		queryBuilder.addSubtopicsFilter(subtopics);
	}

	if (filters.question_type) {
		queryBuilder.addQuestionTypeFilter(filters.question_type);
	}

	queryBuilder.addDifficultyRange(
		filters.difficulty_min,
		filters.difficulty_max,
	);
	queryBuilder.setLimit(filters.limit);

	const whereCondition = queryBuilder.getWhereCondition();
	const limit = queryBuilder.getLimit();
	const r = (() => {
		try {
			const buf = crypto.randomBytes(6); // 48 bits
			const n = Number.parseInt(buf.toString("hex"), 16);
			return n / 2 ** 48;
		} catch {
			return Math.random();
		}
	})();

	if (!TRULY_RANDOM_SELECTION) {
		try {
			const rows = await db
				.select({
					id: questions.id,
					question: questions.question,
					tournament: questions.tournament,
					division: questions.division,
					event: questions.event,
					difficulty: questions.difficulty,
					options: questions.options,
					answers: questions.answers,
					subtopics: questions.subtopics,
					createdAt: questions.createdAt,
					updatedAt: questions.updatedAt,
					randomF: questions.randomF,
				})
				.from(questions)
				.where(whereCondition)
				.orderBy(
					sql`CASE WHEN ${questions.randomF} >= ${r} THEN 0 ELSE 1 END`,
					questions.randomF,
				)
				.limit(limit);

			return rows.map((row) =>
				transformDatabaseResult(row as DatabaseQuestion),
			);
		} catch (err) {
			logger.warn(
				"Error fetching questions (single scan), falling back to RANDOM()",
				err,
			);

			const rows = await db
				.select({
					id: questions.id,
					question: questions.question,
					tournament: questions.tournament,
					division: questions.division,
					event: questions.event,
					difficulty: questions.difficulty,
					options: questions.options,
					answers: questions.answers,
					subtopics: questions.subtopics,
					createdAt: questions.createdAt,
					updatedAt: questions.updatedAt,
					randomF: questions.randomF,
				})
				.from(questions)
				.where(whereCondition)
				.orderBy(sql`RANDOM()`)
				.limit(limit);

			return rows.map((row) =>
				transformDatabaseResult(row as DatabaseQuestion),
			);
		}
	}

	try {
		logger.debug("Using two-phase indexed random seek");
		const whereFirst = whereCondition
			? and(whereCondition, gte(questions.randomF, r))
			: gte(questions.randomF, r);

		const firstRows = await db
			.select({
				id: questions.id,
				question: questions.question,
				tournament: questions.tournament,
				division: questions.division,
				event: questions.event,
				difficulty: questions.difficulty,
				options: questions.options,
				answers: questions.answers,
				subtopics: questions.subtopics,
				createdAt: questions.createdAt,
				updatedAt: questions.updatedAt,
				randomF: questions.randomF,
			})
			.from(questions)
			.where(whereFirst)
			.orderBy(questions.randomF)
			.limit(limit);

		let rows = firstRows;

		if (rows.length < limit) {
			const remaining = limit - rows.length;
			const whereSecond = whereCondition
				? and(whereCondition, lt(questions.randomF, r))
				: lt(questions.randomF, r);

			const secondRows = await db
				.select({
					id: questions.id,
					question: questions.question,
					tournament: questions.tournament,
					division: questions.division,
					event: questions.event,
					difficulty: questions.difficulty,
					options: questions.options,
					answers: questions.answers,
					subtopics: questions.subtopics,
					createdAt: questions.createdAt,
					updatedAt: questions.updatedAt,
					randomF: questions.randomF,
				})
				.from(questions)
				.where(whereSecond)
				.orderBy(questions.randomF)
				.limit(remaining);

			rows = rows.concat(secondRows);
		}

		return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
	} catch (err) {
		logger.warn(
			"Error fetching questions (two-phase), falling back to RANDOM()",
			err,
		);

		const rows = await db
			.select({
				id: questions.id,
				question: questions.question,
				tournament: questions.tournament,
				division: questions.division,
				event: questions.event,
				difficulty: questions.difficulty,
				options: questions.options,
				answers: questions.answers,
				subtopics: questions.subtopics,
				createdAt: questions.createdAt,
				updatedAt: questions.updatedAt,
				randomF: questions.randomF,
			})
			.from(questions)
			.where(whereCondition)
			.orderBy(sql`RANDOM()`)
			.limit(limit);

		return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
	}
}

export async function queryIdQuestions(
	filters: IdQuestionQueryFilters,
): Promise<IdQuestionResult[]> {
	const subtopics: string[] = filters.subtopics
		? filters.subtopics.split(",").map((s) => s.trim())
		: filters.subtopic
			? [filters.subtopic]
			: [];
	const conds: SQL[] = [];
	if (filters.event) {
		conds.push(sql`${idEvents.event} = ${filters.event}`);
	}
	if (filters.division) {
		conds.push(sql`${idEvents.division} = ${filters.division}`);
	}
	if (subtopics.length > 0) {
		conds.push(sql`${idEvents.subtopics} @> ${JSON.stringify(subtopics)}`);
	}
	if (filters.difficulty_min) {
		conds.push(
			gte(
				idEvents.difficulty,
				String(Number.parseFloat(filters.difficulty_min)),
			),
		);
	}
	if (filters.difficulty_max) {
		conds.push(
			lt(
				idEvents.difficulty,
				String(Number.parseFloat(filters.difficulty_max)),
			),
		);
	}

	if (
		filters.rm_type &&
		(filters.rm_type === "rock" || filters.rm_type === "mineral")
	) {
		conds.push(sql`${idEvents.rmType} = ${filters.rm_type}`);
	}

	const qt = (filters.question_type || "").toLowerCase();
	if (qt === "mcq" || qt === "frq") {
		conds.push(sql`${idEvents.questionType} = ${qt}`);
	}

	if (filters.pure_id_only === "true") {
		conds.push(sql`${idEvents.pureId} = true`);
	}

	const where =
		conds.length === 0
			? undefined
			: conds.length === 1
				? conds[0]
				: and(...conds);
	const limit = Math.min(
		Math.max(Number.parseInt(filters.limit || "50") || 50, 1),
		200,
	);
	const r = Math.random();

	try {
		const first = await db
			.select()
			.from(idEvents)
			.where(
				where ? and(where, gte(idEvents.randomF, r)) : gte(idEvents.randomF, r),
			)
			.orderBy(idEvents.randomF)
			.limit(limit);
		const rows =
			first.length >= limit
				? first
				: [
						...first,
						...(await db
							.select()
							.from(idEvents)
							.where(
								where
									? and(where, lt(idEvents.randomF, r))
									: lt(idEvents.randomF, r),
							)
							.orderBy(idEvents.randomF)
							.limit(limit - first.length)),
					];
		return rows.map((row) => ({
			id: row.id,
			question: row.question,
			tournament: row.tournament,
			division: row.division,
			event: row.event,
			difficulty: toNum(row.difficulty),
			options: toArray<string>(row.options),
			answers: toArray<string | number>(row.answers),
			subtopics: toArray<string>(row.subtopics),
			images: toArray<string>(row.images),
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		}));
	} catch {
		const base = where
			? db
					.select()
					.from(idEvents)
					.where(where)
					.orderBy(sql`RANDOM()`)
					.limit(limit)
			: db.select().from(idEvents).orderBy(sql`RANDOM()`).limit(limit);
		const rows = await base;
		return rows.map((row) => ({
			id: row.id,
			question: row.question,
			tournament: row.tournament,
			division: row.division,
			event: row.event,
			difficulty: toNum(row.difficulty),
			options: toArray<string>(row.options),
			answers: toArray<string | number>(row.answers),
			subtopics: toArray<string>(row.subtopics),
			images: toArray<string>(row.images),
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		}));
	}
}
