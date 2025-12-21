import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamAssignments, teamRoster, teamSubmissions } from "@/lib/db/schema";
import type { AssignmentQuestion } from "@/lib/server/teams/assignments";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleNotFoundError,
	handleUnauthorizedError,
} from "@/lib/utils/teams/errors";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string; assignmentId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId, assignmentId } = await params;
		const teamInfo = await resolveTeamSlugToUnits(teamId);

		const assignmentResult = await dbPg
			.select({
				id: teamAssignments.id,
				title: teamAssignments.title,
				description: teamAssignments.description,
				dueDate: teamAssignments.dueDate,
				createdAt: teamAssignments.createdAt,
				createdBy: teamAssignments.createdBy,
				creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			})
			.from(teamAssignments)
			.innerJoin(users, eq(teamAssignments.createdBy, users.id))
			.where(eq(teamAssignments.id, assignmentId))
			.limit(1);

		if (assignmentResult.length === 0) return handleNotFoundError("Assignment");
		const assignment = assignmentResult[0];
		if (!assignment) return handleNotFoundError("Assignment");

		// Parse metadata
		let metadata = {
			questions: [] as AssignmentQuestion[],
			eventName: null,
			assignmentType: "task",
			timeLimitMinutes: null,
		};
		if (assignment.description?.startsWith("METADATA:")) {
			try {
				metadata = JSON.parse(assignment.description.substring(9));
			} catch {
				// Fallback
			}
		}

		// Get roster and submissions
		const roster = await dbPg
			.select({
				id: teamRoster.id,
				student_name: teamRoster.displayName,
				user_id: teamRoster.userId,
				email: users.email,
				display_name: users.displayName,
			})
			.from(teamRoster)
			.leftJoin(users, eq(teamRoster.userId, users.id))
			.where(eq(teamRoster.teamId, teamInfo.teamId));

		const submissions = await dbPg
			.select()
			.from(teamSubmissions)
			.where(eq(teamSubmissions.assignmentId, assignmentId));

		const submissionsMap = new Map(submissions.map((s) => [s.userId, s]));

		const rosterWithSubmissions = roster.map((m) => {
			const sub = m.user_id ? submissionsMap.get(m.user_id) : null;

			// Mock analytics from submission content if available
			let analytics = null;
			if (
				sub?.content &&
				typeof sub.content === "object" &&
				!Array.isArray(sub.content)
			) {
				const answers =
					(
						sub.content as {
							answers?: Record<number, string | number | boolean>;
						}
					).answers || {};
				const total = metadata.questions.length || 1;
				let correct = 0;
				// Simple grading logic for mock analytics
				metadata.questions.forEach((q: AssignmentQuestion, i: number) => {
					if (answers[i] === q.correctAnswer) correct++;
				});
				analytics = {
					total_questions: total,
					correct_answers: correct,
					submitted_at: sub.submittedAt,
				};
			}

			return {
				...m,
				submission: sub
					? {
							id: sub.id,
							status: sub.status,
							submitted_at: sub.submittedAt,
						}
					: null,
				analytics,
			};
		});

		return NextResponse.json({
			assignment: {
				...assignment,
				...metadata,
				assignment_type: metadata.assignmentType,
				questions_count: metadata.questions.length,
				roster: rosterWithSubmissions,
				roster_count: roster.length,
				submitted_count: submissions.length,
			},
		});
	} catch (error) {
		return handleError(
			error,
			"GET /api/teams/[teamId]/assignments/[assignmentId]",
		);
	}
}
