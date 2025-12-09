import { dbPg } from "@/lib/db";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamUnits,
} from "@/lib/db/schema/teams";
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
			.select({ id: newTeamGroups.id })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team group");
		}

		const groupId = groupResult.id;

		// Get team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found for this group");
		}

		const teamUnitIds = unitsResult.map((row) => row.id);

		// Check if user is captain or co-captain of any team unit using Drizzle ORM
		const membershipResult = await dbPg
			.select({
				id: newTeamMemberships.id,
				role: newTeamMemberships.role,
				teamId: newTeamMemberships.teamId,
			})
			.from(newTeamMemberships)
			.where(
				and(
					eq(newTeamMemberships.userId, user.id),
					inArray(newTeamMemberships.teamId, teamUnitIds),
					eq(newTeamMemberships.status, "active"),
				),
			);

		if (membershipResult.length === 0) {
			return handleForbiddenError("Not a team member");
		}

		const captainMemberships = membershipResult.filter((m) =>
			["captain", "co_captain"].includes(m.role),
		);

		if (captainMemberships.length === 0) {
			return handleForbiddenError("Only captains can view team codes");
		}

		// Get team codes from the first team unit using Drizzle ORM
		const [teamResult] = await dbPg
			.select({
				captainCode: newTeamUnits.captainCode,
				userCode: newTeamUnits.userCode,
			})
			.from(newTeamUnits)
			.where(eq(newTeamUnits.id, teamUnitIds[0] ?? ""))
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
