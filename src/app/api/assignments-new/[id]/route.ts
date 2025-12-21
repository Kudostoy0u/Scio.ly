import { dbPg } from "@/lib/db";
import { teamAssignments, teamSubmissions, teams } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;

		const assignmentResult = await dbPg
			.select({
				id: teamAssignments.id,
				title: teamAssignments.title,
				description: teamAssignments.description,
				dueDate: teamAssignments.dueDate,
				teamId: teamAssignments.teamId,
				createdBy: teamAssignments.createdBy,
				createdAt: teamAssignments.createdAt,
				school: teams.school,
				division: teams.division,
			})
			.from(teamAssignments)
			.innerJoin(teams, eq(teamAssignments.teamId, teams.id))
			.where(eq(teamAssignments.id, id))
			.limit(1);

		if (assignmentResult.length === 0) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		const assignment = assignmentResult[0];
		if (!assignment)
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);

		// Parse robust data from description
		let questions = [];
		let eventName = "Assignment";
		if (assignment.description?.startsWith("METADATA:")) {
			try {
				const metadata = JSON.parse(assignment.description.substring(9));
				questions = metadata.questions || [];
				eventName = metadata.eventName || eventName;
			} catch {
				// Fallback
			}
		}

		return NextResponse.json({
			assignment: {
				...assignment,
				eventName,
				questions,
				params: {
					eventName,
					questionCount: questions.length,
				},
			},
		});
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

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id)
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id: assignmentId } = await params;
		const body = await request.json();

		const [submission] = await dbPg
			.insert(teamSubmissions)
			.values({
				assignmentId,
				userId: user.id,
				content: body.content || {},
				status: "submitted",
				submittedAt: new Date().toISOString(),
			})
			.onConflictDoUpdate({
				target: [teamSubmissions.assignmentId, teamSubmissions.userId],
				set: {
					content: body.content || {},
					status: "submitted",
					submittedAt: new Date().toISOString(),
					updatedAt: sql`now()`,
				},
			})
			.returning();

		return NextResponse.json({ submission });
	} catch (error) {
		return NextResponse.json(
			{
				error: "Submission failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
