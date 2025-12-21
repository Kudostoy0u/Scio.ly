import { dbPg } from "@/lib/db";
import { teamMemberships, teamSubteams, teams } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Team group information interface (V2 Aligned)
 */
export interface TeamGroupInfo {
	teamId: string;
	subteamIds: string[];
}

/**
 * Resolves a team slug to V2 team and subteam IDs
 */
export async function resolveTeamSlugToUnits(
	slug: string,
): Promise<TeamGroupInfo> {
	const [team] = await dbPg
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.slug, slug))
		.limit(1);

	if (!team) {
		throw new Error("Team not found");
	}

	const subteams = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, team.id));

	return {
		teamId: team.id,
		subteamIds: subteams.length > 0 ? subteams.map((s) => s.id) : [team.id],
	};
}

/**
 * Gets user team memberships (V2 Only)
 */
export async function getUserTeamMemberships(
	userId: string,
	teamUnitIds: string[],
) {
	return await dbPg
		.select({
			id: teamMemberships.id,
			role: teamMemberships.role,
			team_id: teamMemberships.teamId,
		})
		.from(teamMemberships)
		.where(
			and(
				eq(teamMemberships.userId, userId),
				inArray(teamMemberships.teamId, teamUnitIds),
				eq(teamMemberships.status, "active"),
			),
		);
}

/**
 * Checks if a user is a captain (V2 Only)
 */
export async function isUserCaptain(
	userId: string,
	teamUnitIds: string[],
): Promise<boolean> {
	const memberships = await getUserTeamMemberships(userId, teamUnitIds);
	return memberships.some((m) => m.role === "captain" || m.role === "admin");
}
