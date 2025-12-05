import { dbPg } from "@/lib/db";
import {
	newTeamAssignmentRoster,
	newTeamAssignments,
} from "@/lib/db/schema/assignments";
import {
	newTeamActiveTimers,
	newTeamEvents,
	newTeamGroups,
	newTeamMemberships,
	newTeamRemovedEvents,
	newTeamRosterData,
	newTeamStreamComments,
	newTeamStreamPosts,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// PUT /api/teams/[teamId]/subteams/[subteamId] - Update a subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (updateSubteam)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string; subteamId: string }> },
) {
	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
			);
		}

		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { teamId, subteamId } = await params;
		const body = await request.json();
		const { name } = body;

		if (!name?.trim()) {
			return NextResponse.json(
				{ error: "Subteam name is required" },
				{ status: 400 },
			);
		}

		// Resolve the slug to team group using Drizzle ORM
		const groupResult = await dbPg
			.select({ id: newTeamGroups.id })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if the subteam exists and belongs to this group using Drizzle ORM
		const subteamResult = await dbPg
			.select({ id: newTeamUnits.id, groupId: newTeamUnits.groupId })
			.from(newTeamUnits)
			.where(
				and(eq(newTeamUnits.id, subteamId), eq(newTeamUnits.groupId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// Check if user is a captain of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, user.id),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			)
			.limit(1);

		if (membershipResult.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		const membership = membershipResult[0];
		if (!membership) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}
		if (!["captain", "co_captain"].includes(membership.role)) {
			return NextResponse.json(
				{ error: "Only captains can update subteams" },
				{ status: 403 },
			);
		}

		// Update the subteam name (description field) using Drizzle ORM
		const [updateResult] = await dbPg
			.update(newTeamUnits)
			.set({
				description: name.trim(),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(newTeamUnits.id, subteamId))
			.returning({
				id: newTeamUnits.id,
				teamId: newTeamUnits.teamId,
				description: newTeamUnits.description,
			});

		if (!updateResult) {
			return NextResponse.json(
				{ error: "Failed to update subteam" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			id: updateResult.id,
			name: updateResult.description || `Team ${updateResult.teamId}`,
			team_id: updateResult.teamId,
			description: updateResult.description,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// DELETE /api/teams/[teamId]/subteams/[subteamId] - Delete a subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (deleteSubteam)
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string; subteamId: string }> },
) {
	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
			);
		}

		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { teamId, subteamId } = await params;

		// Resolve the slug to team group using Drizzle ORM
		const groupResult = await dbPg
			.select({ id: newTeamGroups.id })
			.from(newTeamGroups)
			.where(eq(newTeamGroups.slug, teamId))
			.limit(1);

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const groupId = groupResult[0]?.id;
		if (!groupId) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		// Check if the subteam exists and belongs to this group using Drizzle ORM
		const subteamResult = await dbPg
			.select({ id: newTeamUnits.id, groupId: newTeamUnits.groupId })
			.from(newTeamUnits)
			.where(
				and(eq(newTeamUnits.id, subteamId), eq(newTeamUnits.groupId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// Check if user is a captain of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: newTeamMemberships.role })
			.from(newTeamMemberships)
			.innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
			.where(
				and(
					eq(newTeamMemberships.userId, user.id),
					eq(newTeamUnits.groupId, groupId),
					eq(newTeamMemberships.status, "active"),
				),
			)
			.limit(1);

		if (membershipResult.length === 0) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}

		const membership = membershipResult[0];
		if (!membership) {
			return NextResponse.json({ error: "Not a team member" }, { status: 403 });
		}
		if (!["captain", "co_captain"].includes(membership.role)) {
			return NextResponse.json(
				{ error: "Only captains can delete subteams" },
				{ status: 403 },
			);
		}

		// Use Drizzle transaction to ensure all deletions succeed or none do
		await dbPg.transaction(async (tx) => {
			// Get all stream post IDs for this subteam
			const streamPostIds = await tx
				.select({ id: newTeamStreamPosts.id })
				.from(newTeamStreamPosts)
				.where(eq(newTeamStreamPosts.teamUnitId, subteamId));

			const postIds = streamPostIds.map((p) => p.id);

			// Delete related data (most will cascade, but being explicit for safety)
			if (postIds.length > 0) {
				await tx
					.delete(newTeamStreamComments)
					.where(inArray(newTeamStreamComments.postId, postIds));
			}
			await tx
				.delete(newTeamMemberships)
				.where(eq(newTeamMemberships.teamId, subteamId));
			await tx
				.delete(newTeamRosterData)
				.where(eq(newTeamRosterData.teamUnitId, subteamId));
			await tx
				.delete(newTeamStreamPosts)
				.where(eq(newTeamStreamPosts.teamUnitId, subteamId));
			await tx
				.delete(newTeamActiveTimers)
				.where(eq(newTeamActiveTimers.teamUnitId, subteamId));
			await tx
				.delete(newTeamRemovedEvents)
				.where(eq(newTeamRemovedEvents.teamUnitId, subteamId));
			await tx
				.delete(newTeamAssignmentRoster)
				.where(eq(newTeamAssignmentRoster.subteamId, subteamId));
			await tx
				.delete(newTeamAssignments)
				.where(eq(newTeamAssignments.teamId, subteamId));
			await tx.delete(newTeamEvents).where(eq(newTeamEvents.teamId, subteamId));

			// Delete the subteam itself
			const deleteResult = await tx
				.delete(newTeamUnits)
				.where(eq(newTeamUnits.id, subteamId))
				.returning({ id: newTeamUnits.id });

			if (deleteResult.length === 0) {
				throw new Error("Failed to delete subteam");
			}
		});

		return NextResponse.json({
			success: true,
			message: "Subteam and all related data deleted successfully",
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
