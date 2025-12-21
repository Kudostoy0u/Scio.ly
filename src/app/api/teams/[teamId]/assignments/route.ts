import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamAssignments } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleUnauthorizedError,
} from "@/lib/utils/teams/errors";
import {
	getUserTeamMemberships,
	resolveTeamSlugToUnits,
} from "@/lib/utils/teams/resolver";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		const teamInfo = await resolveTeamSlugToUnits(teamId);
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.subteamIds,
		);

		if (memberships.length === 0) return handleForbiddenError();

		const assignmentsResult = await dbPg
			.select({
				id: teamAssignments.id,
				title: teamAssignments.title,
				description: teamAssignments.description,
				dueDate: teamAssignments.dueDate,
				status: teamAssignments.status,
				createdAt: teamAssignments.createdAt,
				createdBy: teamAssignments.createdBy,
				creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
			})
			.from(teamAssignments)
			.innerJoin(users, eq(teamAssignments.createdBy, users.id))
			.where(
				or(
					eq(teamAssignments.teamId, teamInfo.teamId),
					inArray(teamAssignments.subteamId, teamInfo.subteamIds),
				),
			)
			.orderBy(desc(teamAssignments.createdAt));

		return NextResponse.json({ assignments: assignmentsResult });
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/assignments");
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		const body = await request.json();
		const teamInfo = await resolveTeamSlugToUnits(teamId);

		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.subteamIds,
		);
		const isCaptain = memberships.some(
			(m) => m.role === "captain" || m.role === "admin",
		);

		if (!isCaptain)
			return handleForbiddenError("Only captains can create assignments");

		const [assignment] = await dbPg
			.insert(teamAssignments)
			.values({
				teamId: teamInfo.teamId, // Use group ID for team-wide assignments
				title: body.title,
				description: body.description,
				dueDate: body.dueDate,
				createdBy: user.id,
				status: "open",
			})
			.returning();

		return NextResponse.json({ assignment });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/assignments");
	}
}
