import { dbPg } from "@/lib/db";
import {
  newTeamActiveTimers,
  newTeamEvents,
  newTeamGroups,
  newTeamRecurringMeetings,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema } from "@/lib/schemas/teams-validation";
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
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/tournaments - Get upcoming tournaments for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchTournaments, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchTournaments)
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex tournament retrieval with filtering and date logic
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
    const subteamId = searchParams.get("subteamId");

    if (!subteamId) {
      return handleValidationError(
        new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Subteam ID is required",
            path: ["subteamId"],
          },
        ])
      );
    }

    // Validate UUID format
    try {
      UUIDSchema.parse(subteamId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleValidationError(error);
      }
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

    // Check if user has access to this team group (membership OR roster entry)
    const authResult = await checkTeamGroupAccessCockroach(user.id, groupId);
    if (!authResult.isAuthorized) {
      return handleForbiddenError("Not authorized to access this team");
    }

    // Get team unit IDs for this group using Drizzle ORM
    const teamUnits = await dbPg
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    const teamUnitIds = teamUnits.map((u) => u.id);

    if (teamUnitIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Get upcoming events for the team group with timer information using Drizzle ORM
    const eventsResult = await dbPg
      .select({
        id: newTeamEvents.id,
        title: newTeamEvents.title,
        start_time: sql<string>`${newTeamEvents.startTime}::text`,
        location: newTeamEvents.location,
        event_type: newTeamEvents.eventType,
        has_timer: sql<boolean>`CASE WHEN ${newTeamActiveTimers.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(newTeamEvents)
      .leftJoin(
        newTeamActiveTimers,
        and(
          eq(newTeamEvents.id, newTeamActiveTimers.eventId),
          eq(newTeamActiveTimers.teamUnitId, subteamId)
        )
      )
      .where(
        and(inArray(newTeamEvents.teamId, teamUnitIds), gt(newTeamEvents.startTime, sql`NOW()`))
      )
      .orderBy(asc(newTeamEvents.startTime))
      .limit(50);

    // Get recurring meetings for the team group using Drizzle ORM
    const recurringMeetingsResult = await dbPg
      .select({
        id: newTeamRecurringMeetings.id,
        title: newTeamRecurringMeetings.title,
        description: newTeamRecurringMeetings.description,
        location: newTeamRecurringMeetings.location,
        days_of_week: newTeamRecurringMeetings.daysOfWeek,
        start_time: newTeamRecurringMeetings.startTime,
        end_time: newTeamRecurringMeetings.endTime,
        start_date: sql<string | null>`${newTeamRecurringMeetings.startDate}::text`,
        end_date: sql<string | null>`${newTeamRecurringMeetings.endDate}::text`,
        exceptions: newTeamRecurringMeetings.exceptions,
        team_id: newTeamRecurringMeetings.teamId,
      })
      .from(newTeamRecurringMeetings)
      .where(inArray(newTeamRecurringMeetings.teamId, teamUnitIds))
      .orderBy(sql`${newTeamRecurringMeetings.createdAt} DESC`);

    // Generate recurring events from recurring meetings
    const recurringEvents: Array<{
      id: string;
      title: string;
      start_time: string;
      location: string | null;
      event_type: string;
      has_timer: boolean;
    }> = [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30); // Look ahead 30 days

    for (const meeting of recurringMeetingsResult) {
      try {
        // Parse JSON fields - they should already be parsed by Drizzle, but handle both cases
        const daysOfWeek = Array.isArray(meeting.days_of_week)
          ? meeting.days_of_week
          : typeof meeting.days_of_week === "string"
            ? JSON.parse(meeting.days_of_week || "[]")
            : [];
        const exceptions = Array.isArray(meeting.exceptions)
          ? meeting.exceptions
          : typeof meeting.exceptions === "string"
            ? JSON.parse(meeting.exceptions || "[]")
            : [];
        const startDate = meeting.start_date ? new Date(meeting.start_date) : now;
        const endDate = meeting.end_date ? new Date(meeting.end_date) : futureDate;

        // Generate events for the next 30 days
        for (
          let date = new Date(Math.max(now.getTime(), startDate.getTime()));
          date <= futureDate && date <= endDate;
          date.setDate(date.getDate() + 1)
        ) {
          const dayOfWeek = date.getDay();
          const dateStr = date.toISOString().split("T")[0];

          // Check if this day matches the recurring pattern
          if (daysOfWeek.includes(dayOfWeek) && !exceptions.includes(dateStr)) {
            const startTime = meeting.start_time
              ? `${dateStr}T${meeting.start_time}`
              : `${dateStr}T00:00:00`;

            const eventId = `recurring-${meeting.id}-${dateStr}`;

            // Check if this recurring event already has a timer using Drizzle ORM
            const hasTimerResult = await dbPg
              .select({ id: newTeamActiveTimers.id })
              .from(newTeamActiveTimers)
              .where(
                and(
                  eq(newTeamActiveTimers.eventId, eventId),
                  eq(newTeamActiveTimers.teamUnitId, subteamId)
                )
              )
              .limit(1);

            recurringEvents.push({
              id: eventId,
              title: meeting.title,
              start_time: startTime,
              location: meeting.location,
              event_type: "meeting",
              has_timer: hasTimerResult.length > 0,
            });
          }
        }
      } catch (error) {
        // Log error but continue with other meetings
        logger.error("Error processing recurring meeting", { error, meetingId: meeting.id });
      }
    }

    // Combine regular events and recurring events
    const allEvents = [...eventsResult, ...recurringEvents];

    // Sort by start time and limit to 50 total events
    allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const limitedEvents = allEvents.slice(0, 50);

    return NextResponse.json({
      events: limitedEvents,
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/tournaments");
  }
}
