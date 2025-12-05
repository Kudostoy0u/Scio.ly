import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import type {
	ApiResponse,
	DivisionStat,
	EventStat,
	StatsResponse,
} from "@/lib/types/api";
import { count, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const totalRes = await db.select({ total: count() }).from(questions);
		const total = Number(totalRes[0]?.total || 0);

		const eventResult = await db
			.select({ event: questions.event, count: sql<number>`count(*)` })
			.from(questions)
			.groupBy(questions.event)
			.orderBy(desc(sql`count(*)`));
		const byEvent: EventStat[] = eventResult.map((row) => ({
			event: row.event,
			count: String(row.count),
		}));

		const divisionResult = await db
			.select({ division: questions.division, count: sql<number>`count(*)` })
			.from(questions)
			.groupBy(questions.division)
			.orderBy(desc(sql`count(*)`));
		const byDivision: DivisionStat[] = divisionResult.map((row) => ({
			division: row.division,
			count: String(row.count),
		}));

		const statsData: StatsResponse = {
			total,
			byEvent,
			byDivision,
		};

		const response: ApiResponse<StatsResponse> = {
			success: true,
			data: statsData,
		};

		return NextResponse.json(response);
	} catch (_error) {
		const response: ApiResponse = {
			success: false,
			error: "Failed to fetch stats",
		};
		return NextResponse.json(response, { status: 500 });
	}
}
