import { requireAuth } from "@/lib/api/auth";
import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamPeople,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod validation schemas
const NotificationAcceptanceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["team_invite", "roster_link_invitation"]),
  school: z.string().optional(),
  division: z.string().optional(),
  teamId: z.string().uuid().optional(),
  memberName: z.string().optional(),
  invitationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) {
      return error;
    }

    const body = await request.json();

    // Validate request body with Zod
    const validationResult = NotificationAcceptanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { id, type } = validationResult.data;

    if (type === "team_invite") {
      // Handle team invitation acceptance using join code
      try {
        const notificationResult = await dbPg
          .select({
            data: newTeamNotifications.data,
            teamId: newTeamNotifications.teamId,
          })
          .from(newTeamNotifications)
          .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")))
          .limit(1);

        if (notificationResult.length === 0) {
          return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        const notification = notificationResult[0];
        if (!notification) {
          return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }
        const notificationData = notification.data as {
          invitation_id?: string;
          inviter_name?: string;
          student_name?: string;
          team_name?: string;
          team_slug?: string;
          joinCode?: string;
        };
        const joinCode = notificationData?.joinCode;

        if (!joinCode) {
          return NextResponse.json(
            { error: "Join code not found in notification" },
            { status: 400 }
          );
        }
        const { cockroachDBTeamsService } = await import("@/lib/services/cockroachdb-teams");

        // Add retry logic for robustness
        let team: any = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (!team && retryCount < maxRetries) {
          try {
            team = await cockroachDBTeamsService.joinTeamByCode(user?.id ?? "", joinCode);
            if (team) {
              break;
            }
          } catch (_joinError) {
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        if (!team) {
          return NextResponse.json({ error: "Invalid or expired join code" }, { status: 400 });
        }
        const membershipVerification = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role,
          })
          .from(newTeamMemberships)
          .where(
            and(eq(newTeamMemberships.userId, user?.id ?? ""), eq(newTeamMemberships.teamId, team.id))
          )
          .limit(1);

        if (membershipVerification.length === 0) {
          return NextResponse.json({ error: "Team membership creation failed" }, { status: 500 });
        }
        const peopleVerification = await dbPg
          .select({
            id: newTeamPeople.id,
            name: newTeamPeople.name,
            isAdmin: newTeamPeople.isAdmin,
          })
          .from(newTeamPeople)
          .where(and(eq(newTeamPeople.userId, user?.id ?? ""), eq(newTeamPeople.teamUnitId, team.id)))
          .limit(1);

        if (peopleVerification.length === 0) {
          // Don't fail the request, just log the warning
        } else {
        }
        await dbPg
          .update(newTeamNotifications)
          .set({
            isRead: true,
            readAt: new Date(),
          })
          .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")));

        return NextResponse.json({
          success: true,
          slug: team.slug,
          message: "Team invitation accepted successfully",
          membershipId: membershipVerification[0]?.id ?? "",
          role: membershipVerification[0]?.role ?? "member",
        });
      } catch (_inviteError) {
        return NextResponse.json({ error: "Failed to accept team invitation" }, { status: 500 });
      }
    }

    if (type === "roster_link_invitation") {
      const notificationResult = await dbPg
        .select({
          data: newTeamNotifications.data,
          teamId: newTeamNotifications.teamId,
        })
        .from(newTeamNotifications)
        .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")))
        .limit(1);

      if (notificationResult.length === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      const notification = notificationResult[0];
      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      // const notificationData = notification.data as {
      //   invitation_id?: string;
      //   inviter_name?: string;
      //   student_name?: string;
      //   team_name?: string;
      //   team_slug?: string;
      //   joinCode?: string;
      // };
      const teamId = notification.teamId;

      if (!teamId) {
        return NextResponse.json({ error: "Team ID not found in notification" }, { status: 400 });
      }
      const existingMembership = await dbPg
        .select({
          id: newTeamMemberships.id,
          role: newTeamMemberships.role,
        })
        .from(newTeamMemberships)
        .where(and(eq(newTeamMemberships.userId, user?.id ?? ""), eq(newTeamMemberships.teamId, teamId)))
        .limit(1);

      if (existingMembership.length === 0) {
        // Create team membership for the user
        const { cockroachDBTeamsService } = await import("@/lib/services/cockroachdb-teams");
        await cockroachDBTeamsService.createTeamMembership({
          userId: user?.id ?? "",
          teamId: teamId,
          role: "member", // Default role for roster link invitations
          status: "active",
        });
      } else {
        // Update existing membership to active using Drizzle ORM
        await dbPg
          .update(newTeamMemberships)
          .set({
            status: "active",
            joinedAt: new Date(),
          })
          .where(
            and(eq(newTeamMemberships.userId, user?.id ?? ""), eq(newTeamMemberships.teamId, teamId))
          );
      }

      // Get user's display name for the roster
      const userResult = await queryCockroachDB<{
        display_name: string;
        username: string;
        email: string;
      }>("SELECT display_name, username, email FROM users WHERE id = $1", [user?.id]);

      const userInfo = userResult.rows[0];
      const displayName =
        userInfo?.display_name ||
        userInfo?.username ||
        userInfo?.email?.split("@")[0] ||
        "Unknown User";
      const unlinkedRosterResult = await dbPg
        .select({
          id: newTeamRosterData.id,
          studentName: newTeamRosterData.studentName,
          teamUnitId: newTeamRosterData.teamUnitId,
          eventName: newTeamRosterData.eventName,
          slotIndex: newTeamRosterData.slotIndex,
        })
        .from(newTeamRosterData)
        .where(and(isNull(newTeamRosterData.userId), eq(newTeamRosterData.teamUnitId, teamId)));

      if (unlinkedRosterResult.length > 0) {
        // Process each unlinked entry
        for (const unlinkedEntry of unlinkedRosterResult) {
          // Update the roster entry to link it to the user using Drizzle ORM
          await dbPg
            .update(newTeamRosterData)
            .set({
              studentName: displayName,
              userId: user?.id,
            })
            .where(eq(newTeamRosterData.id, unlinkedEntry.id));

          // Update any assignment rosters that reference this student
          await queryCockroachDB(
            `UPDATE new_team_assignment_roster 
             SET student_name = $1, user_id = $2
             WHERE student_name = $3 AND user_id IS NULL`,
            [displayName, user?.id, unlinkedEntry.studentName]
          );

          // Update any team posts that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_posts 
             SET content = REPLACE(content, $1, $2)
             WHERE team_id = $3 AND content LIKE '%' || $1 || '%'`,
            [unlinkedEntry.studentName, displayName, teamId]
          );

          // Update any team events that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_events 
             SET title = REPLACE(title, $1, $2),
                 description = REPLACE(description, $1, $2)
             WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
            [unlinkedEntry.studentName, displayName, teamId]
          );

          // Update assignment analytics that might contain the student name
          await queryCockroachDB(
            `UPDATE new_team_assignment_analytics 
             SET student_name = $1, user_id = $2
             WHERE student_name = $3 AND user_id IS NULL`,
            [displayName, user?.id, unlinkedEntry.studentName]
          );

          // Update any materials or other team content that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_materials 
             SET title = REPLACE(title, $1, $2),
                 description = REPLACE(description, $1, $2)
             WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
            [unlinkedEntry.studentName, displayName, teamId]
          );
        }

        await dbPg
          .update(newTeamPeople)
          .set({
            name: displayName,
          })
          .where(and(eq(newTeamPeople.userId, user?.id ?? ""), eq(newTeamPeople.teamUnitId, teamId)));
      } else {
      }
      await dbPg
        .update(newTeamNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")));
      const membershipVerification = await dbPg
        .select({
          id: newTeamMemberships.id,
          role: newTeamMemberships.role,
        })
        .from(newTeamMemberships)
        .where(and(eq(newTeamMemberships.userId, user?.id ?? ""), eq(newTeamMemberships.teamId, teamId)))
        .limit(1);

      if (membershipVerification.length === 0) {
        return NextResponse.json({ error: "Team membership creation failed" }, { status: 500 });
      }
      const peopleVerification = await dbPg
        .select({
          id: newTeamPeople.id,
          name: newTeamPeople.name,
          isAdmin: newTeamPeople.isAdmin,
        })
        .from(newTeamPeople)
        .where(and(eq(newTeamPeople.userId, user?.id ?? ""), eq(newTeamPeople.teamUnitId, teamId)))
        .limit(1);

      if (peopleVerification.length === 0) {
        // Don't fail the request, just log the warning
      } else {
      }
      const teamResult = await dbPg
        .select({
          slug: newTeamGroups.slug,
          school: newTeamGroups.school,
          division: newTeamGroups.division,
        })
        .from(newTeamGroups)
        .innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
        .where(eq(newTeamUnits.id, teamId))
        .limit(1);

      if (teamResult.length > 0) {
        const team = teamResult[0];
        if (!team) {
          return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          slug: team.slug,
          message: "Roster link invitation accepted successfully",
          membershipId: membershipVerification[0]?.id ?? "",
          role: membershipVerification[0]?.role ?? "member",
        });
      }
      return NextResponse.json({
        success: true,
        message: "Roster link invitation accepted successfully",
        membershipId: membershipVerification[0]?.id ?? "",
        role: membershipVerification[0]?.role ?? "member",
      });
    }

    // For other notification types, just mark as read using Drizzle ORM
    await dbPg
      .update(newTeamNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")));
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to accept notification" }, { status: 500 });
  } finally {
  }
}
