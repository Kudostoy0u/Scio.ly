import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
	newTeamGroups,
	newTeamMemberships,
	newTeamRosterData,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
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
		const { searchParams } = new URL(request.url);
		const subteamId = searchParams.get("subteamId");

		// Validate subteamId if provided
		if (subteamId) {
			try {
				UUIDSchema.parse(subteamId);
			} catch (error) {
				if (error instanceof z.ZodError) {
					return handleValidationError(error);
				}
			}
		}

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

		// Check if user is a member of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.userId, user.id),
					eq(newTeamMemberships.status, "active"),
				),
			);

		if (membershipResult.length === 0) {
			return handleForbiddenError("Forbidden");
		}

		// Build where conditions for team units
		const teamUnitsWhere = [eq(newTeamUnits.groupId, groupId)];
		if (subteamId) {
			teamUnitsWhere.push(eq(newTeamUnits.id, subteamId));
		}

		// Get team units using Drizzle ORM
		const teamUnits = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(and(...teamUnitsWhere));

		const teamUnitIds = teamUnits.map((u) => u.id);

		if (teamUnitIds.length === 0) {
			return NextResponse.json({ linkStatus: {} });
		}

		// Get team members from memberships table using Drizzle ORM
		const membersWhere = [
			inArray(newTeamMemberships.teamId, teamUnitIds),
			eq(newTeamMemberships.status, "active"),
		];

		const membersResult = await dbPg
			.select({
				user_id: newTeamMemberships.userId,
				role: newTeamMemberships.role,
				joined_at: newTeamMemberships.joinedAt,
				team_unit_id: newTeamUnits.id,
				team_id: newTeamUnits.teamId,
				description: newTeamUnits.description,
			})
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(and(...membersWhere));

		// Get roster data if it exists (for additional student names) using Drizzle ORM
		const rosterWhere = [inArray(newTeamRosterData.teamUnitId, teamUnitIds)];
		if (subteamId) {
			rosterWhere.push(eq(newTeamRosterData.teamUnitId, subteamId));
		}

		const rosterResult = await dbPg
			.select({
				student_name: newTeamRosterData.studentName,
				user_id: newTeamRosterData.userId,
				team_unit_id: newTeamRosterData.teamUnitId,
			})
			.from(newTeamRosterData)
			.where(and(...rosterWhere));

		// Get real user data using Drizzle ORM
		const userIds = membersResult.map((member) => member.user_id);

		if (userIds.length === 0) {
			// No members, but might have roster entries
			const linkStatus: Record<string, unknown> = {};
			for (const rosterEntry of rosterResult) {
				if (rosterEntry.student_name) {
					linkStatus[rosterEntry.student_name] = {
						userId: rosterEntry.user_id,
						isLinked: !!rosterEntry.user_id,
						userEmail: null,
						username: null,
						teamUnitId: rosterEntry.team_unit_id,
					};
				}
			}
			return NextResponse.json({ linkStatus });
		}

		// Fetch user profiles using Drizzle ORM
		const userProfilesResult = await dbPg
			.select({
				id: users.id,
				display_name: users.displayName,
				email: users.email,
				first_name: users.firstName,
				last_name: users.lastName,
				username: users.username,
			})
			.from(users)
			.where(inArray(users.id, userIds));

		// Create a map of user profiles for quick lookup
		const userProfileMap = new Map<string, (typeof userProfilesResult)[0]>();
		for (const profile of userProfilesResult) {
			userProfileMap.set(profile.id, profile);
		}

		// Build link status object
		const linkStatus: Record<string, unknown> = {};

		// First, add all team members from memberships
		for (const member of membersResult) {
			// Get real user data
			const userProfile = userProfileMap.get(member.user_id);
			const displayName =
				userProfile?.display_name ||
				(userProfile?.first_name && userProfile?.last_name
					? `${userProfile.first_name} ${userProfile.last_name}`
					: `User ${member.user_id.substring(0, 8)}`);
			const email =
				userProfile?.email ||
				`user-${member.user_id.substring(0, 8)}@example.com`;
			const username = userProfile?.username;

			linkStatus[displayName] = {
				userId: member.user_id,
				isLinked: true,
				userEmail: email,
				username: username,
				role: member.role,
				teamUnitId: member.team_unit_id,
			};
		}

		// Group roster entries by student name to handle multiple entries per student
		const rosterByStudent: Record<
			string,
			{ userId: string | null; teamUnitId: string; isLinked: boolean }
		> = {};

		for (const rosterEntry of rosterResult) {
			if (rosterEntry.student_name) {
				const studentName = rosterEntry.student_name;

				// If this student already exists, update the link status
				if (rosterByStudent[studentName]) {
					// Mark as linked if ANY entry for this student is linked
					rosterByStudent[studentName].isLinked =
						rosterByStudent[studentName].isLinked || !!rosterEntry.user_id;
					// Use the first non-null user_id we find
					if (!rosterByStudent[studentName].userId && rosterEntry.user_id) {
						rosterByStudent[studentName].userId = rosterEntry.user_id;
					}
				} else {
					// First entry for this student
					rosterByStudent[studentName] = {
						userId: rosterEntry.user_id,
						teamUnitId: rosterEntry.team_unit_id,
						isLinked: !!rosterEntry.user_id,
					};
				}
			}
		}

		// Then, add roster entries to linkStatus
		for (const [studentName, rosterData] of Object.entries(rosterByStudent)) {
			// Get user data if this roster entry is linked
			let userEmail: string | null = null;
			let username: string | null = null;
			if (rosterData.userId) {
				const userProfile = userProfileMap.get(rosterData.userId);
				userEmail =
					userProfile?.email ||
					`user-${rosterData.userId.substring(0, 8)}@example.com`;
				username = userProfile?.username ?? null;
			}

			linkStatus[studentName] = {
				userId: rosterData.userId,
				isLinked: rosterData.isLinked,
				userEmail: userEmail,
				username: username,
				teamUnitId: rosterData.teamUnitId,
			};
		}

		return NextResponse.json({ linkStatus });
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/roster/link-status");
	}
}
