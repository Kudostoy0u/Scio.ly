import { dbPg } from "@/lib/db";
import { teamMemberships, teamSubteams, teams } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/teams/[teamId]/codes - Get team join codes
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	try {
		const envError = validateEnvironment();
		if (envError) {
			return envError;
		}

		const user = await getServerUser();
		if (!user?.id) {
			return handleUnauthorizedError();
		}

		const { teamId } = await params;

		// Resolve the slug to team group using Drizzle ORM
		const [groupResult] = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team group");
		}

		const groupId = groupResult.id;

		// Get team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: teamSubteams.id })
			.from(teamSubteams)
			.where(eq(teamSubteams.teamId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found for this group");
		}

		const teamUnitIds = unitsResult.map((row) => row.id);

		// Check if user is captain or co-captain of any team unit using Drizzle ORM
		const membershipResult = await dbPg
			.select({
				id: teamMemberships.id,
				role: teamMemberships.role,
				teamId: teamMemberships.teamId,
			})
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					inArray(teamMemberships.teamId, teamUnitIds),
					eq(teamMemberships.status, "active"),
				),
			);

		if (membershipResult.length === 0) {
			return handleForbiddenError("Not a team member");
		}

		const captainMemberships = membershipResult.filter(
			(m) => m.role === "captain",
		);

		if (captainMemberships.length === 0) {
			return handleForbiddenError("Only captains can view team codes");
		}

		// Get team codes from the first team unit using Drizzle ORM
		const [teamResult] = await dbPg
			.select({
				captainCode: teamSubteams.captainCode,
				userCode: teamSubteams.userCode,
			})
			.from(teamSubteams)
			.where(eq(teamSubteams.id, teamUnitIds[0] ?? ""))
			.limit(1);

		if (!teamResult) {
			return handleNotFoundError("Team");
		}

		return NextResponse.json({
			captainCode: teamResult.captainCode,
			userCode: teamResult.userCode,
		});
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/codes");
	}
}
