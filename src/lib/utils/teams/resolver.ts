import { dbPg } from "@/lib/db";
import { teamSubteams, teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
