import { dbPg } from "@/lib/db";
import {
	newTeamGroups,
	newTeamRosterData,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import { syncPeopleFromRosterForSubteam } from "@/lib/trpc/routers/teams/helpers/people-sync";
import { hasLeadershipAccessCockroach } from "@/lib/utils/teams/access";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/roster/remove - Remove all roster occurrences by student name or userId across the team group
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (removeMember, removeSubteamBadge, removeEventBadge)
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
		const RemoveRosterSchema = z
			.object({
				studentName: z.string().min(1).optional(),
				userId: UUIDSchema.optional(),
				eventName: z.string().min(1).optional(),
				subteamId: UUIDSchema.optional(),
			})
			.refine((data) => data.studentName?.trim() || data.userId, {
				message: "Either studentName or userId is required",
				path: [],
			});

		let validatedBody: z.infer<typeof RemoveRosterSchema>;
		try {
			validatedBody = validateRequest(RemoveRosterSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"POST /api/teams/[teamId]/roster/remove - validation",
			);
		}

		const { studentName, userId, eventName, subteamId } = validatedBody;

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

		// Ensure user has leadership privileges in this group
		const hasLeadership = await hasLeadershipAccessCockroach(user.id, groupId);
		if (!hasLeadership) {
			return handleForbiddenError(
				"Only captains and co-captains can modify roster",
			);
		}

		// Get team units for this group using Drizzle ORM
		const teamUnits = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(
				and(
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamUnits.status, "active"),
				),
			);

		const teamUnitIds = teamUnits.map((u) => u.id);

		// Build deletion based on parameters
		if (userId) {
			if (eventName?.trim()) {
				// Remove specific event entries for this user using Drizzle ORM
				const deleteByUserEvent = await dbPg
					.delete(newTeamRosterData)
					.where(
						and(
							eq(newTeamRosterData.userId, userId),
							sql`LOWER(${newTeamRosterData.eventName}) = LOWER(${eventName.trim()})`,
							inArray(newTeamRosterData.teamUnitId, teamUnitIds),
						),
					)
					.returning({ teamUnitId: newTeamRosterData.teamUnitId });

				// Sync people table for affected subteams
				const affectedSubteamIds = [
					...new Set(deleteByUserEvent.map((r) => r.teamUnitId)),
				];
				for (const subteamIdToSync of affectedSubteamIds) {
					await syncPeopleFromRosterForSubteam(subteamIdToSync);
				}

				return NextResponse.json({ removedEntries: deleteByUserEvent.length });
			}
			if (subteamId) {
				// Remove roster entries for this user from specific subteam only
				// NOTE: Do NOT remove membership - membership is separate from roster!
				// A captain can be on the team without being on any roster.
				const deleteByUserSubteam = await dbPg
					.delete(newTeamRosterData)
					.where(
						and(
							eq(newTeamRosterData.userId, userId),
							eq(newTeamRosterData.teamUnitId, subteamId),
						),
					)
					.returning({ teamUnitId: newTeamRosterData.teamUnitId });

				// Sync people table for this subteam
				await syncPeopleFromRosterForSubteam(subteamId);

				return NextResponse.json({
					removedEntries: deleteByUserSubteam.length,
				});
			}
			// Remove all roster entries for this user across the group
			// NOTE: Do NOT remove memberships - membership is separate from roster!
			const deleteByUser = await dbPg
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
				...new Set(deleteByUser.map((r) => r.teamUnitId)),
			];
			for (const subteamIdToSync of affectedSubteamIds) {
				await syncPeopleFromRosterForSubteam(subteamIdToSync);
			}

			return NextResponse.json({ removedEntries: deleteByUser.length });
		}

		// Remove by student name using Drizzle ORM
		if (!studentName?.trim()) {
			return handleValidationError(
				new z.ZodError([
					{
						code: z.ZodIssueCode.custom,
						message: "studentName is required when userId is not provided",
						path: ["studentName"],
					},
				]),
			);
		}

		const deleteByName = await dbPg
			.delete(newTeamRosterData)
			.where(
				and(
					inArray(newTeamRosterData.teamUnitId, teamUnitIds),
					sql`LOWER(COALESCE(${newTeamRosterData.studentName}, '')) = LOWER(${studentName.trim()})`,
				),
			)
			.returning({ teamUnitId: newTeamRosterData.teamUnitId });

		// Sync people table for all affected subteams
		const affectedSubteamIds = [
			...new Set(deleteByName.map((r) => r.teamUnitId)),
		];
		for (const subteamIdToSync of affectedSubteamIds) {
			await syncPeopleFromRosterForSubteam(subteamIdToSync);
		}

		return NextResponse.json({ removedEntries: deleteByName.length });
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/roster/remove");
	}
}
