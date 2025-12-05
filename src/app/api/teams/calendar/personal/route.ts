import { dbPg } from "@/lib/db";
import { newTeamEvents } from "@/lib/db/schema/teams";
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
} from "@/lib/utils/error-handler";
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
			eq(newTeamEvents.createdBy, user.id),
			isNull(newTeamEvents.teamId),
		];

		if (startDate) {
			whereConditions.push(sql`${newTeamEvents.startTime} >= ${startDate}`);
		}

		if (endDate) {
			whereConditions.push(sql`${newTeamEvents.startTime} <= ${endDate}`);
		}

		// Get personal events using Drizzle ORM
		const events = await dbPg
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
			})
			.from(newTeamEvents)
			.where(and(...whereConditions))
			.orderBy(asc(newTeamEvents.startTime));

		return NextResponse.json({
			success: true,
			events,
		});
	} catch (error) {
		return handleError(error, "GET /api/teams/calendar/personal");
	}
}
