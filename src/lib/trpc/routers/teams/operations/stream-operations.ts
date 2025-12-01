/**
 * Stream Operations Router
 *
 * tRPC endpoints for stream posts, timers, and tournaments.
 * These are designed to be batchable for lower edge requests.
 */

import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamActiveTimers,
  newTeamEvents,
  newTeamRecurringMeetings,
  newTeamStreamComments,
  newTeamStreamPosts,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { protectedProcedure, router } from "@/lib/trpc/server";
import logger from "@/lib/utils/logger";
import { checkTeamGroupAccessCockroach } from "@/lib/utils/team-auth";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { resolveTeamSlugToGroupId } from "../helpers";

// Shared helper to get group ID and validate access
async function validateTeamAccess(teamSlug: string, userId: string) {
  const groupId = await resolveTeamSlugToGroupId(teamSlug);
  const authResult = await checkTeamGroupAccessCockroach(userId, groupId);

  if (!authResult.isAuthorized) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized to access this team",
    });
  }

  return { groupId, authResult };
}

// Get team unit IDs for a group
async function getTeamUnitIds(groupId: string): Promise<string[]> {
  const teamUnits = await dbPg
    .select({ id: newTeamUnits.id })
    .from(newTeamUnits)
    .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamUnits.status, "active")));

  return teamUnits.map((u) => u.id);
}

export const streamOperationsRouter = router({
  // Get stream posts for a subteam
  getStream: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { groupId } = await validateTeamAccess(input.teamSlug, ctx.user.id);

        // Validate subteam belongs to group
        const [subteam] = await dbPg
          .select({ id: newTeamUnits.id })
          .from(newTeamUnits)
          .where(
            and(
              eq(newTeamUnits.id, input.subteamId),
              eq(newTeamUnits.groupId, groupId),
              eq(newTeamUnits.status, "active")
            )
          );

        if (!subteam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        // Get stream posts with author information and tournament details
        const streamResult = await dbPg
          .select({
            id: newTeamStreamPosts.id,
            content: newTeamStreamPosts.content,
            showTournamentTimer: newTeamStreamPosts.showTournamentTimer,
            tournamentId: newTeamStreamPosts.tournamentId,
            tournamentTitle: newTeamEvents.title,
            tournamentStartTime: newTeamEvents.startTime,
            authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
            authorEmail: users.email,
            createdAt: newTeamStreamPosts.createdAt,
            attachmentUrl: newTeamStreamPosts.attachmentUrl,
            attachmentTitle: newTeamStreamPosts.attachmentTitle,
          })
          .from(newTeamStreamPosts)
          .innerJoin(users, eq(newTeamStreamPosts.authorId, users.id))
          .leftJoin(newTeamEvents, eq(newTeamStreamPosts.tournamentId, newTeamEvents.id))
          .where(eq(newTeamStreamPosts.teamUnitId, input.subteamId))
          .orderBy(desc(newTeamStreamPosts.createdAt))
          .limit(50);

        // Get comments for each post
        const postsWithComments = await Promise.all(
          streamResult.map(async (post) => {
            const commentsResult = await dbPg
              .select({
                id: newTeamStreamComments.id,
                content: newTeamStreamComments.content,
                authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
                authorEmail: users.email,
                createdAt: newTeamStreamComments.createdAt,
              })
              .from(newTeamStreamComments)
              .innerJoin(users, eq(newTeamStreamComments.authorId, users.id))
              .where(eq(newTeamStreamComments.postId, post.id))
              .orderBy(asc(newTeamStreamComments.createdAt));

            return {
              ...post,
              comments: commentsResult,
            };
          })
        );

        return { posts: postsWithComments };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error("getStream: Failed to fetch stream", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch stream",
        });
      }
    }),

  // Get active timers for a subteam
  getTimers: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { groupId } = await validateTeamAccess(input.teamSlug, ctx.user.id);
        const teamUnitIds = await getTeamUnitIds(groupId);

        if (!teamUnitIds.includes(input.subteamId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        // Get active timers with event details (including recurring events)
        const timersResult = await dbPg
          .select({
            id: sql<string>`${newTeamActiveTimers.eventId}`,
            title: sql<string>`COALESCE(${newTeamEvents.title}, ${newTeamRecurringMeetings.title})`,
            startTime: sql<string>`COALESCE(
              ${newTeamEvents.startTime}::text,
              CASE 
                WHEN ${newTeamRecurringMeetings.startTime} IS NOT NULL THEN 
                  CONCAT(SUBSTRING(${newTeamActiveTimers.eventId}::text FROM 'recurring-[^-]+-(.+)'), 'T', ${newTeamRecurringMeetings.startTime})::timestamptz::text
                ELSE 
                  CONCAT(SUBSTRING(${newTeamActiveTimers.eventId}::text FROM 'recurring-[^-]+-(.+)'), 'T00:00:00')::timestamptz::text
              END
            )`,
            location: sql<
              string | null
            >`COALESCE(${newTeamEvents.location}, ${newTeamRecurringMeetings.location})`,
            eventType: sql<string>`COALESCE(${newTeamEvents.eventType}, 'meeting')`,
            addedAt: sql<string>`${newTeamActiveTimers.addedAt}::text`,
          })
          .from(newTeamActiveTimers)
          .leftJoin(
            newTeamEvents,
            sql`${newTeamActiveTimers.eventId}::text = ${newTeamEvents.id}::text`
          )
          .leftJoin(
            newTeamRecurringMeetings,
            sql`${newTeamActiveTimers.eventId}::text LIKE CONCAT('recurring-', ${newTeamRecurringMeetings.id}::text, '-%')`
          )
          .where(eq(newTeamActiveTimers.teamUnitId, input.subteamId))
          .orderBy(asc(newTeamActiveTimers.addedAt));

        return { timers: timersResult };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error("getTimers: Failed to fetch timers", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch timers",
        });
      }
    }),

  // Get upcoming tournaments/events for a subteam
  getTournaments: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().uuid(),
      })
    )
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex tournament retrieval with recurring events
    .query(async ({ ctx, input }) => {
      try {
        const { groupId } = await validateTeamAccess(input.teamSlug, ctx.user.id);
        const teamUnitIds = await getTeamUnitIds(groupId);

        if (!teamUnitIds.includes(input.subteamId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        if (teamUnitIds.length === 0) {
          return { events: [] };
        }

        // Get upcoming events for the team group with timer information
        const eventsResult = await dbPg
          .select({
            id: newTeamEvents.id,
            title: newTeamEvents.title,
            startTime: sql<string>`${newTeamEvents.startTime}::text`,
            location: newTeamEvents.location,
            eventType: newTeamEvents.eventType,
            hasTimer: sql<boolean>`CASE WHEN ${newTeamActiveTimers.id} IS NOT NULL THEN true ELSE false END`,
          })
          .from(newTeamEvents)
          .leftJoin(
            newTeamActiveTimers,
            and(
              eq(newTeamEvents.id, newTeamActiveTimers.eventId),
              eq(newTeamActiveTimers.teamUnitId, input.subteamId)
            )
          )
          .where(
            and(inArray(newTeamEvents.teamId, teamUnitIds), gt(newTeamEvents.startTime, sql`NOW()`))
          )
          .orderBy(asc(newTeamEvents.startTime))
          .limit(50);

        // Get recurring meetings for the team group
        const recurringMeetingsResult = await dbPg
          .select({
            id: newTeamRecurringMeetings.id,
            title: newTeamRecurringMeetings.title,
            description: newTeamRecurringMeetings.description,
            location: newTeamRecurringMeetings.location,
            daysOfWeek: newTeamRecurringMeetings.daysOfWeek,
            startTime: newTeamRecurringMeetings.startTime,
            endTime: newTeamRecurringMeetings.endTime,
            startDate: sql<string | null>`${newTeamRecurringMeetings.startDate}::text`,
            endDate: sql<string | null>`${newTeamRecurringMeetings.endDate}::text`,
            exceptions: newTeamRecurringMeetings.exceptions,
            teamId: newTeamRecurringMeetings.teamId,
          })
          .from(newTeamRecurringMeetings)
          .where(inArray(newTeamRecurringMeetings.teamId, teamUnitIds))
          .orderBy(sql`${newTeamRecurringMeetings.createdAt} DESC`);

        // Generate recurring events from recurring meetings
        const recurringEvents: Array<{
          id: string;
          title: string;
          startTime: string;
          location: string | null;
          eventType: string;
          hasTimer: boolean;
        }> = [];

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);

        for (const meeting of recurringMeetingsResult) {
          try {
            const daysOfWeek = Array.isArray(meeting.daysOfWeek)
              ? meeting.daysOfWeek
              : typeof meeting.daysOfWeek === "string"
                ? JSON.parse(meeting.daysOfWeek || "[]")
                : [];
            const exceptions = Array.isArray(meeting.exceptions)
              ? meeting.exceptions
              : typeof meeting.exceptions === "string"
                ? JSON.parse(meeting.exceptions || "[]")
                : [];
            const startDate = meeting.startDate ? new Date(meeting.startDate) : now;
            const endDate = meeting.endDate ? new Date(meeting.endDate) : futureDate;

            for (
              let date = new Date(Math.max(now.getTime(), startDate.getTime()));
              date <= futureDate && date <= endDate;
              date.setDate(date.getDate() + 1)
            ) {
              const dayOfWeek = date.getDay();
              const dateStr = date.toISOString().split("T")[0];

              if (daysOfWeek.includes(dayOfWeek) && !exceptions.includes(dateStr)) {
                const eventStartTime = meeting.startTime
                  ? `${dateStr}T${meeting.startTime}`
                  : `${dateStr}T00:00:00`;

                const eventId = `recurring-${meeting.id}-${dateStr}`;

                // Check if this recurring event has a timer
                const hasTimerResult = await dbPg
                  .select({ id: newTeamActiveTimers.id })
                  .from(newTeamActiveTimers)
                  .where(
                    and(
                      eq(newTeamActiveTimers.eventId, eventId),
                      eq(newTeamActiveTimers.teamUnitId, input.subteamId)
                    )
                  )
                  .limit(1);

                recurringEvents.push({
                  id: eventId,
                  title: meeting.title,
                  startTime: eventStartTime,
                  location: meeting.location,
                  eventType: "meeting",
                  hasTimer: hasTimerResult.length > 0,
                });
              }
            }
          } catch (error) {
            logger.error("Error processing recurring meeting", { error, meetingId: meeting.id });
          }
        }

        // Combine and sort events
        const allEvents = [
          ...eventsResult.map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime,
            location: e.location,
            eventType: e.eventType,
            hasTimer: e.hasTimer,
          })),
          ...recurringEvents,
        ];

        allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const limitedEvents = allEvents.slice(0, 50);

        return { events: limitedEvents };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error("getTournaments: Failed to fetch tournaments", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tournaments",
        });
      }
    }),

  // Batch load stream data (stream, timers, tournaments) in one request
  getStreamData: protectedProcedure
    .input(
      z.object({
        teamSlug: z.string(),
        subteamId: z.string().uuid(),
      })
    )
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex batch loading with recurring events
    .query(async ({ ctx, input }) => {
      try {
        // Validate access once
        const { groupId } = await validateTeamAccess(input.teamSlug, ctx.user.id);
        const teamUnitIds = await getTeamUnitIds(groupId);

        if (!teamUnitIds.includes(input.subteamId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subteam not found" });
        }

        // Run all queries in parallel for better performance
        const [streamResult, timersResult, eventsResult, recurringMeetingsResult] =
          await Promise.all([
            // Stream posts
            dbPg
              .select({
                id: newTeamStreamPosts.id,
                content: newTeamStreamPosts.content,
                showTournamentTimer: newTeamStreamPosts.showTournamentTimer,
                tournamentId: newTeamStreamPosts.tournamentId,
                tournamentTitle: newTeamEvents.title,
                tournamentStartTime: newTeamEvents.startTime,
                authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
                authorEmail: users.email,
                createdAt: newTeamStreamPosts.createdAt,
                attachmentUrl: newTeamStreamPosts.attachmentUrl,
                attachmentTitle: newTeamStreamPosts.attachmentTitle,
              })
              .from(newTeamStreamPosts)
              .innerJoin(users, eq(newTeamStreamPosts.authorId, users.id))
              .leftJoin(newTeamEvents, eq(newTeamStreamPosts.tournamentId, newTeamEvents.id))
              .where(eq(newTeamStreamPosts.teamUnitId, input.subteamId))
              .orderBy(desc(newTeamStreamPosts.createdAt))
              .limit(50),

            // Timers
            dbPg
              .select({
                id: sql<string>`${newTeamActiveTimers.eventId}`,
                title: sql<string>`COALESCE(${newTeamEvents.title}, ${newTeamRecurringMeetings.title})`,
                startTime: sql<string>`COALESCE(
                  ${newTeamEvents.startTime}::text,
                  CASE 
                    WHEN ${newTeamRecurringMeetings.startTime} IS NOT NULL THEN 
                      CONCAT(SUBSTRING(${newTeamActiveTimers.eventId}::text FROM 'recurring-[^-]+-(.+)'), 'T', ${newTeamRecurringMeetings.startTime})::timestamptz::text
                    ELSE 
                      CONCAT(SUBSTRING(${newTeamActiveTimers.eventId}::text FROM 'recurring-[^-]+-(.+)'), 'T00:00:00')::timestamptz::text
                  END
                )`,
                location: sql<
                  string | null
                >`COALESCE(${newTeamEvents.location}, ${newTeamRecurringMeetings.location})`,
                eventType: sql<string>`COALESCE(${newTeamEvents.eventType}, 'meeting')`,
                addedAt: sql<string>`${newTeamActiveTimers.addedAt}::text`,
              })
              .from(newTeamActiveTimers)
              .leftJoin(
                newTeamEvents,
                sql`${newTeamActiveTimers.eventId}::text = ${newTeamEvents.id}::text`
              )
              .leftJoin(
                newTeamRecurringMeetings,
                sql`${newTeamActiveTimers.eventId}::text LIKE CONCAT('recurring-', ${newTeamRecurringMeetings.id}::text, '-%')`
              )
              .where(eq(newTeamActiveTimers.teamUnitId, input.subteamId))
              .orderBy(asc(newTeamActiveTimers.addedAt)),

            // Events
            teamUnitIds.length > 0
              ? dbPg
                  .select({
                    id: newTeamEvents.id,
                    title: newTeamEvents.title,
                    startTime: sql<string>`${newTeamEvents.startTime}::text`,
                    location: newTeamEvents.location,
                    eventType: newTeamEvents.eventType,
                    hasTimer: sql<boolean>`CASE WHEN ${newTeamActiveTimers.id} IS NOT NULL THEN true ELSE false END`,
                  })
                  .from(newTeamEvents)
                  .leftJoin(
                    newTeamActiveTimers,
                    and(
                      eq(newTeamEvents.id, newTeamActiveTimers.eventId),
                      eq(newTeamActiveTimers.teamUnitId, input.subteamId)
                    )
                  )
                  .where(
                    and(
                      inArray(newTeamEvents.teamId, teamUnitIds),
                      gt(newTeamEvents.startTime, sql`NOW()`)
                    )
                  )
                  .orderBy(asc(newTeamEvents.startTime))
                  .limit(50)
              : Promise.resolve([]),

            // Recurring meetings
            teamUnitIds.length > 0
              ? dbPg
                  .select({
                    id: newTeamRecurringMeetings.id,
                    title: newTeamRecurringMeetings.title,
                    location: newTeamRecurringMeetings.location,
                    daysOfWeek: newTeamRecurringMeetings.daysOfWeek,
                    startTime: newTeamRecurringMeetings.startTime,
                    startDate: sql<string | null>`${newTeamRecurringMeetings.startDate}::text`,
                    endDate: sql<string | null>`${newTeamRecurringMeetings.endDate}::text`,
                    exceptions: newTeamRecurringMeetings.exceptions,
                  })
                  .from(newTeamRecurringMeetings)
                  .where(inArray(newTeamRecurringMeetings.teamId, teamUnitIds))
              : Promise.resolve([]),
          ]);

        // Get comments for stream posts
        const postsWithComments = await Promise.all(
          streamResult.map(async (post) => {
            const commentsResult = await dbPg
              .select({
                id: newTeamStreamComments.id,
                content: newTeamStreamComments.content,
                authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
                authorEmail: users.email,
                createdAt: newTeamStreamComments.createdAt,
              })
              .from(newTeamStreamComments)
              .innerJoin(users, eq(newTeamStreamComments.authorId, users.id))
              .where(eq(newTeamStreamComments.postId, post.id))
              .orderBy(asc(newTeamStreamComments.createdAt));

            return { ...post, comments: commentsResult };
          })
        );

        // Process recurring events (simplified - no individual timer checks for batch)
        const recurringEvents: Array<{
          id: string;
          title: string;
          startTime: string;
          location: string | null;
          eventType: string;
          hasTimer: boolean;
        }> = [];

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);

        const timerIds = new Set(timersResult.map((t) => t.id));

        for (const meeting of recurringMeetingsResult) {
          try {
            const daysOfWeek = Array.isArray(meeting.daysOfWeek)
              ? meeting.daysOfWeek
              : typeof meeting.daysOfWeek === "string"
                ? JSON.parse(meeting.daysOfWeek || "[]")
                : [];
            const exceptions = Array.isArray(meeting.exceptions)
              ? meeting.exceptions
              : typeof meeting.exceptions === "string"
                ? JSON.parse(meeting.exceptions || "[]")
                : [];
            const startDate = meeting.startDate ? new Date(meeting.startDate) : now;
            const endDate = meeting.endDate ? new Date(meeting.endDate) : futureDate;

            for (
              let date = new Date(Math.max(now.getTime(), startDate.getTime()));
              date <= futureDate && date <= endDate;
              date.setDate(date.getDate() + 1)
            ) {
              const dayOfWeek = date.getDay();
              const dateStr = date.toISOString().split("T")[0];

              if (daysOfWeek.includes(dayOfWeek) && !exceptions.includes(dateStr)) {
                const eventStartTime = meeting.startTime
                  ? `${dateStr}T${meeting.startTime}`
                  : `${dateStr}T00:00:00`;

                const eventId = `recurring-${meeting.id}-${dateStr}`;

                recurringEvents.push({
                  id: eventId,
                  title: meeting.title,
                  startTime: eventStartTime,
                  location: meeting.location,
                  eventType: "meeting",
                  hasTimer: timerIds.has(eventId),
                });
              }
            }
          } catch (_error) {
            logger.error("Error processing recurring meeting in batch", { meetingId: meeting.id });
          }
        }

        // Combine and sort events
        const allEvents = [
          ...eventsResult.map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime,
            location: e.location,
            eventType: e.eventType,
            hasTimer: e.hasTimer,
          })),
          ...recurringEvents,
        ];

        allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        return {
          posts: postsWithComments,
          timers: timersResult,
          events: allEvents.slice(0, 50),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error("getStreamData: Failed to fetch stream data", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch stream data",
        });
      }
    }),
});
