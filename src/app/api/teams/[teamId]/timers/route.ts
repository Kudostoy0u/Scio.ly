import { dbPg } from "@/lib/db";
import {
	newTeamActiveTimers,
	newTeamEvents,
	newTeamRecurringMeetings,
	newTeamUnits,
} from "@/lib/db/schema/teams";
import { UUIDSchema, validateRequest } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	getTeamAccessCockroach,
	hasLeadershipAccessCockroach,
} from "@/lib/utils/teams/access";
import {
	handleError,
	handleForbiddenError,
	handleNotFoundError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET /api/teams/[teamId]/timers - Get active timers for a team
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchTimers, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchTimers)
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
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
				]),
			);
		}

		// Validate UUID format using Zod
		try {
			UUIDSchema.parse(subteamId);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
		}

		// Resolve team slug to get team info
		const teamInfo = await resolveTeamSlugToUnits(teamId);
		if (!teamInfo) {
			return handleNotFoundError("Team");
		}

		// Validate that requested subteam belongs to this team group
		const subteamBelongsToGroup = teamInfo.teamUnitIds.includes(subteamId);
		if (!subteamBelongsToGroup) {
			return handleNotFoundError("Subteam");
		}

		// Check if user has access to this team group (membership OR roster entry)
		const access = await getTeamAccessCockroach(user.id, teamInfo.groupId);
		if (!access.hasAccess) {
			return handleForbiddenError("Not authorized to view this team");
		}

		// Get active timers with event details (including recurring events) using Drizzle ORM
		// Note: Complex COALESCE and string manipulation requires sql template for now
		const timersResult = await dbPg
			.select({
				id: sql<string>`${newTeamActiveTimers.eventId}`,
				title: sql<string>`COALESCE(${newTeamEvents.title}, ${newTeamRecurringMeetings.title})`,
				start_time: sql<string>`COALESCE(
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
				event_type: sql<string>`COALESCE(${newTeamEvents.eventType}, 'meeting')`,
				added_at: sql<string>`${newTeamActiveTimers.addedAt}::text`,
			})
			.from(newTeamActiveTimers)
			.leftJoin(
				newTeamEvents,
				sql`${newTeamActiveTimers.eventId}::text = ${newTeamEvents.id}::text`,
			)
			.leftJoin(
				newTeamRecurringMeetings,
				sql`${newTeamActiveTimers.eventId}::text LIKE CONCAT('recurring-', ${newTeamRecurringMeetings.id}::text, '-%')`,
			)
			.where(eq(newTeamActiveTimers.teamUnitId, subteamId))
			.orderBy(asc(newTeamActiveTimers.addedAt));

		return NextResponse.json({
			timers: timersResult,
		});
	} catch (error) {
		return handleError(error, "GET /api/teams/[teamId]/timers");
	}
}

// POST /api/teams/[teamId]/timers - Add a timer for an event
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (addTimer)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
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
				]),
			);
		}

		// Validate request body - Note: PostTimerRequestSchema expects subteamId, eventName, targetTime
		// But this endpoint uses subteamId and eventId, so we'll create a custom validation
		const TimerCreateSchema = z.object({
			subteamId: UUIDSchema,
			eventId: z.string().min(1, "Event ID is required"), // Can be UUID or recurring event ID
		});

		let validatedBody: z.infer<typeof TimerCreateSchema>;
		try {
			validatedBody = validateRequest(TimerCreateSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(error, "POST /api/teams/[teamId]/timers - validation");
		}

		const { subteamId, eventId } = validatedBody;

		// Resolve team slug to get team info
		const teamInfo = await resolveTeamSlugToUnits(teamId);
		if (!teamInfo) {
			return handleNotFoundError("Team");
		}

		// Validate subteam belongs to this team group
		const subteamBelongsToGroup = teamInfo.teamUnitIds.includes(subteamId);
		if (!subteamBelongsToGroup) {
			return handleNotFoundError("Subteam");
		}

		// Check if the user has leadership privileges in the team group
		const hasLeadership = await hasLeadershipAccessCockroach(
			user.id,
			teamInfo.groupId,
		);
		if (!hasLeadership) {
			return handleForbiddenError(
				"Only captains and co-captains can manage timers",
			);
		}

		// Get subteam's group ID for event verification
		const [subteam] = await dbPg
			.select({ groupId: newTeamUnits.groupId })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.id, subteamId))
			.limit(1);

		if (!subteam) {
			return handleNotFoundError("Subteam");
		}

		// Get all team unit IDs in this group
		const groupTeamUnits = await dbPg
			.select({ id: newTeamUnits.id })
			.from(newTeamUnits)
			.where(eq(newTeamUnits.groupId, subteam.groupId));

		const groupTeamUnitIds = groupTeamUnits.map((u) => u.id);

		// Verify the event belongs to the team (handle both regular and recurring events) using Drizzle ORM
		let eventExists = false;

		if (eventId.startsWith("recurring-")) {
			// For recurring events, extract the meeting ID and verify it belongs to the team
			const meetingId = eventId.split("-")[1];
			if (!meetingId) {
				return handleNotFoundError("Invalid recurring event ID format");
			}
			const recurringEventResult = await dbPg
				.select({ id: newTeamRecurringMeetings.id })
				.from(newTeamRecurringMeetings)
				.where(
					and(
						eq(newTeamRecurringMeetings.id, meetingId),
						inArray(newTeamRecurringMeetings.teamId, groupTeamUnitIds),
					),
				)
				.limit(1);
			eventExists = recurringEventResult.length > 0;
		} else {
			// For regular events
			const eventResult = await dbPg
				.select({ id: newTeamEvents.id })
				.from(newTeamEvents)
				.where(
					and(
						eq(newTeamEvents.id, eventId),
						inArray(newTeamEvents.teamId, groupTeamUnitIds),
					),
				)
				.limit(1);
			eventExists = eventResult.length > 0;
		}

		if (!eventExists) {
			return handleNotFoundError(
				"Event not found or not accessible to this team",
			);
		}

		// Check if timer already exists
		const existingTimer = await dbPg
			.select({ id: newTeamActiveTimers.id })
			.from(newTeamActiveTimers)
			.where(
				and(
					eq(newTeamActiveTimers.teamUnitId, subteamId),
					eq(newTeamActiveTimers.eventId, eventId),
				),
			)
			.limit(1);

		if (existingTimer.length > 0) {
			return NextResponse.json({
				message: "Timer already exists for this event",
				timerId: existingTimer[0]?.id || null,
			});
		}

		// Add the timer using Drizzle ORM
		const [timerResult] = await dbPg
			.insert(newTeamActiveTimers)
			.values({
				teamUnitId: subteamId,
				eventId: eventId,
				addedBy: user.id,
			})
			.returning({ id: newTeamActiveTimers.id });

		if (!timerResult) {
			return handleError(
				new Error("Failed to create timer"),
				"POST /api/teams/[teamId]/timers - insert",
			);
		}

		return NextResponse.json({
			message: "Timer added successfully",
			timerId: timerResult.id,
		});
	} catch (error) {
		return handleError(error, "POST /api/teams/[teamId]/timers");
	}
}

// DELETE /api/teams/[teamId]/timers - Remove a timer for an event
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (removeTimer)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ teamId: string }> },
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
				]),
			);
		}

		// Validate request body
		const TimerDeleteSchema = z.object({
			subteamId: UUIDSchema,
			eventId: z.string().min(1, "Event ID is required"),
		});

		let validatedBody: z.infer<typeof TimerDeleteSchema>;
		try {
			validatedBody = validateRequest(TimerDeleteSchema, body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"DELETE /api/teams/[teamId]/timers - validation",
			);
		}

		const { subteamId, eventId } = validatedBody;

		// Resolve team slug to get team info
		const teamInfo = await resolveTeamSlugToUnits(teamId);
		if (!teamInfo) {
			return handleNotFoundError("Team");
		}

		// Validate subteam belongs to this team group
		const subteamBelongsToGroup = teamInfo.teamUnitIds.includes(subteamId);
		if (!subteamBelongsToGroup) {
			return handleNotFoundError("Subteam");
		}

		// Check if the user has leadership privileges in the team group
		const hasLeadership = await hasLeadershipAccessCockroach(
			user.id,
			teamInfo.groupId,
		);
		if (!hasLeadership) {
			return handleForbiddenError(
				"Only captains and co-captains can manage timers",
			);
		}

		// Remove the timer using Drizzle ORM
		const deleteResult = await dbPg
			.delete(newTeamActiveTimers)
			.where(
				and(
					eq(newTeamActiveTimers.teamUnitId, subteamId),
					eq(newTeamActiveTimers.eventId, eventId),
				),
			)
			.returning({ id: newTeamActiveTimers.id });

		if (deleteResult.length === 0) {
			return handleNotFoundError("Timer");
		}

		return NextResponse.json({
			message: "Timer removed successfully",
		});
	} catch (error) {
		return handleError(error, "DELETE /api/teams/[teamId]/timers");
	}
}
