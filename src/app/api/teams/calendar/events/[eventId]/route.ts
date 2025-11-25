import { dbPg } from "@/lib/db";
import { newTeamEvents, newTeamMemberships } from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  handleValidationError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Recurrence pattern type for calendar events
const RecurrencePatternSchema = z
  .object({
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().nullable().optional(),
    exceptions: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough(); // Allow additional fields for flexibility

// Helper function to check if user can modify an event
async function checkEventPermission(
  eventId: string,
  userId: string
): Promise<{ event: { createdBy: string; teamId: string | null } } | NextResponse> {
  const eventResult = await dbPg
    .select({
      createdBy: newTeamEvents.createdBy,
      teamId: newTeamEvents.teamId,
    })
    .from(newTeamEvents)
    .where(eq(newTeamEvents.id, eventId))
    .limit(1);

  if (eventResult.length === 0 || !eventResult[0]) {
    return handleNotFoundError("Event");
  }

  const event = eventResult[0];

  // Check if user is the creator or a captain of the team
  if (event.createdBy !== userId) {
    if (event.teamId) {
      const membershipResult = await dbPg
        .select({ role: newTeamMemberships.role })
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.teamId, event.teamId),
            eq(newTeamMemberships.status, "active")
          )
        )
        .limit(1);

      const memberRole = membershipResult[0]?.role;
      if (
        membershipResult.length === 0 ||
        !memberRole ||
        !["captain", "co_captain"].includes(memberRole)
      ) {
        return handleForbiddenError("Insufficient permissions");
      }
    } else {
      return handleForbiddenError("Insufficient permissions");
    }
  }

  return { event };
}

// Schema for calendar event updates
const CalendarEventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  start_time: z.string().datetime().nullable().optional(),
  end_time: z.string().datetime().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  event_type: z.enum(["practice", "tournament", "meeting", "deadline", "other"]).optional(),
  is_all_day: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: RecurrencePatternSchema.nullable().optional(),
});

// Helper function to build update data from validated body
function buildUpdateData(
  validatedBody: z.infer<typeof CalendarEventUpdateSchema>
): Partial<typeof newTeamEvents.$inferInsert> & { updatedAt?: Date } {
  const updateData: Partial<typeof newTeamEvents.$inferInsert> & { updatedAt?: Date } = {
    updatedAt: new Date(),
  };

  if (validatedBody.title !== undefined) {
    updateData.title = validatedBody.title;
  }
  if (validatedBody.description !== undefined) {
    updateData.description = validatedBody.description;
  }
  if (validatedBody.start_time !== undefined) {
    updateData.startTime = validatedBody.start_time
      ? new Date(validatedBody.start_time)
      : undefined;
  }
  if (validatedBody.end_time !== undefined) {
    updateData.endTime = validatedBody.end_time ? new Date(validatedBody.end_time) : undefined;
  }
  if (validatedBody.location !== undefined) {
    updateData.location = validatedBody.location;
  }
  if (validatedBody.event_type !== undefined) {
    updateData.eventType = validatedBody.event_type;
  }
  if (validatedBody.is_all_day !== undefined) {
    updateData.isAllDay = validatedBody.is_all_day;
  }
  if (validatedBody.is_recurring !== undefined) {
    updateData.isRecurring = validatedBody.is_recurring;
  }
  if (validatedBody.recurrence_pattern !== undefined) {
    updateData.recurrencePattern = validatedBody.recurrence_pattern;
  }

  return updateData;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

    const { eventId } = await params;

    // Validate UUID format
    try {
      UUIDSchema.parse(eventId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
    }

    // Check if user has permission to delete this event
    const permissionResult = await checkEventPermission(eventId, user.id);
    if (permissionResult instanceof NextResponse) {
      return permissionResult;
    }

    // Delete the event using Drizzle ORM
    await dbPg.delete(newTeamEvents).where(eq(newTeamEvents.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "DELETE /api/teams/calendar/events/[eventId]");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
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

    const { eventId } = await params;

    // Validate UUID format
    try {
      UUIDSchema.parse(eventId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
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
    let validatedBody: z.infer<typeof CalendarEventUpdateSchema>;
    try {
      validatedBody = validateRequest(CalendarEventUpdateSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "PUT /api/teams/calendar/events/[eventId] - validation");
    }

    // Check if user has permission to edit this event
    const permissionResult = await checkEventPermission(eventId, user.id);
    if (permissionResult instanceof NextResponse) {
      return permissionResult;
    }

    // Build update object
    const updateData = buildUpdateData(validatedBody);

    if (Object.keys(updateData).length === 1) {
      // Only updatedAt was set
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "No fields to update",
            path: [],
          },
        ])
      );
    }

    // Update the event using Drizzle ORM
    await dbPg.update(newTeamEvents).set(updateData).where(eq(newTeamEvents.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "PUT /api/teams/calendar/events/[eventId]");
  }
}
