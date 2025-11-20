import { dbPg } from "@/lib/db";
import {
  newTeamInvitations,
  newTeamMemberships,
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
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/invite/cancel - Cancel team invitation
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
    const CancelInviteSchema = z.object({
      invitationCode: z.string().min(1, "Invitation code is required"),
    });

    let validatedBody: z.infer<typeof CancelInviteSchema>;
    try {
      validatedBody = validateRequest(CancelInviteSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/invite/cancel - validation");
    }

    const { invitationCode } = validatedBody;

    // Resolve team slug to team unit IDs
    let teamUnitIds: string[];
    try {
      const teamInfo = await resolveTeamSlugToUnits(teamId);
      teamUnitIds = teamInfo.teamUnitIds;
    } catch {
      return handleNotFoundError("Team");
    }

    // Check if user is captain or co-captain in any of the team units using Drizzle ORM
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

    // Check if user has captain or co-captain role in any team unit
    const hasCaptainRole = membershipResult.some((membership) =>
      ["captain", "co_captain"].includes(membership.role)
    );

    if (!hasCaptainRole) {
      return handleForbiddenError("Only captains can cancel invitations");
    }

    // Find and cancel the invitation using Drizzle ORM
    const [invitationResult] = await dbPg
      .select({ id: newTeamInvitations.id, email: newTeamInvitations.email })
      .from(newTeamInvitations)
      .where(
        and(
          eq(newTeamInvitations.invitationCode, invitationCode),
          inArray(newTeamInvitations.teamId, teamUnitIds),
          eq(newTeamInvitations.status, "pending")
        )
      )
      .limit(1);

    if (!invitationResult) {
      return handleNotFoundError("Invitation not found or already processed");
    }

    // Update invitation status to cancelled using Drizzle ORM
    await dbPg
      .update(newTeamInvitations)
      .set({
        status: "declined",
        acceptedAt: new Date(),
      })
      .where(eq(newTeamInvitations.id, invitationResult.id));

    return NextResponse.json({
      message: "Invitation cancelled successfully",
      email: invitationResult.email ?? "",
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/invite/cancel");
  }
}
