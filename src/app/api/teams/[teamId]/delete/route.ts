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
import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// DELETE /api/teams/[teamId]/delete - Delete archived team
export async function DELETE(
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

    // Resolve the slug to team group using Drizzle ORM
    const [groupResult] = await dbPg
      .select({
        id: newTeamGroups.id,
        createdBy: newTeamGroups.createdBy,
        status: newTeamGroups.status,
      })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;
    const groupCreator = groupResult.createdBy;

    // Check if user is the creator of the team group
    if (groupCreator !== user.id) {
      return handleForbiddenError("Only the team creator can delete the team");
    }

    // Check if team is archived
    if (groupResult.status !== "archived") {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Only archived teams can be deleted",
            path: [],
          },
        ])
      );
    }

    // Get team units for this group using Drizzle ORM
    const unitsResult = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    if (unitsResult.length === 0) {
      return handleNotFoundError("No team units found for this group");
    }

    const teamUnitIds = unitsResult.map((row) => row.id);

    // Delete all memberships, team units, and team group using Drizzle ORM in a transaction
    await dbPg.transaction(async (tx) => {
      // Delete all memberships
      await tx.delete(newTeamMemberships).where(inArray(newTeamMemberships.teamId, teamUnitIds));

      // Delete all team units (cascade will handle related records)
      await tx.delete(newTeamUnits).where(eq(newTeamUnits.groupId, groupId));

      // Delete the team group (cascade will handle related records)
      await tx.delete(newTeamGroups).where(eq(newTeamGroups.id, groupId));
    });

    return NextResponse.json({ message: "Team successfully deleted" });
  } catch (error) {
    return handleError(error, "DELETE /api/teams/[teamId]/delete");
  }
}
