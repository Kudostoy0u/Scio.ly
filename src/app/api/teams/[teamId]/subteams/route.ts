import { dbPg } from "@/lib/db";
import { teamSubteams, teams } from "@/lib/db/schema";
import { getServerUser } from "@/lib/supabaseServer";
import { getTeamAccess } from "@/lib/utils/teams/access";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/teams/[teamId]/subteams - Get all subteams for a team group
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchSubteams)
// - src/lib/utils/globalApiCache.ts (getSubteams)
// - src/app/hooks/useEnhancedTeamData.ts (fetchSubteams)
// - src/app/hooks/useTeamData.ts (fetchSubteams)
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	let teamId: string | undefined;

	try {
		const serverUser = await getServerUser();
		if (!serverUser?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const userId = serverUser.id;

		const { teamId: paramTeamId } = await params;
		teamId = paramTeamId;
		const groupResult = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId));

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const firstGroup = groupResult[0];
		if (!firstGroup) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}
		const groupId = firstGroup.id;
		const teamAccess = await getTeamAccess(userId, groupId);

		if (!teamAccess.hasAccess) {
			return NextResponse.json(
				{ error: "Not authorized to access this team" },
				{ status: 403 },
			);
		}
		const subteamsResult = await dbPg
			.select({
				id: teamSubteams.id,
				teamId: teamSubteams.teamId,
				description: teamSubteams.description,
				createdAt: teamSubteams.createdAt,
			})
			.from(teamSubteams)
			.where(
				and(
					eq(teamSubteams.teamId, groupId),
					eq(teamSubteams.status, "active"),
				),
			)
			.orderBy(teamSubteams.createdAt);

		const subteams = subteamsResult.map((subteam) => ({
			id: subteam.id,
			name: subteam.description || `Team ${subteam.teamId}`, // Use description as name, fallback to Team + letter
			teamId: subteam.teamId,
			description: subteam.description,
			createdAt: subteam.createdAt,
		}));

		return NextResponse.json({ subteams });
	} catch (error) {
		// Log error for debugging in development
		// Development logging can be added here if needed
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// POST /api/teams/[teamId]/subteams - Create a new subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (createSubteam)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
) {
	let teamId: string | undefined;

	try {
		const serverUser = await getServerUser();
		if (!serverUser?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const userId = serverUser.id;

		const { teamId: paramTeamId } = await params;
		teamId = paramTeamId;
		const body = await request.json();
		const { name, description } = body;

		if (!name) {
			return NextResponse.json(
				{
					error: "Name is required",
				},
				{ status: 400 },
			);
		}
		const groupResult = await dbPg
			.select({ id: teams.id })
			.from(teams)
			.where(eq(teams.slug, teamId));

		if (groupResult.length === 0) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}

		const firstGroup = groupResult[0];
		if (!firstGroup) {
			return NextResponse.json(
				{ error: "Team group not found" },
				{ status: 404 },
			);
		}
		const groupId = firstGroup.id;
		const teamAccess = await getTeamAccess(userId, groupId);
		const hasLeadership =
			teamAccess.isCreator ||
			(teamAccess.memberships ?? []).some(
				(m) => m.role === "captain" || m.role === "admin",
			);

		if (!hasLeadership) {
			return NextResponse.json(
				{
					error: "Only captains and co-captains can create subteams",
				},
				{ status: 403 },
			);
		}

		// Get existing subteams to determine the next available team ID
		// Check ALL subteams regardless of status since the unique constraint applies to all
		const existingSubteams = await dbPg
			.select({ teamId: teamSubteams.teamId })
			.from(teamSubteams)
			.where(eq(teamSubteams.teamId, groupId));

		const existingTeamIds = new Set(existingSubteams.map((s) => s.teamId));

		// Generate the next available team ID letter
		let teamIdLetter = "A";
		while (existingTeamIds.has(teamIdLetter)) {
			teamIdLetter = String.fromCharCode(teamIdLetter.charCodeAt(0) + 1);
		}

		// If we've gone past Z, use a numeric suffix
		if (teamIdLetter > "Z") {
			let counter = 1;
			teamIdLetter = `T${counter}`;
			while (existingTeamIds.has(teamIdLetter)) {
				counter++;
				teamIdLetter = `T${counter}`;
			}
		}

		const [newSubteam] = await dbPg
			.insert(teamSubteams)
			.values({
				teamId: groupId,
				name: teamIdLetter,
				description: description || name, // Use provided description or fallback to name
				captainCode: `CAP${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
				userCode: `USR${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
				createdBy: userId,
			})
			.returning();

		if (!newSubteam) {
			return NextResponse.json(
				{ error: "Failed to create subteam" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			subteam: {
				id: newSubteam.id,
				name: newSubteam.description || `Team ${newSubteam.teamId}`, // Use description as name, fallback to Team + letter
				team_id: newSubteam.teamId,
				description: newSubteam.description,
				created_at: newSubteam.createdAt,
			},
		});
	} catch (error) {
		// Log error for debugging in development
		// Development logging can be added here if needed
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
