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

// POST /api/teams/[teamId]/archive - Archive team
export async function POST(
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
			.select({ id: teams.id, createdBy: teams.createdBy })
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team group");
		}

		const groupId = groupResult.id;
		const groupCreator = groupResult.createdBy;

		// Get team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: teamSubteams.id })
			.from(teamSubteams)
			.where(eq(teamSubteams.teamId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found for this group");
		}

		const teamUnitIds = unitsResult.map((row) => row.id);

		// Allow team creator OR captains to archive the team
		if (groupCreator !== user.id) {
			// Check if user is a captain of any team unit in this group using Drizzle ORM
			const captainCheckResult = await dbPg
				.select({ role: teamMemberships.role })
				.from(teamMemberships)
				.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
				.where(
					and(
						eq(teamMemberships.userId, user.id),
						eq(teamSubteams.teamId, groupId),
						eq(teamMemberships.status, "active"),
					),
				)
				.limit(1);

			if (captainCheckResult.length === 0) {
				return handleForbiddenError(
					"Only the team creator or captains can archive the team",
				);
			}

			const userRole = captainCheckResult[0]?.role;
			if (!(userRole && userRole === "captain")) {
				return handleForbiddenError(
					"Only the team creator or captains can archive the team",
				);
			}
		}

		// Archive the team group, team units, and memberships using Drizzle ORM
		await dbPg.transaction(async (tx) => {
			// Archive the team group
			await tx
				.update(teams)
				.set({
					status: "archived",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teams.id, groupId));

			// Archive all team units
			await tx
				.update(teamSubteams)
				.set({
					status: "archived",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teamSubteams.teamId, groupId));

			// Archive all memberships
			await tx
				.update(teamMemberships)
				.set({ status: "archived" })
				.where(inArray(teamMemberships.teamId, teamUnitIds));
		});

		return NextResponse.json({ message: "Team successfully archived" });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/archive");
	}
}
