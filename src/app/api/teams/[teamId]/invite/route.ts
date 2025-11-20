import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import {
  newTeamGroups,
  newTeamInvitations,
  newTeamMemberships,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { PostInviteRequestSchema, InviteResponseSchema, validateRequest } from "@/lib/schemas/teams-validation";
import {
  handleConflictError,
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { and, eq, inArray, ilike, ne, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/[teamId]/invite - Invite user to team
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (inviteUser)
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

    // Validate request body using Zod
    let validatedBody: z.infer<typeof PostInviteRequestSchema>;
    try {
      validatedBody = validateRequest(PostInviteRequestSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/invite - validation");
    }

    const { username, email, requestedTeamUnitId } = validatedBody;

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
        team_id: newTeamMemberships.teamId,
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

    // Determine which team unit to invite to
    let targetTeamUnitId: string;
    if (requestedTeamUnitId) {
      // Validate that the specified team unit is in the group and user has permission
      if (!teamUnitIds.includes(requestedTeamUnitId)) {
        return handleValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: "Invalid team unit",
              path: ["requestedTeamUnitId"],
            },
          ])
        );
      }

      const hasPermissionForUnit = membershipResult.some(
        (membership) =>
          membership.team_id === requestedTeamUnitId &&
          ["captain", "co_captain"].includes(membership.role)
      );

      if (!hasPermissionForUnit) {
        return handleForbiddenError("No permission to invite to this team unit");
      }

      targetTeamUnitId = requestedTeamUnitId;
    } else {
      // Default to the first team unit where user has captain/co-captain role
      const captainMembership = membershipResult.find((membership) =>
        ["captain", "co_captain"].includes(membership.role)
      );

      if (!captainMembership) {
        return handleForbiddenError("Only captains can invite members");
      }

      targetTeamUnitId = captainMembership.team_id;
    }

    // Find the user to invite using Drizzle ORM
    let invitedUser;
    if (username) {
      const userResult = await dbPg
        .select({
          id: users.id,
          email: users.email,
          display_name: users.displayName,
          first_name: users.firstName,
          last_name: users.lastName,
          username: users.username,
        })
        .from(users)
        .where(or(eq(users.username, username), eq(users.email, username)))
        .limit(1);
      invitedUser = userResult[0];
    } else if (email) {
      const userResult = await dbPg
        .select({
          id: users.id,
          email: users.email,
          display_name: users.displayName,
          first_name: users.firstName,
          last_name: users.lastName,
          username: users.username,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      invitedUser = userResult[0];
    }

    if (!invitedUser) {
      return handleNotFoundError("User");
    }

    // Check if user is already a member of any team unit in this group using Drizzle ORM
    const existingMembership = await dbPg
      .select({ id: newTeamMemberships.id })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, invitedUser.id),
          inArray(newTeamMemberships.teamId, teamUnitIds)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return handleConflictError("User is already a team member");
    }

    // Check for existing pending invitation to any team unit in this group using Drizzle ORM
    const existingInvitation = await dbPg
      .select({ id: newTeamInvitations.id })
      .from(newTeamInvitations)
      .where(
        and(
          inArray(newTeamInvitations.teamId, teamUnitIds),
          eq(newTeamInvitations.email, invitedUser.email),
          eq(newTeamInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return handleConflictError("Invitation already sent");
    }

    // Get the team's join code (user_code for members, captain_code for captains) using Drizzle ORM
    const teamCodeResult = await dbPg
      .select({
        user_code: newTeamUnits.userCode,
        captain_code: newTeamUnits.captainCode,
        groupId: newTeamUnits.groupId,
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.id, targetTeamUnitId))
      .limit(1);

    if (teamCodeResult.length === 0 || !teamCodeResult[0]) {
      return handleNotFoundError("Team unit");
    }

    const teamCodes = teamCodeResult[0];
    // Use user_code for all invites (captain_code is for team creation, not invitations)
    const joinCode = teamCodes.user_code;

    // Get team group info for notification using Drizzle ORM
    const teamGroupResult = await dbPg
      .select({
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        slug: newTeamGroups.slug,
      })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, teamCodes.groupId))
      .limit(1);

    if (teamGroupResult.length === 0 || !teamGroupResult[0]) {
      return handleNotFoundError("Team group");
    }

    const teamGroup = teamGroupResult[0];

    // Create notification for invited user using Drizzle ORM
    const [notificationResult] = await dbPg
      .insert(newTeamNotifications)
      .values({
        userId: invitedUser.id,
        teamId: targetTeamUnitId,
        notificationType: "team_invite",
        title: "Team Invitation",
        message: `You've been invited to join ${teamGroup.school} - Division ${teamGroup.division}`,
      })
      .returning({ id: newTeamNotifications.id });

    // Sync notification to Supabase for client-side access
    if (notificationResult) {
      try {
        await NotificationSyncService.syncNotificationToSupabase(notificationResult.id);
      } catch (syncError) {
        logger.error("Failed to sync notification to Supabase", syncError);
        // Don't fail the entire request if sync fails
      }
    }

    // Validate response using Zod
    const responseData = {
      message: "Invitation sent successfully",
      joinCode: joinCode,
    };
    try {
      InviteResponseSchema.parse(responseData);
    } catch (error) {
      logger.error("Response validation failed", error);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/invite");
  }
}

// GET /api/teams/[teamId]/invite - Search users to invite
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (searchUsers)
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

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
      return handleForbiddenError("Only captains can search users");
    }

    // Search users by username or email using Drizzle ORM
    const usersResult = await dbPg
      .select({
        id: users.id,
        email: users.email,
        display_name: users.displayName,
        first_name: users.firstName,
        last_name: users.lastName,
        username: users.username,
        photo_url: users.photoUrl,
      })
      .from(users)
      .where(
        and(
          or(ilike(users.username, `%${query}%`), ilike(users.email, `%${query}%`)),
          ne(users.id, user.id)
        )
      )
      .limit(10);

    return NextResponse.json({ users: usersResult });
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/invite");
  }
}
