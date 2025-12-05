import { dbPg } from "@/lib/db";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamRosterData,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import { syncPeopleFromRosterForSubteam } from "@/lib/trpc/routers/teams/helpers/people-sync";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/error-handler";
import { checkTeamGroupLeadershipCockroach } from "@/lib/utils/team-auth";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/members/remove - Remove a linked member from team and purge roster entries
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (removeMember)
export async function POST(
	request: NextRequest,
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
		let body: unknown;
		try {
			body = await request.json();
		} catch (_error) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Invalid JSON in request body",
						path: [],
					},
				]),
			);
		}

		// Validate request body
		const RemoveMemberSchema = z.object({
			userId: UUIDSchema,
		});

		let validatedBody: z.infer<typeof RemoveMemberSchema>;
		try {
			validatedBody = validateRequest(RemoveMemberSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"POST /api/teams/[teamId]/members/remove - validation",
			);
		}

		const { userId } = validatedBody;

		// Resolve slug to group id using Drizzle ORM
		const [groupResult] = await dbPg
			.select({ id: newTeamGroups.id })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (!groupResult) {
			return handleNotFoundError("Team group");
		}

		const groupId = groupResult.id;

		// Ensure requester has leadership privileges in this group
		const leadershipResult = await checkTeamGroupLeadershipCockroach(
			user.id,
			groupId,
		);
		if (!leadershipResult.hasLeadership) {
			return handleForbiddenError(
				"Only captains and co-captains can remove members",
			);
		}

		// Get all team units for this group using Drizzle ORM
		const teamUnits = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		const teamUnitIds = teamUnits.map((u) => u.id);

		if (teamUnitIds.length === 0) {
			return NextResponse.json({ message: "Member removed successfully" }); // No team units, nothing to remove
		}

		// Remove team memberships for this user within the group using Drizzle ORM
		await dbPg
			.delete(newTeamMemberships)
			.where(
				and(
					eq(newTeamMemberships.userId, userId),
					inArray(newTeamMemberships.teamId, teamUnitIds),
				),
			);

		// Purge their roster entries across the group using Drizzle ORM
		const deletedRoster = await dbPg
			.delete(newTeamRosterData)
			.where(
				and(
					eq(newTeamRosterData.userId, userId),
					inArray(newTeamRosterData.teamUnitId, teamUnitIds),
				),
			)
			.returning({ teamUnitId: newTeamRosterData.teamUnitId });

		// Sync people table for all affected subteams
		const affectedSubteamIds = [
			...new Set(deletedRoster.map((r) => r.teamUnitId)),
		];
		for (const subteamIdToSync of affectedSubteamIds) {
			await syncPeopleFromRosterForSubteam(subteamIdToSync);
		}

		return NextResponse.json({ message: "Member removed successfully" });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/members/remove");
	}
}
