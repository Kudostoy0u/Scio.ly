import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { edits as editsTable } from "@/lib/db/schema";
import type { ApiResponse } from "@/lib/types/api";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
	buildQuestionPayload,
	findTargetQuestionId,
	parseMaybeJson,
} from "./utils";

export async function handleUndoEdit(id: string): Promise<NextResponse> {
	const rows = await db
		.select()
		.from(editsTable)
		.where(eq(editsTable.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) {
		const response: ApiResponse = { success: false, error: "Edit not found" };
		return NextResponse.json(response, { status: 404 });
	}

	const event = row.event;
	const original = parseMaybeJson(row.originalQuestion);
	const edited = parseMaybeJson(row.editedQuestion);

	const targetId = await findTargetQuestionId(event, original, edited);
	if (!targetId) {
		const response: ApiResponse = {
			success: false,
			error: "Could not locate target question to revert",
		};
		return NextResponse.json(response, { status: 404 });
	}

	const payload = buildQuestionPayload(event, original);
	await db
		.update(questionsTable)
		.set({ ...payload, updatedAt: new Date().toISOString() })
		.where(eq(questionsTable.id, targetId));
	await db.delete(editsTable).where(eq(editsTable.id, id));

	const response: ApiResponse = {
		success: true,
		message: "Edit reverted and record removed",
	};
	return NextResponse.json(response);
}

export async function handleApplyEdit(id: string): Promise<NextResponse> {
	const rows = await db
		.select()
		.from(editsTable)
		.where(eq(editsTable.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) {
		return NextResponse.json(
			{ success: false, error: "Edit not found" } as ApiResponse,
			{
				status: 404,
			},
		);
	}
	const event = row.event;
	const original = parseMaybeJson(row.originalQuestion);
	const edited = parseMaybeJson(row.editedQuestion);

	const targetId = await findTargetQuestionId(event, original, edited);
	if (!targetId) {
		const response: ApiResponse = {
			success: false,
			error: "Could not locate target question to apply edit",
		};
		return NextResponse.json(response, { status: 404 });
	}

	const payload = buildQuestionPayload(event, edited);
	await db
		.update(questionsTable)
		.set({ ...payload, updatedAt: new Date().toISOString() })
		.where(eq(questionsTable.id, targetId));
	const response: ApiResponse = {
		success: true,
		message: "Edit applied to database",
	};
	return NextResponse.json(response);
}

export async function handleDeleteEdit(id: string): Promise<NextResponse> {
	await db.delete(editsTable).where(eq(editsTable.id, id));
	const response: ApiResponse = {
		success: true,
		message: "Edit record deleted",
	};
	return NextResponse.json(response);
}

export async function handleApplyAllEdits(): Promise<NextResponse> {
	const edits = await db
		.select()
		.from(editsTable)
		.orderBy(desc(editsTable.updatedAt));
	let applied = 0;
	let skipped = 0;
	for (const row of edits) {
		const event = row.event;
		const original = parseMaybeJson(row.originalQuestion);
		const edited = parseMaybeJson(row.editedQuestion);
		const targetId = await findTargetQuestionId(event, original, edited);
		if (!targetId) {
			skipped++;
			continue;
		}
		const payload = buildQuestionPayload(event, edited);
		await db
			.update(questionsTable)
			.set({ ...payload, updatedAt: new Date().toISOString() })
			.where(eq(questionsTable.id, targetId));
		applied++;
	}
	const response: ApiResponse = {
		success: true,
		message: `Applied ${applied} edits, skipped ${skipped}`,
	};
	return NextResponse.json(response);
}

export async function handleUndoAllEdits(): Promise<NextResponse> {
	const edits = await db
		.select()
		.from(editsTable)
		.orderBy(desc(editsTable.updatedAt));
	let reverted = 0;
	let skipped = 0;
	for (const row of edits) {
		const event = row.event;
		const original = parseMaybeJson(row.originalQuestion);
		const edited = parseMaybeJson(row.editedQuestion);
		const targetId = await findTargetQuestionId(event, original, edited);
		if (!targetId) {
			skipped++;
			continue;
		}
		const payload = buildQuestionPayload(event, original);
		await db
			.update(questionsTable)
			.set({ ...payload, updatedAt: new Date().toISOString() })
			.where(eq(questionsTable.id, targetId));

		await db.delete(editsTable).where(eq(editsTable.id, row.id));
		reverted++;
	}
	const response: ApiResponse = {
		success: true,
		message: `Reverted ${reverted} edits, skipped ${skipped}`,
	};
	return NextResponse.json(response);
}
