import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { blacklists as blacklistsTable } from "@/lib/db/schema/core";
import type { ApiResponse } from "@/lib/types/api";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
	buildQuestionPayload,
	locateQuestionIdByContent,
	parseMaybeJson,
} from "./utils";

export async function handleUndoRemove(id: string): Promise<NextResponse> {
	const rows = await db
		.select()
		.from(blacklistsTable)
		.where(eq(blacklistsTable.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) {
		const response: ApiResponse = {
			success: false,
			error: "Blacklisted item not found",
		};
		return NextResponse.json(response, { status: 404 });
	}

	const q = parseMaybeJson(row.questionData);
	const payload = buildQuestionPayload(row.event, q);
	const values: typeof questionsTable.$inferInsert = {
		id: (q.id as string | undefined) || uuidv4(),
		question: payload.question || "",
		tournament: payload.tournament || "",
		division: payload.division || "",
		event: payload.event || row.event || "",
		answers: payload.answers || [],
		options: payload.options,
		subtopics: payload.subtopics,
		difficulty: payload.difficulty,
	};

	let inserted = false;
	try {
		await db.insert(questionsTable).values(values);
		inserted = true;
	} catch {
		await db
			.update(questionsTable)
			.set({
				question: values.question,
				tournament: values.tournament,
				division: values.division,
				event: values.event,
				options: values.options,
				answers: values.answers,
				subtopics: values.subtopics,
				difficulty: values.difficulty,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(questionsTable.id, values.id as string));
	}

	await db.delete(blacklistsTable).where(eq(blacklistsTable.id, id));

	const response: ApiResponse = {
		success: true,
		message: inserted
			? "Question restored and blacklist removed"
			: "Question updated and blacklist removed",
	};
	return NextResponse.json(response);
}

export async function handleApplyRemoved(_id: string): Promise<NextResponse> {
	const rows = await db
		.select()
		.from(blacklistsTable)
		.where(eq(blacklistsTable.id, _id))
		.limit(1);
	const row = rows[0];
	if (!row) {
		return NextResponse.json(
			{ success: false, error: "Blacklisted item not found" } as ApiResponse,
			{ status: 404 },
		);
	}
	const q = parseMaybeJson(row.questionData);
	const candidateId =
		(q.id as string | undefined) ||
		(await locateQuestionIdByContent(row.event, q)) ||
		null;
	if (!candidateId) {
		const response: ApiResponse = {
			success: false,
			error: "Question not found in database to remove",
		};
		return NextResponse.json(response, { status: 404 });
	}
	await db.delete(questionsTable).where(eq(questionsTable.id, candidateId));
	const response: ApiResponse = {
		success: true,
		message: "Question removed from database (kept in blacklist)",
	};
	return NextResponse.json(response);
}

export async function handleDeleteRemoved(id: string): Promise<NextResponse> {
	await db.delete(blacklistsTable).where(eq(blacklistsTable.id, id));
	const response: ApiResponse = {
		success: true,
		message: "Blacklisted record deleted",
	};
	return NextResponse.json(response);
}

export async function handleApplyAllRemoved(): Promise<NextResponse> {
	const list = await db
		.select()
		.from(blacklistsTable)
		.orderBy(desc(blacklistsTable.createdAt));
	let removed = 0;
	let skipped = 0;
	for (const row of list) {
		const q = parseMaybeJson(row.questionData);
		const candidateId =
			(q.id as string | undefined) ||
			(await locateQuestionIdByContent(row.event, q)) ||
			null;
		if (!candidateId) {
			skipped++;
			continue;
		}
		await db.delete(questionsTable).where(eq(questionsTable.id, candidateId));
		removed++;
	}
	const response: ApiResponse = {
		success: true,
		message: `Removed ${removed} questions from DB, skipped ${skipped}`,
	};
	return NextResponse.json(response);
}

export async function handleRestoreAllRemoved(): Promise<NextResponse> {
	const list = await db
		.select()
		.from(blacklistsTable)
		.orderBy(desc(blacklistsTable.createdAt));
	let restored = 0;
	let updated = 0;
	let failed = 0;
	for (const row of list) {
		const q = parseMaybeJson(row.questionData);
		const payload = buildQuestionPayload(row.event, q);
		const values: typeof questionsTable.$inferInsert = {
			id: (q.id as string | undefined) || uuidv4(),
			question: payload.question || "",
			tournament: payload.tournament || "",
			division: payload.division || "",
			event: payload.event || row.event || "",
			answers: payload.answers || [],
			options: payload.options,
			subtopics: payload.subtopics,
			difficulty: payload.difficulty,
		};
		try {
			await db.insert(questionsTable).values(values);
			restored++;
		} catch {
			try {
				await db
					.update(questionsTable)
					.set({
						question: values.question,
						tournament: values.tournament,
						division: values.division,
						event: values.event,
						options: values.options,
						answers: values.answers,
						subtopics: values.subtopics,
						difficulty: values.difficulty,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(questionsTable.id, values.id as string));
				updated++;
			} catch {
				failed++;
			}
		}

		await db.delete(blacklistsTable).where(eq(blacklistsTable.id, row.id));
	}
	const response: ApiResponse = {
		success: true,
		message: `Restored ${restored}, updated ${updated}, failed ${failed}`,
	};
	return NextResponse.json(response);
}
