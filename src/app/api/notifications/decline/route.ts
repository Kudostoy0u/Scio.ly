import { requireAuth } from "@/lib/api/auth";
import { queryCockroachDB } from "@/lib/cockroachdb";
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
      await queryCockroachDB(
        `UPDATE roster_link_invitations 
         SET status = 'declined'
         WHERE id = $1`,
        [invitationId]
      );

      // Mark the notification as read
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user?.id]
      );

      return NextResponse.json({ success: true });
    }

    if (type === "assignment_invitation") {
      // For assignment invitations, just mark as read since declining doesn't change anything
      // (the assignment still exists and the user is still assigned to it)
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user?.id]
      );

      return NextResponse.json({ success: true });
    }

    // For other notification types, just mark as read
    await queryCockroachDB(
      `UPDATE new_team_notifications 
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, user?.id]
    );

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to decline notification" }, { status: 500 });
  }
}
