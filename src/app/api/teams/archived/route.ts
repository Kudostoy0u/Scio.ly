import { teamsService } from "@/lib/services/teams";
import { getServerUser } from "@/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

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

		// Get user's archived teams using CockroachDB
		const teams = await teamsService.getUserArchivedTeams(user.id);

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
