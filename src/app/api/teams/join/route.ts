import { upsertUserProfile } from "@/lib/db/teams/utils";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import logger from "@/lib/utils/logger";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check if CockroachDB is properly configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    // Get user from Supabase auth
    const { getServerUser } = await import("@/lib/supabaseServer");
    const user = await getServerUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Team code is required" }, { status: 400 });
    }

    try {
      // Before joining team, ensure user has a meaningful display name
      try {
        const supabase = await createSupabaseServerClient();
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, username")
          .eq("id", userId)
          .maybeSingle();

        const email: string | undefined =
          (existingProfile as { email?: string } | null)?.email || user.email || undefined;
        const currentDisplay = (existingProfile as { display_name?: string } | null)?.display_name;
        const firstName = (existingProfile as { first_name?: string } | null)?.first_name;
        const lastName = (existingProfile as { last_name?: string } | null)?.last_name;
        const username = (existingProfile as { username?: string } | null)?.username;

        const emailLocal = email?.includes("@") ? email.split("@")[0] : undefined;
        const derivedDisplayName = (() => {
          if (currentDisplay?.trim()) {
            return undefined;
          }
          if (firstName && lastName) {
            return `${firstName.trim()} ${lastName.trim()}`;
          }
          if (firstName?.trim()) {
            return firstName.trim();
          }
          if (lastName?.trim()) {
            return lastName.trim();
          }
          if (username?.trim()) {
            return username.trim();
          }
          if (emailLocal?.trim()) {
            return emailLocal.trim();
          }
          return undefined;
        })();

        if (derivedDisplayName && email) {
          logger.dev.structured("info", "Auto-filling display_name before team join", {
            userId,
            derivedDisplayName,
          });
          await supabase.from("users").upsert(
            {
              id: userId,
              email: email!,
              display_name: derivedDisplayName,
            },
            { onConflict: "id" }
          );
          await upsertUserProfile({
            id: userId,
            email,
            displayName: derivedDisplayName,
            username: username || emailLocal || undefined,
          });
        }
      } catch (e) {
        logger.warn("Failed to auto-fill display_name before team join", e);
      }

      const team = await cockroachDBTeamsService.joinTeamByCode(userId, code);

      if (!team) {
        return NextResponse.json({ error: "Invalid team code" }, { status: 400 });
      }

      return NextResponse.json({
        id: team.id,
        name: team.name,
        slug: team.slug,
        school: team.school,
        division: team.division,
        description: team.description,
        captain_code: team.captain_code,
        user_code: team.user_code,
        user_role: team.user_role,
        members: team.members,
      });
    } catch (joinError: any) {
      return NextResponse.json({ error: joinError.message }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
