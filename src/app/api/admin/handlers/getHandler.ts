import { db } from "@/lib/db";
import {
	blacklists as blacklistsTable,
	edits as editsTable,
} from "@/lib/db/schema/core";
import type { ApiResponse } from "@/lib/types/api";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parseMaybeJson } from "./utils";

export async function handleGetAdminData() {
	try {
		const [edits, blacklists] = await Promise.all([
			db.select().from(editsTable).orderBy(desc(editsTable.updatedAt)),
			db
				.select()
				.from(blacklistsTable)
				.orderBy(desc(blacklistsTable.createdAt)),
		]);

		let editsResolvable = 0;
		let removedResolvable = 0;
		const byEvent: Record<string, { edits: number; removed: number }> = {};

		const enrichedEdits = await Promise.all(
			edits.map((row) => {
				const event = row.event;
				byEvent[event] = byEvent[event] || { edits: 0, removed: 0 };
				byEvent[event].edits += 1;

				const original = parseMaybeJson(row.originalQuestion);
				const edited = parseMaybeJson(row.editedQuestion);
				const candidateId =
					(edited.id as string | undefined) ||
					(original.id as string | undefined);
				const canLocate = Boolean(candidateId);
				if (canLocate) {
					editsResolvable += 1;
				}
				return {
					id: row.id,
					event,
					original,
					edited,
					updatedAt: String(row.updatedAt),
					canLocateTarget: canLocate,
				};
			}),
		);

		const enrichedBlacklists = await Promise.all(
			blacklists.map((row) => {
				const event = row.event;
				byEvent[event] = byEvent[event] || { edits: 0, removed: 0 };
				byEvent[event].removed += 1;

				const q = parseMaybeJson(row.questionData);
				const candidateId = (q.id as string | undefined) || undefined;
				const exists = Boolean(candidateId);
				if (exists) {
					removedResolvable += 1;
				}
				return {
					id: row.id,
					event,
					question: q,
					createdAt: String(row.createdAt),
					existsInQuestions: exists,
				};
			}),
		);

		const response: ApiResponse = {
			success: true,
			data: {
				edits: enrichedEdits,
				blacklists: enrichedBlacklists,
				stats: {
					totalEdits: edits.length,
					totalRemoved: blacklists.length,
					editsResolvable,
					removedResolvable,
					byEvent,
				},
			},
		};
		return NextResponse.json(response);
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Failed to fetch admin overview",
		};
		return NextResponse.json(response, { status: 500 });
	}
}
