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
} from "@/lib/utils/error-handler";
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
			.select({ id: newTeamGroups.id, createdBy: newTeamGroups.createdBy })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team group");
		}

		const groupId = groupResult.id;
		const groupCreator = groupResult.createdBy;

		// Get team units for this group using Drizzle ORM
		const unitsResult = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		if (unitsResult.length === 0) {
			return handleNotFoundError("No team units found for this group");
		}

		const teamUnitIds = unitsResult.map((row) => row.id);

		// Allow team creator OR captains to archive the team
		if (groupCreator !== user.id) {
			// Check if user is a captain of any team unit in this group using Drizzle ORM
			const captainCheckResult = await dbPg
				.select({ role: newTeamMemberships.role })
				.from(newTeamMemberships)
				.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
				.where(
					and(
						eq(newTeamMemberships.userId, user.id),
						eq(newTeamUnits.groupId, groupId),
						eq(newTeamMemberships.status, "active"),
					),
				)
				.limit(1);

			if (captainCheckResult.length === 0) {
				return handleForbiddenError(
					"Only the team creator or captains can archive the team",
				);
			}

			const userRole = captainCheckResult[0]?.role;
			if (!(userRole && ["captain", "co_captain"].includes(userRole))) {
				return handleForbiddenError(
					"Only the team creator or captains can archive the team",
				);
			}
		}

		// Archive the team group, team units, and memberships using Drizzle ORM
		await dbPg.transaction(async (tx) => {
			// Archive the team group
			await tx
				.update(newTeamGroups)
				.set({
					status: "archived",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(newTeamGroups.id, groupId));

			// Archive all team units
			await tx
				.update(newTeamUnits)
				.set({
					status: "archived",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(newTeamUnits.groupId, groupId));

			// Archive all memberships
			await tx
				.update(newTeamMemberships)
				.set({ status: "archived" })
				.where(inArray(newTeamMemberships.teamId, teamUnitIds));
		});

		return NextResponse.json({ message: "Team successfully archived" });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/archive");
	}
}
