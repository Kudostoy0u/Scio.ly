import { dbPg } from "@/lib/db";
import { teamAssignments } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export type AssignmentQuestion = {
	questionText: string;
	questionType: "multiple_choice" | "free_response" | "codebusters";
	options?: string[];
	correctAnswer?: string;
	points?: number;
	imageData?: string | null;
	difficulty?: number;
};

export async function listAssignments(teamSlug: string, userId: string) {
	const { team } = await assertTeamAccess(teamSlug, userId);

	const assignments = await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			dueDate: teamAssignments.dueDate,
			status: teamAssignments.status,
			createdAt: teamAssignments.createdAt,
			createdBy: teamAssignments.createdBy,
		})
		.from(teamAssignments)
		.where(eq(teamAssignments.teamId, team.id))
		.orderBy(desc(teamAssignments.createdAt));

	return assignments.map((a) => {
		let metadata = {
			eventName: null,
			assignmentType: "task",
			timeLimitMinutes: null,
			questionsCount: 0,
		};
		if (a.description?.startsWith("METADATA:")) {
			try {
				const jsonPart = a.description.substring(9);
				metadata = JSON.parse(jsonPart);
			} catch {
				// Fallback
			}
		}

		return {
			...a,
			...metadata,
		};
	});
}

export async function createAssignment(
	teamSlug: string,
	userId: string,
	payload: {
		title: string;
		description?: string | null;
		assignmentType?: "task" | "quiz" | "exam";
		dueDate?: string | null;
		eventName?: string | null;
		timeLimitMinutes?: number | null;
		questions?: AssignmentQuestion[];
	},
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	const metadata = {
		eventName: payload.eventName,
		assignmentType: payload.assignmentType,
		timeLimitMinutes: payload.timeLimitMinutes,
		questions: payload.questions || [],
	};

	const description = `METADATA:${JSON.stringify(metadata)}`;

	const [assignment] = await dbPg
		.insert(teamAssignments)
		.values({
			teamId: team.id,
			title: payload.title,
			description: description,
			dueDate: payload.dueDate,
			createdBy: userId,
			status: "open",
		})
		.returning();

	return assignment;
}

export async function deleteAssignment(
	teamSlug: string,
	assignmentId: string,
	userId: string,
) {
	const { team } = await assertCaptainAccess(teamSlug, userId);

	await dbPg
		.delete(teamAssignments)
		.where(
			and(
				eq(teamAssignments.id, assignmentId),
				eq(teamAssignments.teamId, team.id),
			),
		);

	return { success: true };
}

export async function getAssignmentDetails(
	assignmentId: string,
	userId: string,
) {
	const [assignment] = await dbPg
		.select()
		.from(teamAssignments)
		.where(eq(teamAssignments.id, assignmentId))
		.limit(1);

	if (!assignment) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
	}

	await assertTeamAccess(assignment.teamId, userId);

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
			// Fail
		}
	}

	return {
		...assignment,
		...metadata,
	};
}
