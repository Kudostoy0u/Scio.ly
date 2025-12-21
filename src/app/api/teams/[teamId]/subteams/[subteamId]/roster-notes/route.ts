import { dbPg } from "@/lib/db";
import { teamSubteams, teams } from "@/lib/db/schema";
import { assertCaptainAccess } from "@/lib/server/teams/shared";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// PUT /api/teams/[teamId]/subteams/[subteamId]/roster-notes - Update roster notes
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
		const { notes } = body;

		// Validate that notes is a string (or null/undefined)
		if (notes !== null && notes !== undefined && typeof notes !== "string") {
			return NextResponse.json(
				{ error: "Notes must be a string" },
				{ status: 400 },
			);
		}

		// Check captain/admin access (assertCaptainAccess checks for both captain and admin roles)
		await assertCaptainAccess(teamId, user.id);

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

		// Check if the subteam exists and belongs to this group
		const subteamResult = await dbPg
			.select({ id: teamSubteams.id, teamId: teamSubteams.teamId })
			.from(teamSubteams)
			.where(
				and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		// Update the roster notes
		const [updateResult] = await dbPg
			.update(teamSubteams)
			.set({
				rosterNotes: notes?.trim() || null,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(teamSubteams.id, subteamId))
			.returning({
				id: teamSubteams.id,
				rosterNotes: teamSubteams.rosterNotes,
			});

		if (!updateResult) {
			return NextResponse.json(
				{ error: "Failed to update roster notes" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			id: updateResult.id,
			rosterNotes: updateResult.rosterNotes,
		});
	} catch (error) {
		if (error instanceof Error && error.message.includes("Only captains")) {
			return NextResponse.json(
				{ error: "Only captains and admins can update roster notes" },
				{ status: 403 },
			);
		}
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// GET /api/teams/[teamId]/subteams/[subteamId]/roster-notes - Get roster notes
export async function GET(
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

		// Resolve the slug to team group
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

		// Check if the subteam exists and belongs to this group
		const subteamResult = await dbPg
			.select({
				id: teamSubteams.id,
				rosterNotes: teamSubteams.rosterNotes,
			})
			.from(teamSubteams)
			.where(
				and(eq(teamSubteams.id, subteamId), eq(teamSubteams.teamId, groupId)),
			)
			.limit(1);

		if (subteamResult.length === 0) {
			return NextResponse.json({ error: "Subteam not found" }, { status: 404 });
		}

		return NextResponse.json({
			id: subteamResult[0]?.id,
			rosterNotes: subteamResult[0]?.rosterNotes || null,
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
