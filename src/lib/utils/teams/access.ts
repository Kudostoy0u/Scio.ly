import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { teamMemberships, teamRoster, teams } from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq } from "drizzle-orm";
import { generateDisplayName } from "../content/displayNameUtils";

export interface TeamAccessResult {
	hasAccess: boolean;
	isCreator: boolean;
	hasMembership?: boolean;
	hasRosterEntries: boolean;
	role?: string;
	memberships?: Array<{
		teamId: string;
		role: string;
	}>;
}

/**
 * Get comprehensive team access information for a user (V2 Only)
 */
export async function getTeamAccess(
	userId: string,
	teamId: string,
): Promise<TeamAccessResult> {
	try {
		// 1. Check if user is the team creator
		const [team] = await dbPg
			.select({ createdBy: teams.createdBy })
			.from(teams)
			.where(eq(teams.id, teamId))
			.limit(1);

		const isCreator = team?.createdBy === userId;

		// 2. Get memberships
		const memberships = await dbPg
			.select({
				teamId: teamMemberships.teamId,
				role: teamMemberships.role,
			})
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, userId),
					eq(teamMemberships.teamId, teamId),
					eq(teamMemberships.status, "active"),
				),
			);

		const hasMembership = memberships.length > 0;
		const role = memberships[0]?.role;

		// 3. Get roster entries
		const rosterResult = await dbPg
			.select({ id: teamRoster.id })
			.from(teamRoster)
			.where(and(eq(teamRoster.teamId, teamId), eq(teamRoster.userId, userId)))
			.limit(1);

		const hasRosterEntries = rosterResult.length > 0;
		const hasAccess = isCreator || hasMembership || hasRosterEntries;

		return {
			hasAccess,
			isCreator,
			hasMembership,
			hasRosterEntries,
			role,
			memberships,
		};
	} catch (error) {
		logger.error("Failed to get team access", error as Error);
		return {
			hasAccess: false,
			isCreator: false,
			hasMembership: false,
			hasRosterEntries: false,
			memberships: [],
		};
	}
}

/**
 * Check if user has leadership privileges (V2 Only)
 */
export async function hasLeadershipAccess(
	userId: string,
	teamId: string,
): Promise<boolean> {
	const access = await getTeamAccess(userId, teamId);
	return (
		access.isCreator || access.role === "captain" || access.role === "admin"
	);
}

/**
 * Get user's display information
 */
export async function getUserDisplayInfo(userId: string) {
	const [user] = await dbPg
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!user) return { name: "Unknown", email: "" };

	const { name } = generateDisplayName(user, userId);
	return {
		name,
		email: user.email,
		username: user.username,
	};
}
