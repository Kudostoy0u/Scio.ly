import { dbPg } from "@/lib/db";
import { teamAssignments, teamSubteams, teams } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const assignmentId = searchParams.get("assignmentId");

		if (!assignmentId) {
			return NextResponse.json(
				{ error: "Assignment ID is required" },
				{ status: 400 },
			);
		}

		// Find the assignment and get the team group slug
		// teamAssignments.teamId -> teamSubteams.id -> teams.id
		const result = await dbPg
			.select({
				teamId: teamAssignments.teamId,
				groupSlug: teams.slug,
			})
			.from(teamAssignments)
			.innerJoin(teamSubteams, eq(teamAssignments.teamId, teamSubteams.id))
			.innerJoin(teams, eq(teamSubteams.teamId, teams.id))
			.where(eq(teamAssignments.id, assignmentId))
			.limit(1);

		if (result.length === 0) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		const firstResult = result[0];
		if (!firstResult) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}
		const { groupSlug } = firstResult;

		return NextResponse.json({ teamId: groupSlug });
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
