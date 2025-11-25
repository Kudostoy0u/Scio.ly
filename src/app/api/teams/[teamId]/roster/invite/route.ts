import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamUnits,
  rosterLinkInvitations,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type RosterLinkInvitation = typeof rosterLinkInvitations.$inferSelect;

// GET /api/teams/[teamId]/roster/invite - Search users to invite for roster linking
// Frontend Usage:
// - src/app/teams/components/RosterLinkIndicator.tsx (searchUsers)
export async function GET(
  request: NextRequest,
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

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
          or(
            sql`${users.username} ILIKE ${`%${query}%`}`,
            sql`${users.email} ILIKE ${`%${query}%`}`
          ),
          ne(users.id, user.id)
        )
      )
      .limit(10);

    return NextResponse.json({ users: usersResult });
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/roster/invite");
  }
}

// POST /api/teams/[teamId]/roster/invite - Send roster link invitation
// Frontend Usage:
// - src/app/teams/components/RosterLinkIndicator.tsx (sendInvite)
// - src/app/teams/components/PeopleTab.tsx (linkRoster)
export async function POST(
  request: NextRequest,
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
    let body: unknown;
    try {
      body = await request.json();
    } catch (_error) {
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
    const RosterInviteSchema = z.object({
      subteamId: UUIDSchema,
      studentName: z.string().min(1, "Student name is required"),
      username: z.string().min(1, "Username is required"),
      message: z.string().max(500).optional(),
    });

    let validatedBody: z.infer<typeof RosterInviteSchema>;
    try {
      validatedBody = validateRequest(RosterInviteSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/[teamId]/roster/invite - validation");
    }

    const { subteamId, studentName, username, message } = validatedBody;

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
      return handleForbiddenError("Only captains can send roster invitations");
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

    // Find the user to invite using Drizzle ORM
    const [userResult] = await dbPg
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

    if (!userResult) {
      return handleNotFoundError("User");
    }

    const invitedUser = userResult;

    // Use the user's actual display name instead of the roster entry name
    const userDisplayName =
      invitedUser.display_name ||
      (invitedUser.first_name && invitedUser.last_name
        ? `${invitedUser.first_name} ${invitedUser.last_name}`
        : invitedUser.username || invitedUser.email?.split("@")[0] || "Unknown User");

    // Check for existing roster link invitation (pending or declined) using Drizzle ORM
    const [existingInvitation] = await dbPg
      .select({ id: rosterLinkInvitations.id, status: rosterLinkInvitations.status })
      .from(rosterLinkInvitations)
      .where(
        and(
          eq(rosterLinkInvitations.teamId, subteamId),
          eq(rosterLinkInvitations.studentName, studentName),
          eq(rosterLinkInvitations.invitedUserId, invitedUser.id)
        )
      )
      .limit(1);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    let invitation: RosterLinkInvitation | undefined;

    if (existingInvitation) {
      if (existingInvitation.status === "pending") {
        return handleValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: "Roster link invitation already sent",
              path: [],
            },
          ])
        );
      }

      // Update existing declined/expired invitation to pending using Drizzle ORM
      const [updatedInvitation] = await dbPg
        .update(rosterLinkInvitations)
        .set({
          status: "pending",
          invitedBy: user.id,
          message:
            message ||
            `You've been invited to link your account to the roster entry "${studentName}"`,
          expiresAt,
          createdAt: new Date(),
        })
        .where(eq(rosterLinkInvitations.id, existingInvitation.id))
        .returning();

      invitation = updatedInvitation;
    } else {
      // Create new roster link invitation using Drizzle ORM
      const [newInvitation] = await dbPg
        .insert(rosterLinkInvitations)
        .values({
          teamId: subteamId,
          studentName,
          invitedUserId: invitedUser.id,
          invitedBy: user.id,
          message:
            message ||
            `You've been invited to link your account to the roster entry "${studentName}"`,
          status: "pending",
          expiresAt,
        })
        .returning();

      invitation = newInvitation;
    }

    if (!invitation) {
      return handleError(
        new Error("Failed to create or update invitation"),
        "POST /api/teams/[teamId]/roster/invite - invitation"
      );
    }

    // Get team information for the notification using Drizzle ORM
    const [teamInfo] = await dbPg
      .select({
        school: newTeamGroups.school,
        division: newTeamGroups.division,
      })
      .from(newTeamUnits)
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(eq(newTeamUnits.id, subteamId))
      .limit(1);

    const teamName = teamInfo ? `${teamInfo.school} ${teamInfo.division}` : "Unknown Team";

    // Create notification for invited user using Drizzle ORM
    const [notificationResult] = await dbPg
      .insert(newTeamNotifications)
      .values({
        userId: invitedUser.id,
        teamId: subteamId,
        notificationType: "roster_link_invitation",
        title: `Roster Link Invitation - ${teamName}`,
        message: `You've been invited to link your account to "${userDisplayName}" on ${teamName}`,
        data: {
          invitation_id: invitation.id,
          student_name: userDisplayName,
          inviter_name: user.email,
          team_slug: teamId,
          team_name: teamName,
        },
      })
      .returning({ id: newTeamNotifications.id });

    // Sync notification to Supabase for client-side access
    if (notificationResult) {
      try {
        await NotificationSyncService.syncNotificationToSupabase(notificationResult.id);
      } catch (syncError) {
        // Don't fail the entire request if sync fails
        logger.error("Failed to sync notification to Supabase", {
          error: syncError,
          notificationId: notificationResult.id,
        });
      }
    }

    return NextResponse.json({
      invitation,
      message: "Roster link invitation sent successfully",
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/[teamId]/roster/invite");
  }
}
