import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
	teamMemberships,
	teamPeople,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import { and, eq, inArray, or } from "drizzle-orm";
import { formatMember } from "./utils/memberFormatters";
import { generateUniqueSlug } from "./utils/slugGenerator";
import { formatTeamWithDetails } from "./utils/teamFormatters";
import { generateNextTeamId } from "./utils/teamIdGenerator";
import { getUserProfile } from "./utils/userProfileUtils";

export interface TeamMembership {
	id: string;
	user_id: string;
	team_id: string;
	role: "captain" | "member" | "observer";
	joined_at: string;
	invited_by?: string;
	status: "active" | "inactive" | "pending" | "banned";
	permissions?: Record<string, unknown>;
}

export interface TeamUnit {
	id: string;
	group_id: string;
	team_id: string;
	name: string;
	captain_code: string;
	user_code: string;
	description?: string;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface TeamGroup {
	id: string;
	school: string;
	division: string;
	slug: string;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface TeamWithDetails {
	id: string;
	name: string;
	slug: string;
	school: string;
	division: string;
	description?: string;
	captain_code: string;
	user_code: string;
	user_role: string;
	members: Array<{
		id: string;
		name: string;
		email: string;
		role: string;
		joined_at: string;
	}>;
}

export class TeamsService {
	async getUserTeams(userId: string): Promise<TeamWithDetails[]> {
		// Get user's team memberships using Drizzle ORM
		const memberships = await dbPg
			.select()
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, userId),
					eq(teamMemberships.status, "active"),
				),
			)
			.orderBy(teamMemberships.joinedAt);

		if (memberships.length === 0) {
			return [];
		}

		// Get team details for each membership using Drizzle ORM
		const teamIds = memberships.map((m) => m.teamId);
		const teamResults = await dbPg
			.select({
				id: teamSubteams.id,
				teamId: teamSubteams.teamId,
				description: teamSubteams.description,
				captainCode: teamSubteams.captainCode,
				userCode: teamSubteams.userCode,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
				groupCreatedAt: teams.createdAt,
			})
			.from(teamSubteams)
			.innerJoin(teams, eq(teamSubteams.teamId, teams.id))
			.where(
				and(
					inArray(teamSubteams.id, teamIds),
					eq(teamSubteams.status, "active"),
					eq(teams.status, "active"),
				),
			);

		// Format teams with members
		const formattedTeams = await Promise.all(
			memberships.map(async (membership) => {
				const team = teamResults.find((t) => t.id === membership.teamId);
				if (!team) {
					return null;
				}

				// Get team members using Drizzle ORM
				const members = await this.getTeamMembers(team.id);
				const formattedMembers = await Promise.all(
					members.map(async (m) => {
						const userProfile = await getUserProfile(m.user_id);
						return formatMember(m, userProfile);
					}),
				);

				return formatTeamWithDetails(
					{
						id: team.id,
						teamId: team.teamId,
						description: team.description || undefined,
						captainCode: team.captainCode || "",
						userCode: team.userCode || "",
						school: team.school || "",
						division: team.division || "",
						slug: team.slug || "",
					},
					{ role: membership.role },
					formattedMembers,
				);
			}),
		);

		return formattedTeams.filter((team) => team !== null) as TeamWithDetails[];
	}

	async getUserArchivedTeams(userId: string): Promise<TeamWithDetails[]> {
		// Get user's archived team memberships
		const membershipsResult = await dbPg
			.select()
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, userId),
					eq(teamMemberships.status, "archived"),
				),
			)
			.orderBy(teamMemberships.joinedAt);

		if (membershipsResult.length === 0) {
			return [];
		}

		// Get archived team details for each membership
		const teamIds = membershipsResult.map((m) => m.teamId);
		const teamsResult = await dbPg
			.select({
				id: teamSubteams.id,
				group_id: teamSubteams.teamId,
				team_id: teamSubteams.teamId,
				description: teamSubteams.description,
				captain_code: teamSubteams.captainCode,
				user_code: teamSubteams.userCode,
				created_by: teamSubteams.createdBy,
				created_at: teamSubteams.createdAt,
				updated_at: teamSubteams.updatedAt,
				status: teamSubteams.status,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
				group_created_at: teams.createdAt,
			})
			.from(teamSubteams)
			.innerJoin(teams, eq(teamSubteams.teamId, teams.id))
			.where(
				and(
					inArray(teamSubteams.id, teamIds),
					eq(teamSubteams.status, "archived"),
					eq(teams.status, "archived"),
				),
			);

		// Format teams with members
		const formattedTeams = await Promise.all(
			membershipsResult.map(async (membership) => {
				const team = teamsResult.find((t) => t.id === membership.teamId);
				if (!team) {
					return null;
				}

				// Get team members
				const members = await this.getTeamMembers(team.id);
				const formattedMembers = await Promise.all(
					members.map(async (m) => {
						const userProfile = await getUserProfile(m.user_id);
						return formatMember(m, userProfile);
					}),
				);

				return formatTeamWithDetails(
					{
						id: team.id,
						teamId: team.team_id,
						description: team.description || undefined,
						captainCode: team.captain_code || "",
						userCode: team.user_code || "",
						school: team.school || "",
						division: team.division || "",
						slug: team.slug || "",
					},
					{ role: membership.role },
					formattedMembers,
				);
			}),
		);

		return formattedTeams.filter((team) => team !== null) as TeamWithDetails[];
	}

	async getTeamMembers(teamId: string): Promise<TeamMembership[]> {
		try {
			// Using Drizzle ORM to get team members
			const members = await dbPg
				.select()
				.from(teamMemberships)
				.where(
					and(
						eq(teamMemberships.teamId, teamId),
						eq(teamMemberships.status, "active"),
					),
				)
				.orderBy(teamMemberships.joinedAt);

			// Convert to the expected format
			return members.map((member) => ({
				id: member.id,
				user_id: member.userId,
				team_id: member.teamId,
				role: member.role as "captain" | "member" | "observer",
				joined_at: member.joinedAt || new Date().toISOString(),
				invited_by: member.invitedBy || undefined,
				status: member.status as "active" | "inactive" | "pending" | "banned",
				permissions: member.permissions as Record<string, unknown> | undefined,
			}));
		} catch (error) {
			logger.error(
				"Failed to getTeamMembers",
				error instanceof Error ? error : new Error(String(error)),
				{
					teamId,
				},
			);
			return [];
		}
	}

	async createTeamGroup(data: {
		school: string;
		division: string;
		slug: string;
		createdBy: string;
	}): Promise<TeamGroup> {
		// SECURITY FIX: Always create a new team group instead of reusing existing ones
		// This prevents unauthorized access to existing teams when someone tries to create
		// a team with the same school+division combination

		// Generate unique slug
		const finalSlug = await generateUniqueSlug(data.slug);

		// Create the team group with the final slug
		const [result] = await dbPg
			.insert(teams)
			.values({
				name: data.school, // Use school as name
				school: data.school,
				division: data.division,
				slug: finalSlug,
				createdBy: data.createdBy,
			})
			.returning();
		if (!result) {
			throw new Error("Failed to create team group");
		}
		return {
			id: result.id,
			school: result.school,
			division: result.division,
			slug: result.slug,
			created_by: result.createdBy,
			created_at: result.createdAt || new Date().toISOString(),
			updated_at: result.updatedAt || new Date().toISOString(),
		};
	}

	async createTeamUnit(data: {
		teamId: string;
		captainCode: string;
		userCode: string;
		description?: string;
		createdBy: string;
	}): Promise<TeamUnit> {
		const groupStatusResult = await dbPg
			.select({ status: teams.status })
			.from(teams)
			.where(eq(teams.id, data.teamId))
			.limit(1);

		const firstResult = groupStatusResult[0];
		if (firstResult && firstResult.status === "archived") {
			await dbPg
				.update(teams)
				.set({
					status: "active",
					updatedAt: new Date().toISOString(),
				})
				.where(eq(teams.id, data.teamId));
		}

		// Generate next available team ID
		const nextTeamName = await generateNextTeamId(data.teamId);

		const [result] = await dbPg
			.insert(teamSubteams)
			.values({
				teamId: data.teamId,
				name: nextTeamName,
				captainCode: data.captainCode,
				userCode: data.userCode,
				description: data.description || `Team ${nextTeamName}`,
				createdBy: data.createdBy,
			})
			.returning();

		if (!result) {
			throw new Error("Failed to create team unit");
		}
		return {
			id: result.id,
			group_id: result.teamId,
			team_id: result.teamId,
			name: result.description || `Team ${result.teamId}`,
			description: result.description || undefined,
			captain_code: result.captainCode || "",
			user_code: result.userCode || "",
			created_by: result.createdBy || "",
			created_at: result.createdAt || new Date().toISOString(),
			updated_at: result.updatedAt || new Date().toISOString(),
		};
	}

	async createTeamMembership(data: {
		userId: string;
		teamId: string;
		role: string;
		status: string;
		invitedBy?: string;
	}): Promise<TeamMembership> {
		const existingMembership = await dbPg
			.select()
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, data.userId),
					eq(teamMemberships.teamId, data.teamId),
				),
			)
			.limit(1);

		if (existingMembership.length > 0) {
			const [updatedMembership] = await dbPg
				.update(teamMemberships)
				.set({
					role: data.role,
					status: data.status,
					joinedAt: new Date().toISOString(), // Update joined_at to reflect the new join
				})
				.where(
					and(
						eq(teamMemberships.userId, data.userId),
						eq(teamMemberships.teamId, data.teamId),
					),
				)
				.returning();
			if (!updatedMembership) {
				throw new Error("Failed to update team membership");
			}
			await this.syncTeamPeopleEntry(data.userId, data.teamId, data.role);

			const result = {
				id: updatedMembership.id,
				user_id: updatedMembership.userId,
				team_id: updatedMembership.teamId,
				role: updatedMembership.role as "captain" | "member" | "observer",
				joined_at: updatedMembership.joinedAt || new Date().toISOString(),
				invited_by: updatedMembership.invitedBy || undefined,
				status: updatedMembership.status as
					| "active"
					| "inactive"
					| "pending"
					| "banned",
				permissions: updatedMembership.permissions as
					| Record<string, unknown>
					| undefined,
			};
			return result;
		}
		const [result] = await dbPg
			.insert(teamMemberships)
			.values({
				userId: data.userId,
				teamId: data.teamId,
				role: data.role,
				status: data.status,
				invitedBy: data.invitedBy,
			})
			.returning();
		if (!result) {
			throw new Error("Failed to create team membership");
		}
		await this.syncTeamPeopleEntry(data.userId, data.teamId, data.role);

		const finalResult = {
			id: result.id,
			user_id: result.userId,
			team_id: result.teamId,
			role: result.role as "captain" | "member" | "observer",
			joined_at: result.joinedAt || new Date().toISOString(),
			invited_by: result.invitedBy || undefined,
			status: result.status as "active" | "inactive" | "pending" | "banned",
			permissions: result.permissions as Record<string, unknown> | undefined,
		};
		return finalResult;
	}

	/**
	 * Sync team people entry when team membership is created or updated
	 */
	private async syncTeamPeopleEntry(
		userId: string,
		teamId: string,
		role: string,
	): Promise<void> {
		try {
			const [userInfo] = await dbPg
				.select({
					display_name: users.displayName,
					username: users.username,
					email: users.email,
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!userInfo) {
				return;
			}

			const displayName =
				userInfo.display_name ||
				userInfo.username ||
				userInfo.email?.split("@")[0] ||
				"Unknown User";
			const isAdmin = role === "captain";
			const [existingEntry] = await dbPg
				.select({ id: teamPeople.id })
				.from(teamPeople)
				.where(
					and(eq(teamPeople.userId, userId), eq(teamPeople.subteamId, teamId)),
				)
				.limit(1);

			if (existingEntry) {
				await dbPg
					.update(teamPeople)
					.set({
						name: displayName,
						isAdmin: isAdmin,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(teamPeople.id, existingEntry.id));
			} else {
				// We need the group team ID. For now, let's try to get it from the subteam
				const [subteamInfo] = await dbPg
					.select({ teamId: teamSubteams.teamId })
					.from(teamSubteams)
					.where(eq(teamSubteams.id, teamId))
					.limit(1);

				if (subteamInfo) {
					await dbPg.insert(teamPeople).values({
						subteamId: teamId,
						teamId: subteamInfo.teamId,
						name: displayName,
						userId,
						isAdmin: isAdmin,
						events: [],
					});
				}
			}
		} catch (error) {
			logger.error(
				"Failed to syncTeamEventsToCalendar",
				error instanceof Error ? error : new Error(String(error)),
				{
					teamId,
				},
			);
			// Don't throw error to avoid breaking the main flow
		}
	}

	async joinTeamByCode(
		userId: string,
		code: string,
	): Promise<TeamWithDetails | null> {
		const teamResults = await dbPg
			.select({
				id: teamSubteams.id,
				teamId: teamSubteams.teamId,
				description: teamSubteams.description,
				captainCode: teamSubteams.captainCode,
				userCode: teamSubteams.userCode,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
			})
			.from(teamSubteams)
			.innerJoin(teams, eq(teamSubteams.teamId, teams.id))
			.where(
				or(eq(teamSubteams.captainCode, code), eq(teamSubteams.userCode, code)),
			);

		if (teamResults.length === 0) {
			return null;
		}

		const team = teamResults[0];
		if (!team) {
			throw new Error("Team not found");
		}
		const existingMemberships = await dbPg
			.select()
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.userId, userId),
					eq(teamMemberships.teamId, team.id),
				),
			);

		if (existingMemberships.length > 0) {
			// User is already a member, return team details
			const members = await this.getTeamMembers(team.id);
			const firstMembership = existingMemberships[0];
			if (!firstMembership) {
				throw new Error("Membership not found");
			}
			const formattedMembers = await Promise.all(
				members.map(async (m) => {
					const userProfile = await getUserProfile(m.user_id);
					return formatMember(m, userProfile);
				}),
			);
			return formatTeamWithDetails(
				{
					id: team.id,
					teamId: team.teamId,
					description: team.description || undefined,
					captainCode: team.captainCode || "",
					userCode: team.userCode || "",
					school: team.school || "",
					division: team.division || "",
					slug: team.slug || "",
				},
				{ role: firstMembership.role },
				formattedMembers,
			);
		}

		// Determine role based on code type
		const isCaptain = team.captainCode === code;
		const role = isCaptain ? "captain" : "member";
		const membership = await this.createTeamMembership({
			userId,
			teamId: team.id,
			role,
			status: "active",
		});
		const members = await this.getTeamMembers(team.id);
		const formattedMembers = await Promise.all(
			members.map(async (m) => {
				const userProfile = await getUserProfile(m.user_id);
				return formatMember(m, userProfile);
			}),
		);
		return formatTeamWithDetails(
			{
				id: team.id,
				teamId: team.teamId,
				description: team.description || undefined,
				captainCode: team.captainCode || "",
				userCode: team.userCode || "",
				school: team.school || "",
				division: team.division || "",
				slug: team.slug || "",
			},
			{ role: membership.role },
			formattedMembers,
		);
	}
}

export const teamsService = new TeamsService();
