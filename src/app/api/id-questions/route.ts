import {
	createSuccessResponse,
	handleApiError,
	logApiRequest,
	logApiResponse,
} from "@/lib/api/utils";
import { db } from "@/lib/db";
import { idEvents } from "@/lib/db/schema";
import { type SQL, and, gte, lt, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const Filters = z.object({
	event: z.string().optional(),
	division: z.string().optional(),
	subtopic: z.string().optional(),
	subtopics: z.string().optional(),
	difficulty_min: z.string().optional(),
	difficulty_max: z.string().optional(),
	limit: z.string().optional(),
	question_type: z.string().optional(),
	pure_id_only: z.string().optional(),
	rm_type: z.string().optional(), // 'rock', 'mineral', or undefined for both
});

const toArray = (v: unknown) => (Array.isArray(v) ? v : []);
const toNum = (v: unknown, d = 0.5) =>
	typeof v === "number" ? v : Number.parseFloat(String(v ?? d)) || d;

export async function GET(request: NextRequest) {
	const started = Date.now();
	logApiRequest(
		"GET",
		"/api/id-questions",
		Object.fromEntries(request.nextUrl.searchParams),
	);
	try {
		const p = Filters.parse(Object.fromEntries(request.nextUrl.searchParams));
		const subtopics: string[] = p.subtopics
			? p.subtopics.split(",").map((s) => s.trim())
			: p.subtopic
				? [p.subtopic]
				: [];
		const conds: SQL[] = [];
		if (p.event) {
			conds.push(sql`${idEvents.event} = ${p.event}`);
		}
		if (p.division) {
			conds.push(sql`${idEvents.division} = ${p.division}`);
		}
		if (subtopics.length > 0) {
			conds.push(sql`${idEvents.subtopics} @> ${JSON.stringify(subtopics)}`);
		}
		if (p.difficulty_min) {
			conds.push(
				gte(idEvents.difficulty, String(Number.parseFloat(p.difficulty_min))),
			);
		}
		if (p.difficulty_max) {
			conds.push(
				lt(idEvents.difficulty, String(Number.parseFloat(p.difficulty_max))),
			);
		}

		// Filter by rm_type for Rocks and Minerals event
		if (p.rm_type && (p.rm_type === "rock" || p.rm_type === "mineral")) {
			conds.push(sql`${idEvents.rmType} = ${p.rm_type}`);
		}

		// Filter by question type if provided (mcq | frq | both)
		// Note: idEvents table doesn't have questionType or pureId columns
		// These filters are disabled as the schema doesn't support them
		// const qt = (p.question_type || "").toLowerCase();
		// if (qt === "mcq" || qt === "frq") {
		//   conds.push(sql`${idEvents.type} = ${qt}`);
		// }

		// Filter by pure_id if requested
		// if (p.pure_id_only === "true") {
		//   conds.push(sql`${idEvents.pureId} = true`);
		// }

		const where =
			conds.length === 0
				? undefined
				: conds.length === 1
					? conds[0]
					: and(...conds);
		const limit = Math.min(
			Math.max(Number.parseInt(p.limit || "50") || 50, 1),
			200,
		);
		const r = Math.random();

		try {
			const first = await db
				.select()
				.from(idEvents)
				.where(
					where
						? and(where, gte(idEvents.randomF, r))
						: gte(idEvents.randomF, r),
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
			const data = rows.map((row) => ({
				id: row.id,
				question: row.question,
				tournament: row.tournament,
				division: row.division,
				event: row.event,
				difficulty: toNum(row.difficulty),
				options: toArray(row.options),
				answers: toArray(row.answers),
				subtopics: toArray(row.subtopics),
				images: toArray(row.images),
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			}));
			const res = createSuccessResponse(data);
			logApiResponse("GET", "/api/id-questions", 200, Date.now() - started);
			return res;
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
			const data = rows.map((row) => ({
				id: row.id,
				question: row.question,
				tournament: row.tournament,
				division: row.division,
				event: row.event,
				difficulty: toNum(row.difficulty),
				options: toArray(row.options),
				answers: toArray(row.answers),
				subtopics: toArray(row.subtopics),
				images: toArray(row.images),
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			}));
			const res = createSuccessResponse(data);
			logApiResponse("GET", "/api/id-questions", 200, Date.now() - started);
			return res;
		}
	} catch (err) {
		const res = handleApiError(err);
		logApiResponse(
			"GET",
			"/api/id-questions",
			res.status,
			Date.now() - started,
		);
		return res;
	}
}
