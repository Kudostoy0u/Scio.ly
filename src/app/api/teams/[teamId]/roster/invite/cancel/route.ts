import { dbPg } from "@/lib/db";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamUnits,
  rosterLinkInvitations,
} from "@/lib/db/schema/teams";
import {
  UUIDSchema,
  validateRequest,
} from "@/lib/schemas/teams-validation";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import { getServerUser } from "@/lib/supabaseServer";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/roster/invite/cancel - Cancel roster link invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Invalid JSON in request body",
            path: [],
          },
        ])
      );
    }

    // Validate request body
    const CancelRosterInviteSchema = z.object({
      subteamId: UUIDSchema,
      studentName: z.string().min(1, "Student name is required"),
    });

    let validatedBody: z.infer<typeof CancelRosterInviteSchema>;
    try {
      validatedBody = validateRequest(CancelRosterInviteSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/roster/invite/cancel - validation");
    }

    const { subteamId, studentName } = validatedBody;

    // Resolve the slug to team group using Drizzle ORM
    const [groupResult] = await dbPg
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamId))
      .limit(1);

    if (!groupResult) {
      return handleNotFoundError("Team group");
    }

    const groupId = groupResult.id;

    // Check if user is a member of this team group using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (membershipResult.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    // Check if user has captain or co-captain role in any team unit
    const hasCaptainRole = membershipResult.some((membership) =>
      ["captain", "co_captain"].includes(membership.role)
    );

    if (!hasCaptainRole) {
      return handleForbiddenError("Only captains can cancel roster invitations");
    }

    // Check if the subteam belongs to this group using Drizzle ORM
    const [subteamResult] = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(
        and(
          eq(newTeamUnits.id, subteamId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamUnits.status, "active")
        )
      )
      .limit(1);

    if (!subteamResult) {
      return handleNotFoundError("Subteam");
    }

    // Find and cancel the pending roster link invitation using Drizzle ORM
    const [invitationResult] = await dbPg
      .select({ id: rosterLinkInvitations.id })
      .from(rosterLinkInvitations)
      .where(
        and(
          eq(rosterLinkInvitations.teamId, subteamId),
          eq(rosterLinkInvitations.studentName, studentName),
          eq(rosterLinkInvitations.status, "pending")
        )
      )
      .limit(1);

    if (!invitationResult) {
      return handleNotFoundError("No pending invitation found");
    }

    // Cancel the invitation using Drizzle ORM
    await dbPg
      .update(rosterLinkInvitations)
      .set({ status: "declined" })
      .where(
        and(
          eq(rosterLinkInvitations.teamId, subteamId),
          eq(rosterLinkInvitations.studentName, studentName),
          eq(rosterLinkInvitations.status, "pending")
        )
      );

    return NextResponse.json({
      message: "Roster link invitation cancelled successfully",
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/roster/invite/cancel");
  }
}
