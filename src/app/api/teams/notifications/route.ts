import { dbPg } from "@/lib/db";
import { newTeamNotifications as notificationsSchema } from "@/lib/db/schema/notifications";
import { newTeamGroups, newTeamUnits } from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const unreadOnly = searchParams.get("unread_only") === "true";

    // Validate query parameters
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Limit must be between 1 and 100",
            path: ["limit"],
          },
        ])
      );
    }

    if (Number.isNaN(offset) || offset < 0) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Offset must be >= 0",
            path: ["offset"],
          },
        ])
      );
    }

    // Build where conditions
    const whereConditions = [eq(notificationsSchema.userId, user.id)];
    if (unreadOnly) {
      whereConditions.push(eq(notificationsSchema.isRead, false));
    }

    // Get notifications with team information using Drizzle ORM
    const notificationsResult = await dbPg
      .select({
        id: notificationsSchema.id,
        type: notificationsSchema.notificationType,
        title: notificationsSchema.title,
        message: notificationsSchema.message,
        data: notificationsSchema.data,
        is_read: notificationsSchema.isRead,
        created_at: notificationsSchema.createdAt,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        team_name: sql<string>`COALESCE(${newTeamUnits.description}, ${newTeamUnits.teamId}::text)`,
      })
      .from(notificationsSchema)
      .leftJoin(newTeamUnits, eq(notificationsSchema.teamId, newTeamUnits.id))
      .leftJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(and(...whereConditions))
      .orderBy(desc(notificationsSchema.createdAt))
      .limit(limit)
      .offset(offset);

    // Get unread count using Drizzle ORM
    const [unreadCountResult] = await dbPg
      .select({ count: count() })
      .from(notificationsSchema)
      .where(and(eq(notificationsSchema.userId, user.id), eq(notificationsSchema.isRead, false)));

    return NextResponse.json({
      notifications: notificationsResult,
      unread_count: unreadCountResult?.count ?? 0,
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/notifications");
  }
}

// PUT /api/teams/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

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
    const MarkNotificationsReadSchema = z.object({
      notification_ids: z.array(UUIDSchema).optional(),
      mark_all_read: z.boolean().default(false).optional(),
    });

    let validatedBody: z.infer<typeof MarkNotificationsReadSchema>;
    try {
      validatedBody = validateRequest(MarkNotificationsReadSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "PUT /api/teams/notifications - validation");
    }

    const { notification_ids, mark_all_read = false } = validatedBody;

    if (mark_all_read) {
      // Mark all notifications as read using Drizzle ORM
      await dbPg
        .update(notificationsSchema)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(eq(notificationsSchema.userId, user.id), eq(notificationsSchema.isRead, false)));
    } else if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read using Drizzle ORM
      await dbPg
        .update(notificationsSchema)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notificationsSchema.userId, user.id),
            inArray(notificationsSchema.id, notification_ids)
          )
        );
    } else {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Either mark_all_read must be true or notification_ids must be provided",
            path: [],
          },
        ])
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "PUT /api/teams/notifications");
  }
}

// DELETE /api/teams/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

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
    const DeleteNotificationsSchema = z.object({
      notification_ids: z.array(UUIDSchema).optional(),
      delete_all: z.boolean().default(false).optional(),
    });

    let validatedBody: z.infer<typeof DeleteNotificationsSchema>;
    try {
      validatedBody = validateRequest(DeleteNotificationsSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "DELETE /api/teams/notifications - validation");
    }

    const { notification_ids, delete_all = false } = validatedBody;

    if (delete_all) {
      // Delete all notifications using Drizzle ORM
      await dbPg.delete(notificationsSchema).where(eq(notificationsSchema.userId, user.id));
    } else if (notification_ids && notification_ids.length > 0) {
      // Delete specific notifications using Drizzle ORM
      await dbPg
        .delete(notificationsSchema)
        .where(
          and(
            eq(notificationsSchema.userId, user.id),
            inArray(notificationsSchema.id, notification_ids)
          )
        );
    } else {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Either delete_all must be true or notification_ids must be provided",
            path: [],
          },
        ])
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "DELETE /api/teams/notifications");
  }
}
