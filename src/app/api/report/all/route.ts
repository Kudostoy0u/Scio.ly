import { db } from "@/lib/db";
import {
	blacklists as blacklistsTable,
	edits as editsTable,
} from "@/lib/db/schema";
import type { ApiResponse } from "@/lib/types/api";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseMaybeJson(value: unknown): Record<string, unknown> {
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

export async function GET() {
	try {
		// Fetch edits and blacklists concurrently for better latency
		const editsResultPromise = db
			.select()
			.from(editsTable)
			.orderBy(desc(editsTable.updatedAt));

		const edits: Record<
			string,
			Array<{
				original: Record<string, unknown>;
				edited: Record<string, unknown>;
				timestamp: string;
			}>
		> = {};

		const [editsResult, blacklistsResult] = await Promise.all([
			editsResultPromise,
			db
				.select()
				.from(blacklistsTable)
				.orderBy(desc(blacklistsTable.createdAt)),
		]);

		for (const row of editsResult) {
			if (!edits[row.event]) {
				edits[row.event] = [];
			}

			const originalObj = parseMaybeJson(row.originalQuestion);
			const editedObj = parseMaybeJson(row.editedQuestion);
			if (edits[row.event]) {
				edits[row.event]?.push({
					original: originalObj,
					edited: editedObj,
					timestamp: String(row.updatedAt),
				});
			}
		}

		const blacklists: Record<string, unknown[]> = {};

		for (const row of blacklistsResult) {
			if (!blacklists[row.event]) {
				blacklists[row.event] = [];
			}

			const questionObj = parseMaybeJson(row.questionData);
			if (blacklists[row.event]) {
				blacklists[row.event]?.push(questionObj);
			}
		}

		const response: ApiResponse = {
			success: true,
			data: {
				edits,
				blacklists,
			},
		};

		return NextResponse.json(response);
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Failed to fetch all reports",
		};
		return NextResponse.json(response, { status: 500 });
	}
}
