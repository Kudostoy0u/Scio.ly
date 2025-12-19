import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamMemberships } from "@/lib/db/schema";
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
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const user = await getServerUser();
		if (!user?.id) return handleUnauthorizedError();

		const { teamId } = await params;
		// const { searchParams } = new URL(request.url);
		// const _subteamId = searchParams.get("subteamId");

		const teamInfo = await resolveTeamSlugToUnits(teamId);
		const memberships = await getUserTeamMemberships(
			user.id,
			teamInfo.subteamIds,
		);
		if (memberships.length === 0) return handleForbiddenError();

		const membersResult = await dbPg
			.select({
				userId: users.id,
				name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
				email: users.email,
				username: users.username,
				role: teamMemberships.role,
				joinedAt: teamMemberships.joinedAt,
			})
			.from(teamMemberships)
			.innerJoin(users, eq(teamMemberships.userId, users.id))
			.where(
				and(
					eq(teamMemberships.teamId, teamInfo.teamId),
					eq(teamMemberships.status, "active"),
				),
			);

		return NextResponse.json({ members: membersResult });
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/members");
	}
}
