import { dbPg } from "@/lib/db/index";
import { assignmentResults } from "@/lib/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { assignmentId, userId, name, eventName, score, detail } = body || {};

		if (!(assignmentId && (userId || name))) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Missing required parameters: assignmentId and either userId or name",
				},
				{ status: 400 },
			);
		}
		const [result] = await dbPg
			.insert(assignmentResults)
			.values({
				assignmentId: Number(assignmentId),
				userId: userId || null,
				name: name || null,
				eventName: eventName || null,
				score: typeof score === "number" ? String(score) : null,
				detail: detail || null,
			} as typeof assignmentResults.$inferInsert)
			.returning();
		return NextResponse.json({ success: true, data: result });
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : "Unknown error";
		return NextResponse.json(
			{
				success: false,
				error: "Failed to submit assignment",
				details: errorMessage,
			},
			{ status: 500 },
		);
	}
}
