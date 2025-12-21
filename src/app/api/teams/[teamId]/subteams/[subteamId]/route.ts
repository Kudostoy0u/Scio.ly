import { dbPg } from "@/lib/db";
import { teamAssignmentRoster, teamAssignments } from "@/lib/db/schema";
import {
	teamActiveTimers,
	teamEvents,
	teamMemberships,
	teamRemovedEvents,
	teamRoster,
	teamStreamComments,
	teamStreamPosts,
	teamSubteams,
	teams,
} from "@/lib/db/schema";
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
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
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
			.select({ id: teamSubteams.id, groupId: teamSubteams.teamId })
			.from(teamSubteams)
			.where(
				and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// Check if user is a captain of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: teamMemberships.role })
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamSubteams.teamId, groupId),
					eq(teamMemberships.status, "active"),
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
		if (membership.role !== "captain") {
			return NextResponse.json(
				{ error: "Only captains can update subteams" },
				{ status: 403 },
			);
		}

		// Update the subteam name (description field) using Drizzle ORM
		const [updateResult] = await dbPg
			.update(teamSubteams)
			.set({
				description: name.trim(),
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId))
			.returning({
				id: teamSubteams.id,
				teamId: teamSubteams.teamId,
				description: teamSubteams.description,
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
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId))
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
			.select({ id: teamSubteams.id, groupId: teamSubteams.teamId })
			.from(teamSubteams)
			.where(
				and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// Check if user is a captain of this team group using Drizzle ORM
		const membershipResult = await dbPg
			.select({ role: teamMemberships.role })
			.from(teamMemberships)
			.innerJoin(teamSubteams, eq(teamMemberships.teamId, teamSubteams.id))
			.where(
				and(
					eq(teamMemberships.userId, user.id),
					eq(teamSubteams.teamId, groupId),
					eq(teamMemberships.status, "active"),
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
		if (membership.role !== "captain") {
			return NextResponse.json(
				{ error: "Only captains can delete subteams" },
				{ status: 403 },
			);
		}

		// Use Drizzle transaction to ensure all deletions succeed or none do
		await dbPg.transaction(async (tx) => {
			// Get all stream post IDs for this subteam
			const streamPostIds = await tx
				.select({ id: teamStreamPosts.id })
				.from(teamStreamPosts)
				.where(eq(teamStreamPosts.subteamId, subteamId));

			const postIds = streamPostIds.map((p) => p.id);

			// Delete related data (most will cascade, but being explicit for safety)
			if (postIds.length > 0) {
				await tx
					.delete(teamStreamComments)
					.where(inArray(teamStreamComments.postId, postIds));
			}
			await tx
				.delete(teamMemberships)
				.where(eq(teamMemberships.teamId, subteamId));
			await tx.delete(teamRoster).where(eq(teamRoster.subteamId, subteamId));
			await tx
				.delete(teamStreamPosts)
				.where(eq(teamStreamPosts.subteamId, subteamId));
			await tx
				.delete(teamActiveTimers)
				.where(eq(teamActiveTimers.subteamId, subteamId));
			await tx
				.delete(teamRemovedEvents)
				.where(eq(teamRemovedEvents.subteamId, subteamId));
			await tx
				.delete(teamAssignmentRoster)
				.where(eq(teamAssignmentRoster.subteamId, subteamId));
			await tx
				.delete(teamAssignments)
				.where(eq(teamAssignments.teamId, subteamId));
			await tx.delete(teamEvents).where(eq(teamEvents.teamId, subteamId));

			// Delete the subteam itself
			const deleteResult = await tx
				.delete(teamSubteams)
				.where(eq(teamSubteams.id, subteamId))
				.returning({ id: teamSubteams.id });

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
