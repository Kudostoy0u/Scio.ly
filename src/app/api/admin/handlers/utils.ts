import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export function parseMaybeJson(value: unknown): Record<string, unknown> {
	if (value === null || value === undefined) {
		return {};
	}
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return typeof parsed === "object" && parsed !== null
				? (parsed as Record<string, unknown>)
				: ({ value: parsed as unknown } as Record<string, unknown>);
		} catch {
			return { value } as Record<string, unknown>;
		}
	}
	if (typeof value === "object") {
		return value as Record<string, unknown>;
	}
	return { value } as Record<string, unknown>;
}

export function toStringDifficulty(input: unknown): string {
	if (typeof input === "number") {
		return input.toString();
	}
	if (typeof input === "string") {
		const n = Number(input);
		if (!Number.isNaN(n)) {
			return n.toString();
		}
	}
	return "0.5";
}

export async function locateQuestionIdByContent(
	event: string,
	content: Record<string, unknown>,
) {
	const conditions = [
		eq(questionsTable.question, String(content.question || "")),
		eq(questionsTable.event, String(event || content.event || "")),
	];
	if (content.tournament) {
		conditions.push(eq(questionsTable.tournament, String(content.tournament)));
	}
	if (content.division) {
		conditions.push(eq(questionsTable.division, String(content.division)));
	}

	const found = await db
		.select({ id: questionsTable.id })
		.from(questionsTable)
		.where(and(...conditions));
	return found[0]?.id as string | undefined;
}

export function buildQuestionPayload(
	event: string,
	q: Record<string, unknown>,
): Partial<typeof questionsTable.$inferInsert> {
	return {
		question: String(q.question || ""),
		tournament: String(q.tournament || ""),
		division: String(q.division || ""),
		event: String(event || q.event || ""),
		options: Array.isArray(q.options) ? (q.options as unknown[]) : [],
		answers: Array.isArray(q.answers) ? (q.answers as unknown[]) : [],
		subtopics: Array.isArray(q.subtopics)
			? (q.subtopics as unknown[])
			: q.subtopic
				? [String(q.subtopic)]
				: [],
		difficulty: toStringDifficulty(q.difficulty),
	};
}

export async function findTargetQuestionId(
	event: string,
	original: Record<string, unknown>,
	edited: Record<string, unknown>,
): Promise<string | null> {
	const originalId = (original.id as string | undefined) || undefined;
	const editedId = (edited.id as string | undefined) || undefined;
	const initialTargetId: string | null = originalId || editedId || null;
	if (initialTargetId) {
		return initialTargetId;
	}
	const idByOriginal = await locateQuestionIdByContent(event, original);
	if (idByOriginal) {
		return idByOriginal;
	}
	const idByEdited = await locateQuestionIdByContent(event, edited);
	return idByEdited || null;
}
