import { dbPg } from "@/lib/db";
import { teamAssignments } from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import {
	teamMemberships,
	teamRoster,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

export async function resolveTeamSlugToGroupId(teamSlug: string) {
	const groupResult = await dbPg
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.slug, teamSlug));

	if (groupResult.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
	}

	const groupId = groupResult[0]?.id;
	if (!groupId) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
	}

	return groupId;
}

export async function getGroupBySlug(teamSlug: string) {
	const groupResult = await dbPg
		.select({
			id: teams.id,
			school: teams.school,
			division: teams.division,
			slug: teams.slug,
		})
		.from(teams)
		.where(eq(teams.slug, teamSlug));

	if (groupResult.length === 0) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
	}

	const group = groupResult[0];
	if (!group) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Team group not found" });
	}

	return group;
}

export async function getActiveTeamUnitIds(groupId: string) {
	const teamUnits = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, groupId), eq(teamSubteams.status, "active")),
		);

	return teamUnits.map((unit) => unit.id);
}

export async function getUsersWithRosterEntries(groupId: string) {
	const usersWithRosterEntries = await dbPg
		.select({
			userId: teamRoster.userId,
		})
		.from(teamRoster)
		.innerJoin(teamSubteams, eq(teamRoster.subteamId, teamSubteams.id))
		.where(
			and(
				eq(teamSubteams.teamId, groupId),
				eq(teamSubteams.status, "active"),
				isNotNull(teamRoster.userId),
			),
		)
		.groupBy(teamRoster.userId);

	return new Set(
		usersWithRosterEntries
			.map((r) => r.userId)
			.filter((id): id is string => id !== null),
	);
}

export async function getMembersWithSubteamMemberships(
	whereCondition: ReturnType<typeof and>,
) {
	return await dbPg
		.select({
			userId: teamMemberships.userId,
			role: teamMemberships.role,
			joinedAt: teamMemberships.joinedAt,
			subteamId: teamMemberships.teamId,
			// Use description for display name, fallback to "Team {teamId}"
			subteamName: sql<string>`COALESCE(${teamSubteams.description}, CONCAT('Team ', ${teamSubteams.teamId}))`,
			email: users.email,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(teamMemberships)
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.leftJoin(users, eq(teamMemberships.userId, users.id))
		.where(whereCondition)
		.orderBy(teamMemberships.joinedAt);
}

export async function getUsersWithoutSubteam(userIds: string[]) {
	if (userIds.length === 0) {
		return [];
	}

	return await dbPg
		.select({
			id: users.id,
			email: users.email,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(inArray(users.id, userIds));
}

export async function getTeamMembersForGroup(groupId: string) {
	return await dbPg
		.select({
			userId: users.id,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.innerJoin(teamMemberships, eq(users.id, teamMemberships.userId))
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.where(
			and(
				eq(teamSubteams.teamId, groupId),
				eq(teamMemberships.status, "active"),
				eq(teamSubteams.status, "active"),
			),
		);
}

export async function getAllTeamMembersForDashboard(groupId: string) {
	return await dbPg
		.select({
			userId: users.id,
			displayName: users.displayName,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			role: teamMemberships.role,
			joinedAt: teamMemberships.joinedAt,
			subteamId: teamSubteams.id,
			subteamName: teamSubteams.teamId,
		})
		.from(users)
		.innerJoin(teamMemberships, eq(users.id, teamMemberships.userId))
		.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
		.where(
			and(
				eq(teamSubteams.teamId, groupId),
				eq(teamMemberships.status, "active"),
				eq(teamSubteams.status, "active"),
			),
		);
}

export async function getRosterDataForSubteam(subteamId: string | undefined) {
	if (!subteamId) {
		return [];
	}

	return await dbPg
		.select({
			eventName: teamRoster.eventName,
			studentName: teamRoster.displayName,
			slotIndex: teamRoster.slotIndex,
			userId: teamRoster.userId,
		})
		.from(teamRoster)
		.where(eq(teamRoster.subteamId, subteamId))
		.orderBy(teamRoster.eventName, teamRoster.slotIndex);
}

export async function getActiveSubteams(groupId: string) {
	return await dbPg
		.select({
			id: teamSubteams.id,
			teamId: teamSubteams.teamId,
			description: teamSubteams.description,
			createdAt: teamSubteams.createdAt,
			order: teamSubteams.displayOrder,
		})
		.from(teamSubteams)
		.where(
			and(eq(teamSubteams.teamId, groupId), eq(teamSubteams.status, "active")),
		)
		.orderBy(teamSubteams.displayOrder, teamSubteams.createdAt);
}

export async function getAssignmentsForSubteams(subteamIds: string[]) {
	if (subteamIds.length === 0) {
		return [];
	}

	return await dbPg
		.select({
			id: teamAssignments.id,
			title: teamAssignments.title,
			description: teamAssignments.description,
			assignmentType: teamAssignments.assignmentType,
			dueDate: teamAssignments.dueDate,
			points: teamAssignments.points,
			isRequired: teamAssignments.isRequired,
			maxAttempts: teamAssignments.maxAttempts,
			timeLimitMinutes: teamAssignments.timeLimitMinutes,
			createdAt: teamAssignments.createdAt,
			updatedAt: teamAssignments.updatedAt,
			createdBy: teamAssignments.createdBy,
			teamId: teamAssignments.teamId,
		})
		.from(teamAssignments)
		.where(inArray(teamAssignments.teamId, subteamIds))
		.orderBy(
			sql`${teamAssignments.dueDate} ASC NULLS LAST`,
			sql`${teamAssignments.createdAt} DESC`,
		);
}
