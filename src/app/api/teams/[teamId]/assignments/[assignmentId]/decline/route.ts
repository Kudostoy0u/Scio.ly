import { dbPg } from "@/lib/db";
import { teamSubmissions } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { handleError, handleUnauthorizedError } from "@/lib/utils/teams/errors";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string; assignmentId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { assignmentId } = await params;

		// Mark submission as declined/cancelled
		await dbPg
			.insert(teamSubmissions)
			.values({
				assignmentId,
				userId: user.id,
				status: "declined",
				updatedAt: new Date().toISOString(),
			})
			.onConflictDoUpdate({
				target: [teamSubmissions.assignmentId, teamSubmissions.userId],
				set: {
					status: "declined",
					updatedAt: new Date().toISOString(),
				},
			});

		return NextResponse.json({ message: "Assignment declined successfully" });
	} catch (error) {
		return handleError(
			error,
			"POST /api/teams/[teamId]/assignments/[assignmentId]/decline",
		);
	}
}
