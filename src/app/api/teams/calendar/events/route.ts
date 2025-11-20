import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamEventAttendees,
  newTeamEvents,
  newTeamMemberships,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import {
  PostCalendarEventRequestSchema,
  PutCalendarEventRequestSchema,
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
import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// POST /api/teams/calendar/events - Create team event
// Frontend Usage:
// - src/app/teams/components/TeamCalendar.tsx (createEvent)
export async function POST(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

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

    // Validate request body - Note: PostCalendarEventRequestSchema expects different field names
    // Map from API format to schema format
    const CalendarEventCreateSchema = z.object({
      title: z.string().min(1, "Title is required").max(200),
      description: z.string().max(5000).nullable().optional(),
      start_time: z.string().datetime(),
      end_time: z.string().datetime().nullable().optional(),
      location: z.string().max(200).nullable().optional(),
      event_type: z.enum(["practice", "tournament", "meeting", "deadline", "other"]).default("practice").optional(),
      is_all_day: z.boolean().default(false).optional(),
      is_recurring: z.boolean().default(false).optional(),
      recurrence_pattern: z.record(z.string(), z.any()).nullable().optional(),
      team_id: z.string().nullable().optional(),
      created_by: UUIDSchema.optional(),
    });

    let validatedBody: z.infer<typeof CalendarEventCreateSchema>;
    try {
      validatedBody = validateRequest(CalendarEventCreateSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
      return handleError(error, "POST /api/teams/calendar/events - validation");
    }

    const {
      title,
      description,
      start_time,
      end_time,
      location,
      event_type = "practice",
      is_all_day = false,
      is_recurring = false,
      recurrence_pattern,
      team_id,
      created_by,
    } = validatedBody;

    // Resolve team_id if it's a slug
    let resolvedTeamId: string | null = null;

    // Handle personal events (team_id is "personal" or null)
    if (!team_id || team_id === "personal") {
      resolvedTeamId = null;
    } else {
      // Check if it's a UUID
      try {
        UUIDSchema.parse(team_id);
        resolvedTeamId = team_id;
      } catch {
        // It's a slug, resolve it
        try {
          const teamInfo = await resolveTeamSlugToUnits(team_id);
          if (teamInfo.teamUnitIds.length > 0) {
            resolvedTeamId = teamInfo.teamUnitIds[0] ?? null;
          } else {
            return handleNotFoundError("No team units found");
          }
        } catch {
          return handleNotFoundError("Team");
        }
      }
    }

    // Validate start_time is required
    if (!start_time) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "start_time is required",
            path: ["start_time"],
          },
        ])
      );
    }

    // Insert the event using Drizzle ORM
    const [result] = await dbPg
      .insert(newTeamEvents)
      .values({
        teamId: resolvedTeamId,
        createdBy: created_by || user.id,
        title,
        description: description || null,
        eventType: event_type,
        startTime: new Date(start_time),
        endTime: end_time ? new Date(end_time) : null,
        location: location || null,
        isAllDay: is_all_day,
        isRecurring: is_recurring,
        recurrencePattern: recurrence_pattern || null,
      })
      .returning({ id: newTeamEvents.id });

    if (!result) {
      return handleError(new Error("Failed to create event"), "POST /api/teams/calendar/events - insert");
    }

    return NextResponse.json({
      success: true,
      eventId: result.id,
    });
  } catch (error) {
    return handleError(error, "POST /api/teams/calendar/events");
  }
}

export async function GET(request: NextRequest) {
  try {
    const envError = validateEnvironment();
    if (envError) return envError;

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where conditions
    const whereConditions: ReturnType<typeof and>[] = [];

    if (teamId) {
      // Resolve team slug to team unit IDs
      try {
        const teamInfo = await resolveTeamSlugToUnits(teamId);
        if (teamInfo.teamUnitIds.length > 0) {
          whereConditions.push(inArray(newTeamEvents.teamId, teamInfo.teamUnitIds));
        } else {
          // No team units found, return empty result
          return NextResponse.json({
            success: true,
            events: [],
          });
        }
      } catch {
        return handleNotFoundError("Team");
      }
    }

    if (userId) {
      try {
        UUIDSchema.parse(userId);
        whereConditions.push(eq(newTeamEvents.createdBy, userId));
      } catch {
        return handleValidationError(
          new z.ZodError([
            {
              code: z.ZodIssueCode.custom,
              message: "Invalid user ID format",
              path: ["userId"],
            },
          ])
        );
      }
    }

    if (startDate) {
      whereConditions.push(gte(newTeamEvents.startTime, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(newTeamEvents.startTime, new Date(endDate)));
    }

    // Get events with creator information using Drizzle ORM
    const eventsResult = await dbPg
      .select({
        id: newTeamEvents.id,
        title: newTeamEvents.title,
        description: newTeamEvents.description,
        start_time: newTeamEvents.startTime,
        end_time: newTeamEvents.endTime,
        location: newTeamEvents.location,
        event_type: newTeamEvents.eventType,
        is_all_day: newTeamEvents.isAllDay,
        is_recurring: newTeamEvents.isRecurring,
        recurrence_pattern: newTeamEvents.recurrencePattern,
        created_by: newTeamEvents.createdBy,
        team_id: newTeamEvents.teamId,
        creator_email: users.email,
        creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
      })
      .from(newTeamEvents)
      .leftJoin(users, eq(newTeamEvents.createdBy, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(newTeamEvents.startTime));

    // Get attendees for each event using Drizzle ORM
    const eventsWithAttendees = await Promise.all(
      eventsResult.map(async (event) => {
        const attendeesResult = await dbPg
          .select({
            user_id: newTeamEventAttendees.userId,
            status: newTeamEventAttendees.status,
            responded_at: newTeamEventAttendees.respondedAt,
            notes: newTeamEventAttendees.notes,
            email: users.email,
            name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
          })
          .from(newTeamEventAttendees)
          .leftJoin(users, eq(newTeamEventAttendees.userId, users.id))
          .where(eq(newTeamEventAttendees.eventId, event.id));

        return {
          ...event,
          attendees: attendeesResult,
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: eventsWithAttendees,
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/calendar/events");
  }
}
