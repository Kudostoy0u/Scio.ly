import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamMemberships, newTeamUnits } from "@/lib/db/schema/teams";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import { and, count, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/exit - Exit team
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
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

    // Resolve the slug to actual team unit IDs using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Get all team units for this group using Drizzle ORM
    const unitsResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    if (unitsResult.length === 0) {
      return handleNotFoundError("No team units found for this group");
    }

    const teamUnitIds = unitsResult.map((row) => row.id);

    // Check if user is a member of any team unit in this group using Drizzle ORM
    const membershipResult = await dbPg
      .select({
        id: newTeamMemberships.id,
        role: newTeamMemberships.role,
        teamId: newTeamMemberships.teamId,
      })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          inArray(newTeamMemberships.teamId, teamUnitIds),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    // Check if user is a captain in any team unit
    const captainMemberships = membershipResult.filter((m) => m.role === "captain");

    if (captainMemberships.length > 0) {
      // Check if there are other captains in the same team units using Drizzle ORM
      for (const membership of captainMemberships) {
        const [captainCountResult] = await dbPg
          .select({ count: count() })
          .from(newTeamMemberships)
          .where(
            and(
              eq(newTeamMemberships.teamId, membership.teamId),
              eq(newTeamMemberships.role, "captain"),
              eq(newTeamMemberships.status, "active")
            )
          );

        const captainCount = captainCountResult?.count ?? 0;
        if (captainCount <= 1) {
          return handleValidationError(
            new z.ZodError([
              {
                code: z.ZodIssueCode.custom,
                message:
                  "Cannot exit team as the only captain. Promote another member to captain first.",
                path: [],
              },
            ])
          );
        }
      }
    }

    // Remove user from all team units in this group using Drizzle ORM
    await dbPg
      .update(newTeamMemberships)
      .set({ status: "inactive" })
      .where(
        and(eq(newTeamMemberships.userId, user.id), inArray(newTeamMemberships.teamId, teamUnitIds))
      );

    return NextResponse.json({ message: "Successfully exited team" });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/exit");
  }
}
