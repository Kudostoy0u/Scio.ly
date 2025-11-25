import { requireAuth } from "@/lib/api/auth";
import { dbPg } from "@/lib/db/index";
import { rosterLinkInvitations } from "@/lib/db/schema";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) {
      return error;
    }

    const body = await request.json();
    const { id, type, invitationId } = body;

    if (!(id && type)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "roster_link_invitation") {
      if (!invitationId) {
        return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 });
      }

      // Update the roster link invitation status to declined
      await dbPg
        .update(rosterLinkInvitations)
        .set({ status: "declined" })
        .where(eq(rosterLinkInvitations.id, invitationId));

      // Mark the notification as read
      await dbPg
        .update(newTeamNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? ""))
        );

      return NextResponse.json({ success: true });
    }

    if (type === "assignment_invitation") {
      // For assignment invitations, just mark as read since declining doesn't change anything
      // (the assignment still exists and the user is still assigned to it)
      await dbPg
        .update(newTeamNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? ""))
        );

      return NextResponse.json({ success: true });
    }

    // For other notification types, just mark as read
    await dbPg
      .update(newTeamNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(newTeamNotifications.id, id), eq(newTeamNotifications.userId, user?.id ?? "")));

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to decline notification" }, { status: 500 });
  }
}
