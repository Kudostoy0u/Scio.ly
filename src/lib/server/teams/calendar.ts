import { dbPg } from "@/lib/db";
import {
	calendarEventAttendees,
	calendarEvents,
	teamCacheManifests,
	teamSubteams,
	userCalendarManifests,
	users,
} from "@/lib/db/schema";
import logger from "@/lib/utils/logging/logger";
import {
	type SQL,
	and,
	asc,
	eq,
	gte,
	inArray,
	isNull,
	lte,
	or,
	sql,
} from "drizzle-orm";
import {
	ensureTeamCacheManifest,
	touchSubteamCacheManifest,
	touchTeamCacheManifest,
} from "./cache-manifest";
import { listTeamsForUser } from "./membership";
import { assertCaptainAccess, assertTeamAccess } from "./shared";

export type CalendarEventType =
	| "practice"
	| "tournament"
	| "meeting"
	| "deadline"
	| "other"
	| "personal";

export type CalendarEvent = {
	id: string;
	title: string;
	description: string | null;
	start_time: string;
	end_time: string | null;
	location: string | null;
	event_type: CalendarEventType;
	is_all_day: boolean;
	is_recurring: boolean;
	recurrence_pattern: Record<string, unknown> | null;
	created_by: string;
	owner_user_id: string | null;
	team_id?: string;
	subteam_id?: string;
	creator_email: string | null;
	creator_name: string | null;
	attendees?: Array<{
		user_id: string;
		status: "pending" | "attending" | "declined" | "tentative" | null;
		responded_at: string | null;
		notes: string | null;
		email: string | null;
		name: string | null;
	}>;
};

type RecurrencePattern = {
	days_of_week?: number[];
	start_date?: string | null;
	end_date?: string | null;
	exceptions?: string[];
	start_time?: string | null;
	end_time?: string | null;
};

function normalizePattern(value: unknown): RecurrencePattern {
	if (!value || typeof value !== "object") {
		return { exceptions: [] };
	}
	const pattern = value as RecurrencePattern;
	return {
		...pattern,
		exceptions: Array.isArray(pattern.exceptions) ? pattern.exceptions : [],
	};
}

async function touchTournamentCacheForTeam(
	teamId: string,
	subteamId?: string | null,
) {
	if (subteamId) {
		await touchSubteamCacheManifest(teamId, subteamId, { tournaments: true });
		return;
	}

	const subteamRows = await dbPg
		.select({ id: teamSubteams.id })
		.from(teamSubteams)
		.where(eq(teamSubteams.teamId, teamId));

	if (subteamRows.length === 0) {
		return;
	}

	await Promise.all(
		subteamRows.map((subteam) =>
			touchSubteamCacheManifest(teamId, subteam.id, { tournaments: true }),
		),
	);
}

async function ensureUserCalendarManifest(userId: string) {
	try {
		await dbPg
			.insert(userCalendarManifests)
			.values({ userId })
			.onConflictDoNothing();
	} catch (error) {
		logger.dev.error(
			"[Calendar] Failed to ensure user manifest",
			error instanceof Error ? error : new Error(String(error)),
			{ userId },
		);
		throw error;
	}
}

export async function touchUserCalendarManifest(
	userId: string,
	updates?: { personal?: boolean; teams?: boolean },
) {
	await ensureUserCalendarManifest(userId);
	const hasFlags = !!updates?.personal || !!updates?.teams;
	const shouldUpdatePersonal = updates?.personal ?? !hasFlags;
	const set: Partial<{
		personalUpdatedAt: SQL;
		teamsUpdatedAt: SQL;
		updatedAt: SQL;
	}> = {
		updatedAt: sql`now()`,
	};

	if (shouldUpdatePersonal) {
		set.personalUpdatedAt = sql`now()`;
	}
	if (updates?.teams) {
		set.teamsUpdatedAt = sql`now()`;
	}

	await dbPg
		.update(userCalendarManifests)
		.set(set)
		.where(eq(userCalendarManifests.userId, userId));
}

export async function getCalendarManifest(userId: string) {
	try {
		await ensureUserCalendarManifest(userId);
		const [personalManifest] = await dbPg
			.select({
				personalUpdatedAt: userCalendarManifests.personalUpdatedAt,
				teamsUpdatedAt: userCalendarManifests.teamsUpdatedAt,
			})
			.from(userCalendarManifests)
			.where(eq(userCalendarManifests.userId, userId))
			.limit(1);

		const teams = await listTeamsForUser(userId);
		const teamIds = teams.map((team) => team.id);

		if (teamIds.length > 0) {
			await Promise.all(
				teamIds.map((teamId) => ensureTeamCacheManifest(teamId)),
			);
		}

		const teamManifests = teamIds.length
			? await dbPg
					.select({
						teamId: teamCacheManifests.teamId,
						calendarUpdatedAt: teamCacheManifests.calendarUpdatedAt,
						subteamsUpdatedAt: teamCacheManifests.subteamsUpdatedAt,
					})
					.from(teamCacheManifests)
					.where(inArray(teamCacheManifests.teamId, teamIds))
			: [];

		const manifest = {
			personalUpdatedAt: String(
				personalManifest?.personalUpdatedAt ?? new Date().toISOString(),
			),
			teamsUpdatedAt: String(
				personalManifest?.teamsUpdatedAt ?? new Date().toISOString(),
			),
			teams: teamManifests.map((team) => ({
				teamId: team.teamId,
				calendarUpdatedAt: String(team.calendarUpdatedAt),
				subteamsUpdatedAt: String(team.subteamsUpdatedAt),
			})),
		};

		logger.dev.structured("info", "[Calendar] Manifest loaded", {
			userId,
			teamCount: manifest.teams.length,
		});

		return manifest;
	} catch (error) {
		logger.dev.error(
			"[Calendar] Failed to load manifest",
			error instanceof Error ? error : new Error(String(error)),
			{ userId },
		);
		throw error;
	}
}

function buildCalendarSelect() {
	return dbPg
		.select({
			id: calendarEvents.id,
			title: calendarEvents.title,
			description: calendarEvents.description,
			start_time: calendarEvents.startTime,
			end_time: calendarEvents.endTime,
			location: calendarEvents.location,
			event_type: calendarEvents.eventType,
			is_all_day: calendarEvents.allDay,
			is_recurring: calendarEvents.isRecurring,
			recurrence_pattern: calendarEvents.recurrencePattern,
			created_by: calendarEvents.createdBy,
			owner_user_id: calendarEvents.ownerUserId,
			team_id: calendarEvents.teamId,
			subteam_id: calendarEvents.subteamId,
			creator_email: users.email,
			creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
		})
		.from(calendarEvents)
		.leftJoin(users, eq(calendarEvents.createdBy, users.id));
}

export async function listPersonalCalendarEvents(input: {
	userId: string;
	startDate?: string;
	endDate?: string;
}): Promise<CalendarEvent[]> {
	const { userId, startDate, endDate } = input;
	const conditions = [
		eq(calendarEvents.ownerUserId, userId),
		isNull(calendarEvents.teamId),
	];

	if (startDate) {
		conditions.push(gte(calendarEvents.startTime, startDate));
	}
	if (endDate) {
		conditions.push(lte(calendarEvents.startTime, endDate));
	}

	logger.dev.structured("debug", "[Calendar] List personal events", {
		userId,
		startDate: startDate ?? null,
		endDate: endDate ?? null,
	});

	const results = await buildCalendarSelect()
		.where(and(...conditions))
		.orderBy(asc(calendarEvents.startTime));

	const mapped: CalendarEvent[] = results.map((event) => ({
		...event,
		event_type: (event.event_type ?? "personal") as CalendarEventType,
		is_all_day: event.is_all_day ?? false,
		is_recurring: event.is_recurring ?? false,
		team_id: event.team_id === null ? undefined : (event.team_id ?? undefined),
		subteam_id:
			event.subteam_id === null ? undefined : (event.subteam_id ?? undefined),
		recurrence_pattern:
			event.recurrence_pattern && typeof event.recurrence_pattern === "object"
				? (event.recurrence_pattern as Record<string, unknown>)
				: null,
	}));

	logger.dev.structured("debug", "[Calendar] Personal events loaded", {
		userId,
		count: mapped.length,
	});

	return mapped;
}

export async function listTeamCalendarEvents(input: {
	userId: string;
	teamIds: string[];
	startDate?: string;
	endDate?: string;
}): Promise<CalendarEvent[]> {
	const { userId, teamIds, startDate, endDate } = input;
	const memberships = await listTeamsForUser(userId);
	const allowedTeamIds = new Set(memberships.map((team) => team.id));
	const filteredTeamIds = teamIds.filter((teamId) =>
		allowedTeamIds.has(teamId),
	);

	if (filteredTeamIds.length === 0) {
		return [];
	}

	const conditions = [inArray(calendarEvents.teamId, filteredTeamIds)];
	if (startDate) {
		conditions.push(gte(calendarEvents.startTime, startDate));
	}
	if (endDate) {
		conditions.push(lte(calendarEvents.startTime, endDate));
	}

	logger.dev.structured("debug", "[Calendar] List team events", {
		userId,
		teamIds: filteredTeamIds,
		startDate: startDate ?? null,
		endDate: endDate ?? null,
	});

	const results = await buildCalendarSelect()
		.where(and(...conditions))
		.orderBy(asc(calendarEvents.startTime));

	const eventsWithAttendees = await Promise.all(
		results.map(async (event) => {
			if (!event.team_id) {
				return event;
			}
			const attendeesRaw = await dbPg
				.select({
					user_id: calendarEventAttendees.userId,
					status: calendarEventAttendees.status,
					responded_at: calendarEventAttendees.respondedAt,
					notes: calendarEventAttendees.notes,
					email: users.email,
					name: sql<
						string | null
					>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
				})
				.from(calendarEventAttendees)
				.leftJoin(users, eq(calendarEventAttendees.userId, users.id))
				.where(eq(calendarEventAttendees.eventId, event.id));

			const attendees = attendeesRaw.map((a) => ({
				...a,
				status: a.status as
					| "pending"
					| "attending"
					| "declined"
					| "tentative"
					| null,
			}));

			return {
				...event,
				attendees,
			};
		}),
	);

	const mapped: CalendarEvent[] = eventsWithAttendees.map((event) => {
		const baseEvent: CalendarEvent = {
			id: event.id,
			title: event.title,
			description: event.description,
			start_time: event.start_time,
			end_time: event.end_time,
			location: event.location,
			event_type: (event.event_type ?? "other") as CalendarEventType,
			is_all_day: event.is_all_day ?? false,
			is_recurring: event.is_recurring ?? false,
			recurrence_pattern:
				event.recurrence_pattern && typeof event.recurrence_pattern === "object"
					? (event.recurrence_pattern as Record<string, unknown>)
					: null,
			created_by: event.created_by,
			owner_user_id: event.owner_user_id,
			team_id:
				event.team_id === null ? undefined : (event.team_id ?? undefined),
			subteam_id:
				event.subteam_id === null ? undefined : (event.subteam_id ?? undefined),
			creator_email: event.creator_email,
			creator_name: event.creator_name,
		};
		if ("attendees" in event && event.attendees) {
			baseEvent.attendees = event.attendees;
		}
		return baseEvent;
	});

	logger.dev.structured("debug", "[Calendar] Team events loaded", {
		userId,
		count: mapped.length,
		teamIds: filteredTeamIds,
	});

	return mapped;
}

export async function createCalendarEvent(input: {
	userId: string;
	meetingType: "personal" | "team";
	teamId?: string | null;
	subteamId?: string | null;
	title: string;
	description?: string | null;
	startTime: string;
	endTime?: string | null;
	location?: string | null;
	eventType?: CalendarEventType | null;
	isAllDay?: boolean | null;
	isRecurring?: boolean | null;
	recurrencePattern?: Record<string, unknown> | null;
}): Promise<{ eventId: string }> {
	if (input.meetingType === "team") {
		if (!input.teamId) {
			throw new Error("Team ID is required for team events");
		}
		const { team } = await assertCaptainAccess(input.teamId, input.userId);
		if (input.subteamId) {
			const [subteam] = await dbPg
				.select({ id: teamSubteams.id })
				.from(teamSubteams)
				.where(
					and(
						eq(teamSubteams.id, input.subteamId),
						eq(teamSubteams.teamId, team.id),
					),
				)
				.limit(1);
			if (!subteam) {
				throw new Error("Subteam not found for this team");
			}
		}
	}

	const isPersonal = input.meetingType === "personal";
	const eventType = isPersonal ? "personal" : (input.eventType ?? "other");

	const [result] = await dbPg
		.insert(calendarEvents)
		.values({
			ownerUserId: isPersonal ? input.userId : null,
			teamId: isPersonal ? null : (input.teamId ?? null),
			subteamId: isPersonal ? null : (input.subteamId ?? null),
			title: input.title,
			description: input.description ?? null,
			startTime: input.startTime,
			endTime: input.endTime ?? null,
			location: input.location ?? null,
			eventType,
			allDay: input.isAllDay ?? false,
			isRecurring: input.isRecurring ?? false,
			recurrencePattern: input.recurrencePattern ?? null,
			createdBy: input.userId,
		})
		.returning({ id: calendarEvents.id });

	if (!result?.id) {
		throw new Error("Failed to create calendar event");
	}

	if (isPersonal) {
		await touchUserCalendarManifest(input.userId);
	} else if (input.teamId) {
		await touchTeamCacheManifest(input.teamId, { calendar: true });
		await touchTournamentCacheForTeam(input.teamId, input.subteamId ?? null);
	}

	logger.dev.structured("info", "[Calendar] Event created", {
		eventId: result.id,
		userId: input.userId,
		meetingType: input.meetingType,
		teamId: input.teamId ?? null,
		subteamId: input.subteamId ?? null,
		isRecurring: input.isRecurring ?? false,
	});

	return { eventId: result.id };
}

export async function deleteCalendarEvent(input: {
	userId: string;
	eventId: string;
}): Promise<{ success: true }> {
	logger.dev.structured("info", "[Calendar] Delete event request", {
		userId: input.userId,
		eventId: input.eventId,
	});
	const [event] = await dbPg
		.select({
			id: calendarEvents.id,
			teamId: calendarEvents.teamId,
			subteamId: calendarEvents.subteamId,
			ownerUserId: calendarEvents.ownerUserId,
			createdBy: calendarEvents.createdBy,
		})
		.from(calendarEvents)
		.where(eq(calendarEvents.id, input.eventId))
		.limit(1);

	if (!event) {
		throw new Error("Event not found");
	}

	if (event.teamId) {
		const { membership } = await assertTeamAccess(event.teamId, input.userId);
		const isCaptain =
			membership.role === "captain" || membership.role === "admin";
		if (!(event.createdBy === input.userId || isCaptain)) {
			throw new Error("You do not have permission to delete this event");
		}
	} else if (event.ownerUserId !== input.userId) {
		throw new Error("You do not have permission to delete this event");
	}

	await dbPg.delete(calendarEvents).where(eq(calendarEvents.id, input.eventId));

	if (event.teamId) {
		await touchTeamCacheManifest(event.teamId, { calendar: true });
		await touchTournamentCacheForTeam(event.teamId, event.subteamId ?? null);
	} else {
		await touchUserCalendarManifest(input.userId);
	}

	logger.dev.structured("info", "[Calendar] Event deleted", {
		userId: input.userId,
		eventId: input.eventId,
		teamId: event.teamId ?? null,
	});

	return { success: true };
}

export async function updateCalendarEvent(input: {
	userId: string;
	eventId: string;
	title?: string;
	description?: string | null;
	startTime?: string;
	endTime?: string | null;
	location?: string | null;
	eventType?: CalendarEventType | null;
	isAllDay?: boolean | null;
	isRecurring?: boolean | null;
	recurrencePattern?: Record<string, unknown> | null;
}): Promise<{ success: true }> {
	const [event] = await dbPg
		.select({
			id: calendarEvents.id,
			teamId: calendarEvents.teamId,
			subteamId: calendarEvents.subteamId,
			ownerUserId: calendarEvents.ownerUserId,
			createdBy: calendarEvents.createdBy,
		})
		.from(calendarEvents)
		.where(eq(calendarEvents.id, input.eventId))
		.limit(1);

	if (!event) {
		throw new Error("Event not found");
	}

	// Check permissions
	if (event.teamId) {
		const { membership } = await assertTeamAccess(event.teamId, input.userId);
		const isCaptain =
			membership.role === "captain" || membership.role === "admin";
		if (!(event.createdBy === input.userId || isCaptain)) {
			throw new Error("You do not have permission to edit this event");
		}
	} else if (event.ownerUserId !== input.userId) {
		throw new Error("You do not have permission to edit this event");
	}

	// Build update object
	const updateData: {
		title?: string;
		description?: string | null;
		startTime?: string;
		endTime?: string | null;
		location?: string | null;
		eventType?: CalendarEventType | null;
		allDay?: boolean;
		isRecurring?: boolean;
		recurrencePattern?: Record<string, unknown> | null;
		updatedAt?: ReturnType<typeof sql>;
	} = {
		updatedAt: sql`now()`,
	};

	if (input.title !== undefined) {
		updateData.title = input.title;
	}
	if (input.description !== undefined) {
		updateData.description = input.description;
	}
	if (input.startTime !== undefined) {
		updateData.startTime = input.startTime;
	}
	if (input.endTime !== undefined) {
		updateData.endTime = input.endTime;
	}
	if (input.location !== undefined) {
		updateData.location = input.location;
	}
	if (input.eventType !== undefined) {
		updateData.eventType = input.eventType;
	}
	if (input.isAllDay !== undefined && input.isAllDay !== null) {
		updateData.allDay = input.isAllDay;
	}
	if (input.isRecurring !== undefined && input.isRecurring !== null) {
		updateData.isRecurring = input.isRecurring;
	}
	if (input.recurrencePattern !== undefined) {
		updateData.recurrencePattern = input.recurrencePattern;
	}

	await dbPg
		.update(calendarEvents)
		.set(updateData)
		.where(eq(calendarEvents.id, input.eventId));

	if (event.teamId) {
		await touchTeamCacheManifest(event.teamId, { calendar: true });
		await touchTournamentCacheForTeam(event.teamId, event.subteamId ?? null);
	} else {
		await touchUserCalendarManifest(input.userId);
	}

	logger.dev.structured("info", "[Calendar] Updated event", {
		userId: input.userId,
		eventId: input.eventId,
		teamId: event.teamId ?? null,
	});

	return { success: true };
}

export async function skipCalendarOccurrence(input: {
	userId: string;
	eventId: string;
	occurrenceDate: string;
}): Promise<{ success: true }> {
	logger.dev.structured("info", "[Calendar] Skip occurrence request", {
		userId: input.userId,
		eventId: input.eventId,
		occurrenceDate: input.occurrenceDate,
	});
	const [event] = await dbPg
		.select({
			id: calendarEvents.id,
			teamId: calendarEvents.teamId,
			subteamId: calendarEvents.subteamId,
			ownerUserId: calendarEvents.ownerUserId,
			createdBy: calendarEvents.createdBy,
			isRecurring: calendarEvents.isRecurring,
			recurrencePattern: calendarEvents.recurrencePattern,
		})
		.from(calendarEvents)
		.where(eq(calendarEvents.id, input.eventId))
		.limit(1);

	if (!event) {
		throw new Error("Event not found");
	}

	if (!event.isRecurring) {
		throw new Error("Event is not recurring");
	}

	if (event.teamId) {
		const { membership } = await assertTeamAccess(event.teamId, input.userId);
		const isCaptain =
			membership.role === "captain" || membership.role === "admin";
		if (!(event.createdBy === input.userId || isCaptain)) {
			throw new Error("You do not have permission to edit this event");
		}
	} else if (event.ownerUserId !== input.userId) {
		throw new Error("You do not have permission to edit this event");
	}

	const pattern = normalizePattern(event.recurrencePattern);
	const exceptions = new Set(pattern.exceptions ?? []);
	exceptions.add(input.occurrenceDate);

	const nextPattern: RecurrencePattern = {
		...pattern,
		exceptions: Array.from(exceptions),
	};

	await dbPg
		.update(calendarEvents)
		.set({
			recurrencePattern: nextPattern,
			updatedAt: sql`now()`,
		})
		.where(eq(calendarEvents.id, input.eventId));

	if (event.teamId) {
		await touchTeamCacheManifest(event.teamId, { calendar: true });
		await touchTournamentCacheForTeam(event.teamId, event.subteamId ?? null);
	} else {
		await touchUserCalendarManifest(input.userId);
	}

	logger.dev.structured("info", "[Calendar] Occurrence skipped", {
		userId: input.userId,
		eventId: input.eventId,
		occurrenceDate: input.occurrenceDate,
		teamId: event.teamId ?? null,
	});

	return { success: true };
}

export async function getTeamEventsForTimers(input: {
	teamSlug: string;
	subteamId: string;
	userId: string;
}) {
	const { team } = await assertTeamAccess(input.teamSlug, input.userId);

	const now = new Date();
	// Subtract 1 minute to ensure events that are just a minute in the future are included
	// This accounts for any timezone or precision differences
	const nowMinusOneMinute = new Date(now.getTime() - 60 * 1000);
	const futureDate = new Date();
	futureDate.setDate(now.getDate() + 30);

	const upcomingEvents = await dbPg
		.select({
			id: calendarEvents.id,
			title: calendarEvents.title,
			start_time: calendarEvents.startTime,
			end_time: calendarEvents.endTime,
			location: calendarEvents.location,
			event_type: calendarEvents.eventType,
			subteam_id: calendarEvents.subteamId,
			is_recurring: calendarEvents.isRecurring,
			recurrence_pattern: calendarEvents.recurrencePattern,
		})
		.from(calendarEvents)
		.where(
			and(
				eq(calendarEvents.teamId, team.id),
				or(
					isNull(calendarEvents.subteamId),
					eq(calendarEvents.subteamId, input.subteamId),
				),
				or(
					gte(calendarEvents.startTime, nowMinusOneMinute.toISOString()),
					eq(calendarEvents.isRecurring, true),
				),
			),
		)
		.orderBy(asc(calendarEvents.startTime));

	const toDateString = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const toTimeString = (value?: string | null) => {
		if (!value) {
			return null;
		}
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			return null;
		}
		const hours = String(parsed.getHours()).padStart(2, "0");
		const minutes = String(parsed.getMinutes()).padStart(2, "0");
		const seconds = String(parsed.getSeconds()).padStart(2, "0");
		return `${hours}:${minutes}:${seconds}`;
	};

	const events: Array<{
		id: string;
		title: string;
		start_time: string;
		location: string | null;
		event_type: CalendarEventType;
	}> = [];

	for (const event of upcomingEvents) {
		if (!event.is_recurring) {
			events.push({
				id: event.id,
				title: event.title,
				start_time: event.start_time,
				location: event.location,
				event_type: (event.event_type ?? "other") as CalendarEventType,
			});
			continue;
		}

		const pattern = normalizePattern(event.recurrence_pattern);
		const daysOfWeek = Array.isArray(pattern.days_of_week)
			? pattern.days_of_week
			: [];
		if (daysOfWeek.length === 0) {
			continue;
		}

		const fallbackStartDate = event.start_time
			? toDateString(new Date(event.start_time))
			: toDateString(now);
		const fallbackStartTime =
			pattern.start_time ?? toTimeString(event.start_time) ?? "00:00:00";

		const startDate = pattern.start_date
			? new Date(pattern.start_date)
			: new Date(fallbackStartDate);
		const endDate = pattern.end_date
			? new Date(pattern.end_date)
			: new Date(futureDate);

		for (
			let date = new Date(Math.max(now.getTime(), startDate.getTime()));
			date <= futureDate && date <= endDate;
			date.setDate(date.getDate() + 1)
		) {
			const dateStr = toDateString(date);
			if (!daysOfWeek.includes(date.getDay())) {
				continue;
			}
			if (pattern.exceptions?.includes(dateStr)) {
				continue;
			}

			events.push({
				id: `recurring-${event.id}-${dateStr}`,
				title: event.title,
				start_time: `${dateStr}T${fallbackStartTime}`,
				location: event.location,
				event_type: (event.event_type ?? "meeting") as CalendarEventType,
			});
		}
	}

	events.sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	return events.slice(0, 50);
}
