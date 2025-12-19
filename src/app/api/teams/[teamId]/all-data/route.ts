import { dbPg } from "@/lib/db";
import { teamAssignments } from "@/lib/db/schema";
import { users } from "@/lib/db/schema";
import {
	teamActiveTimers,
	teamEvents,
	teamMemberships,
	teamRoster,
	teamStreamPosts,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logging/logger";
import {
	handleError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, desc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod validation schemas
const TeamDataResponseSchema = z.object({
	team: z.object({
		id: z.string(),
		name: z.string(),
		slug: z.string(),
		school: z.string(),
		division: z.string(),
		description: z.string().nullable(),
		createdAt: z.string().nullable(),
		updatedAt: z.string().nullable(),
	}),
	subteams: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string().nullable(),
			teamId: z.string(),
			createdAt: z.string().nullable(),
		}),
	),
	members: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			email: z.string().nullable().optional(),
			username: z.string().nullable().optional(),
			role: z.string(),
			joinedAt: z.string().nullable().optional(),
			subteamId: z.string(),
			subteam: z
				.object({
					id: z.string(),
					name: z.string(),
					description: z.string().nullable(),
					teamId: z.string(),
					createdAt: z.string().nullable(),
				})
				.nullable()
				.optional(),
			events: z.array(z.string()),
			eventCount: z.number(),
			avatar: z.string().nullable().optional(),
			isOnline: z.boolean(),
			hasPendingInvite: z.boolean(),
			hasPendingLinkInvite: z.boolean(),
			isPendingInvitation: z.boolean(),
			invitationCode: z.string().nullable().optional(),
			isUnlinked: z.boolean(),
			conflicts: z.array(z.string()),
			isCreator: z.boolean(),
		}),
	),
	roster: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
	stream: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			authorId: z.string(),
			authorName: z.string(),
			authorEmail: z.string().nullable().optional(),
			authorUsername: z.string().nullable().optional(),
			authorPhotoUrl: z.string().nullable().optional(),
			title: z.string().nullable().optional(),
			postType: z.string().nullable().optional(),
			priority: z.string().nullable().optional(),
			isPinned: z.boolean().nullable().optional(),
			isPublic: z.boolean().nullable().optional(),
			createdAt: z.string().nullable().optional(),
			updatedAt: z.string().nullable().optional(),
		}),
	),
	assignments: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().nullable().optional(),
			assignmentType: z.string().nullable().optional(),
			dueDate: z.string().nullable().optional(),
			points: z.number().nullable().optional(),
			isRequired: z.boolean().nullable().optional(),
			maxAttempts: z.number().nullable().optional(),
			timeLimitMinutes: z.number().nullable().optional(),
			eventName: z.string().nullable().optional(),
			createdAt: z.string().nullable().optional(),
			updatedAt: z.string().nullable().optional(),
			createdBy: z.string(),
		}),
	),
	tournaments: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().nullable().optional(),
			eventType: z.string().nullable().optional(),
			startTime: z.string().nullable().optional(),
			endTime: z.string().nullable().optional(),
			location: z.string().nullable().optional(),
			isAllDay: z.boolean().nullable().optional(),
			isRecurring: z.boolean().nullable().optional(),
			createdAt: z.string().nullable().optional(),
			updatedAt: z.string().nullable().optional(),
		}),
	),
	timers: z.array(
		z.object({
			id: z.string(),
			subteamId: z.string(),
			eventId: z.string(),
			addedBy: z.string(),
			startTime: z.string().nullable().optional(),
			createdAt: z.string().nullable().optional(),
		}),
	),
	userTeams: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			slug: z.string(),
			school: z.string(),
			division: z.string(),
			description: z.string().nullable().optional(),
			role: z.string(),
			joinedAt: z.string().nullable().optional(),
		}),
	),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	const { teamId } = await params;
	const searchParams = request.nextUrl.searchParams;
	const subteamId = searchParams.get("subteamId");

	try {
		const envError = validateEnvironment();
		if (envError) {
			return envError;
		}

		if (!teamId) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "Team ID is required",
						path: ["teamId"],
					},
				]),
			);
		}

		const user = await getServerUser();
		if (!user?.id) {
			return handleUnauthorizedError();
		}

		// Get team group by slug
		const groupResult = await dbPg
			.select({
				id: teams.id,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
				description: teams.description,
				createdBy: teams.createdBy,
				createdAt: teams.createdAt,
				updatedAt: teams.updatedAt,
				settings: teams.settings,
				status: teams.status,
			})
			.from(teams)
			.where(eq(teams.slug, teamId))
			.limit(1);

		if (groupResult.length === 0 || !groupResult[0]) {
			return handleNotFoundError("Team");
		}

		const group = groupResult[0];

		// Get team units (subteams)
		const unitsResult = await dbPg
			.select({
				id: teamSubteams.id,
				teamId: teamSubteams.teamId,
				description: teamSubteams.description,
				captainCode: teamSubteams.captainCode,
				userCode: teamSubteams.userCode,
				createdBy: teamSubteams.createdBy,
				createdAt: teamSubteams.createdAt,
				updatedAt: teamSubteams.updatedAt,
				settings: teamSubteams.settings,
				status: teamSubteams.status,
			})
			.from(teamSubteams)
			.where(eq(teamSubteams.teamId, group.id));

		// Get team memberships with user data
		const membershipsResult = await dbPg
			.select({
				id: teamMemberships.id,
				userId: teamMemberships.userId,
				teamId: teamMemberships.teamId,
				role: teamMemberships.role,
				joinedAt: teamMemberships.joinedAt,
				invitedBy: teamMemberships.invitedBy,
				status: teamMemberships.status,
				permissions: teamMemberships.permissions,
				// User data
				userEmail: users.email,
				userUsername: users.username,
				userFirstName: users.firstName,
				userLastName: users.lastName,
				userDisplayName: users.displayName,
				userPhotoUrl: users.photoUrl,
			})
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.innerJoin(users, eq(teamMemberships.userId, users.id))
			.where(
				and(
					eq(teamSubteams.teamId, group.id),
					eq(teamMemberships.status, "active"),
				),
			);

		// Get roster data
		const rosterResult = await dbPg
			.select({
				subteamId: teamRoster.subteamId,
				eventName: teamRoster.eventName,
				displayName: teamRoster.displayName,
				userId: teamRoster.userId,
				createdAt: teamRoster.createdAt,
				updatedAt: teamRoster.updatedAt,
			})
			.from(teamRoster)
			.innerJoin(teamSubteams, eq(teamRoster.subteamId, teamSubteams.id))
			.where(eq(teamSubteams.teamId, group.id));

		// Get stream posts with author data
		const postsResult = await dbPg
			.select({
				id: teamStreamPosts.id,
				subteamId: teamStreamPosts.subteamId,
				content: teamStreamPosts.content,
				authorId: teamStreamPosts.authorId,
				title: teamStreamPosts.title,
				postType: teamStreamPosts.postType,
				priority: teamStreamPosts.priority,
				isPinned: teamStreamPosts.isPinned,
				isPublic: teamStreamPosts.isPublic,
				createdAt: teamStreamPosts.createdAt,
				updatedAt: teamStreamPosts.updatedAt,
				// Author data
				authorEmail: users.email,
				authorUsername: users.username,
				authorFirstName: users.firstName,
				authorLastName: users.lastName,
				authorDisplayName: users.displayName,
				authorPhotoUrl: users.photoUrl,
			})
			.from(teamStreamPosts)
			.innerJoin(teamSubteams, eq(teamStreamPosts.subteamId, teamSubteams.id))
			.innerJoin(users, eq(teamStreamPosts.authorId, users.id))
			.where(
				and(
					eq(teamSubteams.teamId, group.id),
					subteamId ? eq(teamStreamPosts.subteamId, subteamId) : undefined,
				),
			)
			.orderBy(desc(teamStreamPosts.createdAt))
			.limit(50);

		// Get assignments
		const assignmentsResult = await dbPg
			.select({
				id: teamAssignments.id,
				teamId: teamAssignments.teamId,
				subteamId: teamAssignments.subteamId,
				title: teamAssignments.title,
				description: teamAssignments.description,
				assignmentType: teamAssignments.assignmentType,
				dueDate: teamAssignments.dueDate,
				points: teamAssignments.points,
				isRequired: teamAssignments.isRequired,
				maxAttempts: teamAssignments.maxAttempts,
				timeLimitMinutes: teamAssignments.timeLimitMinutes,
				eventName: teamAssignments.eventName,
				createdAt: teamAssignments.createdAt,
				updatedAt: teamAssignments.updatedAt,
				createdBy: teamAssignments.createdBy,
			})
			.from(teamAssignments)
			.where(eq(teamAssignments.teamId, group.id))
			.orderBy(desc(teamAssignments.createdAt));

		// Get tournaments
		const tournamentsResult = await dbPg
			.select({
				id: teamEvents.id,
				teamId: teamEvents.teamId,
				title: teamEvents.title,
				description: teamEvents.description,
				eventType: teamEvents.eventType,
				startTime: teamEvents.startTime,
				endTime: teamEvents.endTime,
				location: teamEvents.location,
				allDay: teamEvents.allDay,
				isRecurring: teamEvents.isRecurring,
				createdAt: teamEvents.createdAt,
				updatedAt: teamEvents.updatedAt,
			})
			.from(teamEvents)
			.where(
				and(
					eq(teamEvents.teamId, group.id),
					eq(teamEvents.eventType, "tournament"),
				),
			)
			.orderBy(desc(teamEvents.startTime));

		// Get user teams for the current user
		const userTeamsResult = await dbPg
			.select({
				id: teams.id,
				school: teams.school,
				division: teams.division,
				slug: teams.slug,
				description: teams.description,
				role: teamMemberships.role,
				joinedAt: teamMemberships.joinedAt,
			})
			.from(teams)
			.innerJoin(teamSubteams, eq(teams.id, teamSubteams.teamId))
			.innerJoin(teamMemberships, eq(teamSubteams.id, teamMemberships.teamId))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamMemberships.status, "active"),
				),
			);

		const teamUnitIds = unitsResult.map((u) => u.id);

		// Get active timers using Drizzle ORM
		const timersResult =
			teamUnitIds.length > 0
				? await dbPg
						.select({
							id: teamActiveTimers.id,
							subteamId: teamActiveTimers.subteamId,
							eventId: teamActiveTimers.eventId,
							addedBy: teamActiveTimers.addedBy,
							addedAt: teamActiveTimers.addedAt,
						})
						.from(teamActiveTimers)
						.where(inArray(teamActiveTimers.subteamId, teamUnitIds))
				: [];

		// Transform data to match expected format
		const data = {
			team: {
				id: group.id,
				name: group.school,
				slug: group.slug,
				school: group.school,
				division: group.division,
				description: group.description,
				createdAt: group.createdAt ? String(group.createdAt) : undefined,
				updatedAt: group.updatedAt ? String(group.updatedAt) : undefined,
			},
			subteams: unitsResult.map((unit) => ({
				id: unit.id,
				name: unit.description || unit.teamId, // Use description as name, fallback to teamId
				description: unit.description,
				teamId: unit.teamId,
				createdAt: unit.createdAt ? String(unit.createdAt) : undefined,
			})),
			members: membershipsResult.map((membership) => {
				// Generate display name from available user data
				const displayName =
					membership.userDisplayName ||
					(membership.userFirstName && membership.userLastName
						? `${membership.userFirstName} ${membership.userLastName}`.trim()
						: membership.userFirstName ||
							membership.userLastName ||
							membership.userUsername ||
							"Unknown User");

				// Get events for this member from roster data
				const memberEvents = rosterResult
					.filter((roster) => roster.userId === membership.userId)
					.map((roster) => roster.eventName);

				// Get subteam info
				const subteamInfo = unitsResult.find(
					(unit) => unit.id === membership.teamId,
				);

				return {
					id: membership.userId,
					name: displayName,
					email: membership.userEmail || null,
					username: membership.userUsername || null,
					role: membership.role,
					joinedAt: membership.joinedAt ? String(membership.joinedAt) : null,
					subteamId: membership.teamId,
					subteam: subteamInfo
						? {
								id: subteamInfo.id,
								name: subteamInfo.description || subteamInfo.teamId, // Use description as name, fallback to teamId
								description: subteamInfo.description,
							}
						: null,
					events: memberEvents,
					eventCount: memberEvents.length,
					avatar: membership.userPhotoUrl || null,
					isOnline: false,
					hasPendingInvite: false,
					hasPendingLinkInvite: false,
					isPendingInvitation: false,
					invitationCode: null,
					isUnlinked: false,
					conflicts: [],
					isCreator: false,
				};
			}),
			roster: rosterResult.reduce(
				(acc, entry) => {
					if (!(entry.subteamId && entry.eventName && entry.displayName)) {
						return acc;
					}
					if (!acc[entry.subteamId]) {
						acc[entry.subteamId] = {};
					}
					const teamUnit = acc[entry.subteamId];
					if (teamUnit && !teamUnit[entry.eventName]) {
						teamUnit[entry.eventName] = [];
					}
					const eventArray = teamUnit?.[entry.eventName];
					if (eventArray) {
						eventArray.push(entry.displayName);
					}
					return acc;
				},
				{} as Record<string, Record<string, string[]>>,
			),
			stream: postsResult.map((post) => {
				// Generate author display name
				const authorDisplayName =
					post.authorDisplayName ||
					(post.authorFirstName && post.authorLastName
						? `${post.authorFirstName} ${post.authorLastName}`.trim()
						: post.authorFirstName ||
							post.authorLastName ||
							post.authorUsername ||
							"Unknown User");

				return {
					id: post.id,
					content: post.content,
					authorId: post.authorId,
					authorName: authorDisplayName,
					authorEmail: post.authorEmail || null,
					authorUsername: post.authorUsername || null,
					authorPhotoUrl: post.authorPhotoUrl || null,
					title: post.title || null,
					postType: post.postType || null,
					priority: post.priority || null,
					isPinned: post.isPinned || null,
					isPublic: post.isPublic || null,
					createdAt: post.createdAt ? String(post.createdAt) : null,
					updatedAt: post.updatedAt ? String(post.updatedAt) : null,
				};
			}),
			assignments: assignmentsResult.map((assignment) => ({
				id: assignment.id,
				title: assignment.title,
				description: assignment.description || null,
				assignmentType: assignment.assignmentType || null,
				dueDate: assignment.dueDate ? String(assignment.dueDate) : null,
				points: assignment.points || null,
				isRequired: assignment.isRequired || null,
				maxAttempts: assignment.maxAttempts || null,
				timeLimitMinutes: assignment.timeLimitMinutes || null,
				eventName: assignment.eventName || null,
				createdAt: assignment.createdAt ? String(assignment.createdAt) : null,
				updatedAt: assignment.updatedAt ? String(assignment.updatedAt) : null,
				createdBy: assignment.createdBy,
			})),
			tournaments: tournamentsResult.map((tournament) => ({
				id: tournament.id,
				title: tournament.title,
				description: tournament.description || null,
				eventType: tournament.eventType || null,
				startTime: tournament.startTime ? String(tournament.startTime) : null,
				endTime: tournament.endTime ? String(tournament.endTime) : null,
				location: tournament.location || null,
				isAllDay: tournament.allDay || null,
				isRecurring: tournament.isRecurring || null,
				createdAt: tournament.createdAt ? String(tournament.createdAt) : null,
				updatedAt: tournament.updatedAt ? String(tournament.updatedAt) : null,
			})),
			timers: timersResult.map((t) => ({
				id: t.id,
				subteamId: t.subteamId || "",
				eventId: t.eventId,
				addedBy: t.addedBy || "",
				startTime: null,
				createdAt: String(t.addedAt),
			})),
			userTeams: userTeamsResult.map((userTeam) => ({
				id: userTeam.id,
				name: userTeam.school,
				slug: userTeam.slug,
				school: userTeam.school,
				division: userTeam.division,
				description: userTeam.description || null,
				role: userTeam.role,
				joinedAt: userTeam.joinedAt ? String(userTeam.joinedAt) : null,
			})),
		};

		// Validate response data with Zod
		try {
			TeamDataResponseSchema.parse(data);
		} catch (error) {
			logger.error("Response validation failed", error);
			// Still return the data, but log the validation error
		}

		logger.info("Successfully fetched all team data", {
			teamId,
			subteamId,
			subteamsCount: data.subteams.length,
			membersCount: data.members.length,
			postsCount: data.stream.length,
			assignmentsCount: data.assignments.length,
			tournamentsCount: data.tournaments.length,
		});

		return NextResponse.json(data);
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/all-data");
	}
}
