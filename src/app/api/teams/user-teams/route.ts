import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { getServerUser } from "@/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/teams/user-teams - Get all teams for the current user
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchUserTeams)
// - src/lib/utils/globalApiCache.ts (getUserTeams)
// - src/lib/services/notification-service.ts (getUserTeams)
// - src/lib/utils/userTeamsCache.ts (getUserTeams)
// - src/app/hooks/useEnhancedTeamData.ts (fetchUserTeams)
// - src/app/hooks/useTeamData.ts (fetchUserTeams)
// - src/app/teams/components/TeamCalendar.tsx (fetchUserTeams)
// - src/app/teams/calendar/page.tsx (fetchUserTeams)
export async function GET(_request: NextRequest) {
	try {
		// Check if CockroachDB is properly configured
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					error: "Database configuration error",
					details: "DATABASE_URL environment variable is missing",
				},
				{ status: 500 },
			);
		}

		// Get user from Supabase auth
		const user = await getServerUser();
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get user's teams using CockroachDB
		const teams = await cockroachDBTeamsService.getUserTeams(user.id);

		return NextResponse.json({ teams });
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
