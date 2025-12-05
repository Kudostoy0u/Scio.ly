import { dbPg } from "@/lib/db";
import {
	newTeamAssignmentQuestions,
	newTeamAssignmentRoster,
	newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { newTeamGroups, newTeamUnits } from "@/lib/db/schema/teams";
import { getServerUser } from "@/lib/supabaseServer";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/assignments-new/[id] - Get assignment by UUID (returns old format)
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

		// Get assignment details with team info
		const assignmentResult = await dbPg
			.select({
				id: newTeamAssignments.id,
				title: newTeamAssignments.title,
				description: newTeamAssignments.description,
				eventName: newTeamAssignments.eventName,
				school: newTeamGroups.school,
				division: newTeamGroups.division,
				teamId: newTeamUnits.id,
				createdBy: newTeamAssignments.createdBy,
				createdAt: newTeamAssignments.createdAt,
			})
			.from(newTeamAssignments)
			.innerJoin(newTeamUnits, eq(newTeamAssignments.teamId, newTeamUnits.id))
			.innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
			.where(eq(newTeamAssignments.id, id))
			.limit(1);

		if (assignmentResult.length === 0) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		const assignment = assignmentResult[0];
		if (!assignment) {
			return NextResponse.json(
				{ error: "Assignment not found" },
				{ status: 404 },
			);
		}

		// Get assignment questions
		const questionsResult = await dbPg
			.select({
				id: newTeamAssignmentQuestions.id,
				questionText: newTeamAssignmentQuestions.questionText,
				questionType: newTeamAssignmentQuestions.questionType,
				options: newTeamAssignmentQuestions.options,
				correctAnswer: newTeamAssignmentQuestions.correctAnswer,
				points: newTeamAssignmentQuestions.points,
				orderIndex: newTeamAssignmentQuestions.orderIndex,
				imageData: newTeamAssignmentQuestions.imageData,
			})
			.from(newTeamAssignmentQuestions)
			.where(eq(newTeamAssignmentQuestions.assignmentId, id))
			.orderBy(newTeamAssignmentQuestions.orderIndex);

		// Get roster assignments
		const rosterResult = await dbPg
			.select({
				studentName: newTeamAssignmentRoster.studentName,
				userId: newTeamAssignmentRoster.userId,
				email: users.email,
				username: users.username,
			})
			.from(newTeamAssignmentRoster)
			.leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
			.where(eq(newTeamAssignmentRoster.assignmentId, id));

		// Transform questions to match old format
		const questions = questionsResult.map((q) => {
			// Transform options to array of strings if they're objects
			let options = q.options || [];
			if (Array.isArray(options) && options.length > 0) {
				// If options are objects with text property, extract the text
				if (
					typeof options[0] === "object" &&
					options[0] &&
					"text" in options[0]
				) {
					options = options.map((opt: { text?: string } | string) =>
						typeof opt === "object" && opt !== null && "text" in opt
							? opt.text
							: opt,
					);
				}
				// If options are already strings, keep them as is
			}

			return {
				id: q.id,
				question: q.questionText, // Map questionText to question
				questionType: q.questionType,
				options: options,
				correctAnswer: q.correctAnswer,
				points: q.points,
				orderIndex: q.orderIndex,
				imageData: q.imageData, // Include image data
			};
		});

		// Transform roster to match old format
		const assignees = rosterResult.map((r) => ({
			name: r.studentName,
			userId: r.userId,
			email: r.email,
			username: r.username,
		}));

		// Return in old format
		const assignmentData = {
			id: assignment.id,
			title: assignment.title,
			eventName: assignment.eventName,
			school: assignment.school,
			division: assignment.division,
			teamId: assignment.teamId,
			createdBy: assignment.createdBy,
			createdAt: assignment.createdAt,
			questions: questions,
			assignees: assignees,
			params: {
				eventName: assignment.eventName,
				questionCount: questions.length,
			},
		};

		return NextResponse.json({ assignment: assignmentData });
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
