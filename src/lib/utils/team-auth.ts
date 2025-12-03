import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamRosterData,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import logger from "@/lib/utils/logger";
import { and, count, eq, or, sql } from "drizzle-orm";

// Simple in-memory cache for auth results to avoid repeated database queries
const authCache = new Map<
	string,
	{ result: TeamAuthResult; timestamp: number }
>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

// Cleanup expired cache entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of authCache.entries()) {
		if (now - value.timestamp > CACHE_TTL) {
			authCache.delete(key);
		}
	}
}, CACHE_TTL); // Run cleanup every 30 seconds

export interface TeamAuthResult {
	isAuthorized: boolean;
	hasMembership: boolean;
	hasRosterEntry: boolean;
	role?: string;
	error?: string;
}

/**
 * Check if a user is authorized to access a team group.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 */
export async function checkTeamGroupAccess(
	userId: string,
	groupId: string,
): Promise<TeamAuthResult> {
	try {
		// Check for active team membership using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, userId),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			);
		const hasMembership = membershipResult.length > 0;
		const role =
			hasMembership && membershipResult[0]
				? membershipResult[0].role
				: undefined;

		// Check for roster entries (user's name appears in roster) using Drizzle ORM
		const rosterResult = await dbPg
			.select({ count: sql<number>`count(*)` })
			.from(newTeamRosterData)
			.innerJoin(
				newTeamUnits,
				eq(newTeamRosterData.teamUnitId, newTeamUnits.id),
			)
			.where(
				and(
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamRosterData.userId, userId),
				),
			);

		// Also check for any roster entries by student name (in case user_id is null)
		// We need to get the user's display name first
		const userResult = await dbPg
			.select({
				displayName: users.displayName,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
			.where(eq(users.id, userId));

		const userDisplayName = userResult[0]?.displayName;
		const userFirstName = userResult[0]?.firstName;
		const userLastName = userResult[0]?.lastName;

		// Debug: Check what subteams exist in this group
		await dbPg
			.select({
				id: newTeamUnits.id,
				teamId: newTeamUnits.teamId,
				description: newTeamUnits.description,
			})
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, groupId));

		let hasRosterEntry = (rosterResult[0]?.count ?? 0) > 0;

		// If no roster entries by userId, check by name
		if (!hasRosterEntry && (userDisplayName || userFirstName || userLastName)) {
			// Try different name combinations (remove duplicates)
			const possibleNames = [
				userDisplayName,
				userFirstName,
				userLastName,
				userFirstName && userLastName
					? `${userFirstName} ${userLastName}`
					: null,
				userLastName && userFirstName
					? `${userLastName}, ${userFirstName}`
					: null,
			].filter(Boolean);

			// Remove duplicates using Set
			const uniqueNames = [...new Set(possibleNames)];

			for (const name of uniqueNames) {
				if (!name) {
					continue;
				}

				const rosterByNameResult = await dbPg
					.select({ count: sql<number>`count(*)` })
					.from(newTeamRosterData)
					.innerJoin(
						newTeamUnits,
						eq(newTeamRosterData.teamUnitId, newTeamUnits.id),
					)
					.where(
						and(
							eq(newTeamUnits.groupId, groupId),
							eq(newTeamRosterData.studentName, name),
						),
					);
				if ((rosterByNameResult[0]?.count ?? 0) > 0) {
					hasRosterEntry = true;
					break;
				}
			}
		}

		// Special case: Team creators should maintain access even without membership or roster entries
		let isAuthorized = hasMembership || hasRosterEntry;

		if (!isAuthorized) {
			// Check if user is the creator of this team group
			const teamGroupResult = await dbPg
				.select({ createdBy: newTeamGroups.createdBy })
				.from(newTeamGroups)
				.where(eq(newTeamGroups.id, groupId));

			const isTeamCreator =
				teamGroupResult.length > 0 && teamGroupResult[0]?.createdBy === userId;

			if (isTeamCreator) {
				isAuthorized = true;
			}
		}

		return {
			isAuthorized,
			hasMembership,
			hasRosterEntry,
			role,
		};
	} catch (error) {
		logger.error(
			"Failed to check team group access",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
				groupId,
			},
		);
		return {
			isAuthorized: false,
			hasMembership: false,
			hasRosterEntry: false,
			error: error instanceof Error ? error.message : "Database error",
		};
	}
}

/**
 * Check if a user has leadership privileges (captain/co_captain) in a team group
 */
export async function checkTeamGroupLeadership(
	userId: string,
	groupId: string,
): Promise<{ hasLeadership: boolean; role?: string }> {
	try {
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, userId),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			);

		if (membershipResult.length > 0) {
			const role = membershipResult[0]?.role;
			if (!role) {
				return { hasLeadership: false };
			}
			const hasLeadership = ["captain", "co_captain"].includes(role);
			return { hasLeadership, role };
		}

		// If no active membership, check if user is the team creator
		const teamGroupResult = await dbPg
			.select({ createdBy: newTeamGroups.createdBy })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.id, groupId));

		const isTeamCreator =
			teamGroupResult.length > 0 && teamGroupResult[0]?.createdBy === userId;

		if (isTeamCreator) {
			return { hasLeadership: true, role: "creator" };
		}

		return { hasLeadership: false };
	} catch (error) {
		logger.error(
			"Failed to check team group leadership",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
				groupId,
			},
		);
		return { hasLeadership: false };
	}
}

/**
 * Check if a user is authorized to access a team group using CockroachDB.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 */
export async function checkTeamGroupAccessCockroach(
	userId: string,
	groupId: string,
): Promise<TeamAuthResult> {
	try {
		// Check cache first
		const cacheKey = `${userId}:${groupId}`;
		const cached = authCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return cached.result;
		}

		// Check for active team membership
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, userId),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			);

		const hasMembership = membershipResult.length > 0;
		const role =
			hasMembership && membershipResult[0]
				? membershipResult[0].role
				: undefined;

		// Check for roster entries (user's name appears in roster)
		const [rosterResult] = await dbPg
			.select({ count: count() })
			.from(newTeamRosterData)
			.innerJoin(
				newTeamUnits,
				eq(newTeamRosterData.teamUnitId, newTeamUnits.id),
			)
			.where(
				and(
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamRosterData.userId, userId),
				),
			);

		let hasRosterEntry = (rosterResult?.count ?? 0) > 0;

		// If no roster entries by userId, check by name with a single optimized query
		if (!hasRosterEntry) {
			// Get user names
			const [userInfo] = await dbPg
				.select({
					display_name: users.displayName,
					first_name: users.firstName,
					last_name: users.lastName,
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			const userDisplayName = userInfo?.display_name;
			const userFirstName = userInfo?.first_name;
			const userLastName = userInfo?.last_name;

			if (userDisplayName || userFirstName || userLastName) {
				// Use a single optimized query to check for roster entries
				// This replaces the multiple permutation approach with a single efficient query
				const possibleNames = [
					userDisplayName,
					userFirstName,
					userLastName,
					userFirstName && userLastName
						? `${userFirstName} ${userLastName}`
						: null,
					userLastName && userFirstName
						? `${userLastName}, ${userFirstName}`
						: null,
				].filter((name): name is string => name !== null);

				if (possibleNames.length > 0) {
					const [rosterByNameResult] = await dbPg
						.select({ count: count() })
						.from(newTeamRosterData)
						.innerJoin(
							newTeamUnits,
							eq(newTeamRosterData.teamUnitId, newTeamUnits.id),
						)
						.where(
							and(
								eq(newTeamUnits.groupId, groupId),
								or(
									...possibleNames.map((name) =>
										eq(newTeamRosterData.studentName, name),
									),
								),
							),
						);

					if ((rosterByNameResult?.count ?? 0) > 0) {
						hasRosterEntry = true;
					}
				}
			}
		}

		// Special case: Team creators should maintain access even without membership or roster entries
		let isAuthorized = hasMembership || hasRosterEntry;

		if (!isAuthorized) {
			// Check if user is the creator of this team group
			const [teamGroupResult] = await dbPg
				.select({ createdBy: newTeamGroups.createdBy })
				.from(newTeamGroups)
				.where(eq(newTeamGroups.id, groupId))
				.limit(1);

			const isTeamCreator = teamGroupResult?.createdBy === userId;

			if (isTeamCreator) {
				isAuthorized = true;
			}
		}

		const result = {
			isAuthorized,
			hasMembership,
			hasRosterEntry,
			role,
		};

		// Cache the result
		authCache.set(cacheKey, { result, timestamp: Date.now() });

		return result;
	} catch (error) {
		logger.error(
			"Failed to check team group access (CockroachDB)",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
				groupId,
			},
		);
		return {
			isAuthorized: false,
			hasMembership: false,
			hasRosterEntry: false,
			error: error instanceof Error ? error.message : "Database error",
		};
	}
}

/**
 * Check if a user has leadership privileges (captain/co_captain) in a team group using CockroachDB
 */
export async function checkTeamGroupLeadershipCockroach(
	userId: string,
	groupId: string,
): Promise<{ hasLeadership: boolean; role?: string }> {
	try {
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, userId),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			);

		if (membershipResult.length > 0) {
			const role = membershipResult[0]?.role;
			if (!role) {
				return { hasLeadership: false, role: "member" };
			}
			const hasLeadership = ["captain", "co_captain"].includes(role);
			return { hasLeadership, role };
		}

		// If no active membership, check if user is the team creator
		const [teamGroupResult] = await dbPg
			.select({ createdBy: newTeamGroups.createdBy })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.id, groupId))
			.limit(1);

		const isTeamCreator = teamGroupResult?.createdBy === userId;

		if (isTeamCreator) {
			return { hasLeadership: true, role: "creator" };
		}

		return { hasLeadership: false };
	} catch (error) {
		logger.error(
			"Failed to check team group leadership",
			error instanceof Error ? error : new Error(String(error)),
			{
				userId,
				groupId,
			},
		);
		return { hasLeadership: false };
	}
}
