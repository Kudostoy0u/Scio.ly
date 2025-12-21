import { dbPg } from "@/lib/db";
import { teamSubteams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function generateNextTeamId(groupId: string): Promise<string> {
	const existingTeams = await dbPg
		.select({ teamId: teamSubteams.teamId })
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, groupId))
		.orderBy(teamSubteams.teamId);

	const existingTeamIds = existingTeams.map((t) => t.teamId);
	let nextTeamId = "A";
	let teamIdCounter = 0;

	while (existingTeamIds.includes(nextTeamId)) {
		teamIdCounter++;
		nextTeamId = String.fromCharCode(65 + teamIdCounter); // A=65, B=66, C=67, etc.
		if (teamIdCounter > 25) {
			// If we go beyond Z, use numbers
			nextTeamId = (teamIdCounter - 25).toString();
		}
	}

	return nextTeamId;
}
