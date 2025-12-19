import { dbPg } from "@/lib/db";
import { teamEvents } from "@/lib/db/schema";
import {
	GetCalendarEventsQuerySchema,
	validateRequest,
} from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
	handleError,
	handleForbiddenError,
	handleUnauthorizedError,
	handleValidationError,
	validateEnvironment,
} from "@/lib/utils/teams/errors";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
		const userId = searchParams.get("userId");
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		// Validate query parameters
		try {
			validateRequest(GetCalendarEventsQuerySchema, {
				userId: userId || undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
			});
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleValidationError(error);
			}
			return handleError(
				error,
				"GET /api/teams/calendar/personal - validation",
			);
		}

		// Only allow users to access their own personal events
		if (userId && userId !== user.id) {
			return handleForbiddenError("Unauthorized");
		}

		// Build where conditions using Drizzle ORM
		const whereConditions = [
			eq(teamEvents.createdBy, user.id),
			isNull(teamEvents.teamId),
		];

		if (startDate) {
			whereConditions.push(sql`${teamEvents.startTime} >= ${startDate}`);
		}

		if (endDate) {
			whereConditions.push(sql`${teamEvents.startTime} <= ${endDate}`);
		}

		// Get personal events using Drizzle ORM
		const events = await dbPg
			.select({
				id: teamEvents.id,
				title: teamEvents.title,
				description: teamEvents.description,
				start_time: teamEvents.startTime,
				end_time: teamEvents.endTime,
				location: teamEvents.location,
				event_type: teamEvents.eventType,
				is_all_day: teamEvents.allDay,
				is_recurring: teamEvents.isRecurring,
				recurrence_pattern: teamEvents.recurrencePattern,
				created_by: teamEvents.createdBy,
				team_id: teamEvents.teamId,
			})
			.from(teamEvents)
			.where(and(...whereConditions))
			.orderBy(asc(teamEvents.startTime));

		return NextResponse.json({
			success: true,
			events,
		});
	} catch (error) {
		return handleError(error, "GET /api/teams/calendar/personal");
	}
}
