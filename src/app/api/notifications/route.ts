import { rateLimit, requireAuth, validateRequestBody } from "@/lib/api/auth";
import { createNotification } from "@/lib/db/notifications";
import type { NotificationType } from "@/lib/db/notifications";
import { TeamDataService } from "@/lib/services/team-data";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitError = rateLimit(ip, 100, 60000);
    if (rateLimitError) {
      return rateLimitError;
    }

    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) {
      return error;
    }

    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("include") === "all";

    // Use the new notification system that includes roster_link_invitation
    const { notifications, unread_count } = await TeamDataService.getUserNotifications(
      user?.id ?? "",
      100, // limit
      0, // offset
      !includeAll // unreadOnly
    );

    return NextResponse.json({
      success: true,
      data: notifications,
      unread: unread_count,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (stricter for POST)
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitError = rateLimit(ip, 50, 60000);
    if (rateLimitError) {
      return rateLimitError;
    }

    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) {
      return error;
    }

    const body = await request.json();
    const action = body?.action as string;

    if (action === "markRead") {
      const id = body?.id?.toString();
      if (!id) {
        return NextResponse.json(
          { success: false, error: "Invalid notification ID" },
          { status: 400 }
        );
      }

      // Use the new notification system
      await TeamDataService.markNotificationsAsRead(user?.id ?? "", [id]);
      return NextResponse.json({ success: true });
    }

    if (action === "markAllRead") {
      // Use the new notification system
      await TeamDataService.markNotificationsAsRead(user?.id ?? "", undefined, true);
      return NextResponse.json({ success: true });
    }

    if (action === "create") {
      // Validate required fields
      const validation = validateRequestBody<{
        userId: string;
        type: NotificationType;
        title: string;
      }>(body, ["userId", "type", "title"]);

      if (!validation.valid) {
        return validation.error!;
      }

      const { userId, type, title, body: notificationBody, data } = body;

      // Validate notification type
      const validTypes: NotificationType[] = [
        "team_invite",
        "generic",
        "assignment",
        "roster_link_invitation",
      ];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: "Invalid notification type" },
          { status: 400 }
        );
      }

      const notification = await createNotification({
        userId,
        type,
        title,
        body: notificationBody || null,
        data: data || {},
        isRead: false,
      });

      return NextResponse.json({ success: true, data: notification });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to process notification request", details: errorMessage },
      { status: 500 }
    );
  }
}
