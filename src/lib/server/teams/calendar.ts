import { dbPg } from "@/lib/db";
import {
	teamEventAttendees,
	teamEvents,
	teamRecurringMeetings,
	users,
} from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { assertTeamAccess } from "./shared";
import { listTeamsForUser } from "./membership";

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
	team_id: string | null;
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

export type RecurringMeeting = {
	id: string;
	team_id: string;
	created_by: string;
	title: string;
	description: string | null;
	location: string | null;
	days_of_week: number[];
	start_time: string | null;
	end_time: string | null;
	start_date: string | null;
	end_date: string | null;
	exceptions: string[];
	meeting_type: "personal" | "team";
	creator_email: string | null;
	creator_name: string | null;
	created_at: string | null;
};

function safeJsonParse<T = unknown>(value: unknown, fallback: T): T {
	if (value === null || value === undefined) {
		return fallback;
	}
	if (Array.isArray(value) || typeof value === "object") {
		return value as T;
	}
	if (value === "[]") {
		return fallback;
	}
	try {
		return JSON.parse(String(value)) as T;
	} catch {
		return fallback;
	}
}

export async function listCalendarEvents(input: {
	userId: string;
	teamIds?: string[];
	includePersonal?: boolean;
	startDate?: string;
	endDate?: string;
}): Promise<CalendarEvent[]> {
	const { userId, teamIds, includePersonal, startDate, endDate } = input;
	const memberships = await listTeamsForUser(userId);
	const allowedTeamIds = new Set(memberships.map((team) => team.id));
	const filteredTeamIds = (teamIds ?? memberships.map((team) => team.id)).filter(
		(teamId) => allowedTeamIds.has(teamId),
	);

	const teamConditions: ReturnType<typeof and>[] = [];
	if (filteredTeamIds.length > 0) {
		teamConditions.push(inArray(teamEvents.teamId, filteredTeamIds));
	}
	if (startDate) {
		teamConditions.push(gte(teamEvents.startTime, startDate));
	}
	if (endDate) {
		teamConditions.push(lte(teamEvents.startTime, endDate));
	}

	const personalConditions: ReturnType<typeof and>[] = [
		eq(teamEvents.createdBy, userId),
		isNull(teamEvents.teamId),
	];
	if (startDate) {
		personalConditions.push(gte(teamEvents.startTime, startDate));
	}
	if (endDate) {
		personalConditions.push(lte(teamEvents.startTime, endDate));
	}

	const baseQuery = dbPg
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
			creator_email: users.email,
			creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
		})
		.from(teamEvents)
		.leftJoin(users, eq(teamEvents.createdBy, users.id));

	const [teamEventsResult, personalEventsResult] = await Promise.all([
		teamConditions.length > 0
			? baseQuery
					.where(and(...teamConditions))
					.orderBy(asc(teamEvents.startTime))
			: Promise.resolve([] as CalendarEvent[]),
		includePersonal
			? baseQuery
					.where(and(...personalConditions))
					.orderBy(asc(teamEvents.startTime))
			: Promise.resolve([] as CalendarEvent[]),
	]);

	const eventsResult = [...teamEventsResult, ...personalEventsResult];
	const eventsWithAttendees = await Promise.all(
		eventsResult.map(async (event) => {
			if (!event.team_id) {
				return event;
			}
			const attendees = await dbPg
				.select({
					user_id: teamEventAttendees.userId,
					status: teamEventAttendees.status,
					responded_at: teamEventAttendees.respondedAt,
					notes: teamEventAttendees.notes,
					email: users.email,
					name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
				})
				.from(teamEventAttendees)
				.leftJoin(users, eq(teamEventAttendees.userId, users.id))
				.where(eq(teamEventAttendees.eventId, event.id));

			return {
				...event,
				attendees,
			};
		}),
	);

	return eventsWithAttendees.sort(
		(a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);
}

export async function listRecurringMeetings(input: {
	userId: string;
	teamIds?: string[];
}): Promise<RecurringMeeting[]> {
	const { userId, teamIds } = input;
	const memberships = await listTeamsForUser(userId);
	const allowedTeamIds = new Set(memberships.map((team) => team.id));
	const filteredTeamIds = (teamIds ?? memberships.map((team) => team.id)).filter(
		(teamId) => allowedTeamIds.has(teamId),
	);

	if (filteredTeamIds.length === 0) {
		return [];
	}

	const meetings = await dbPg
		.select({
			id: teamRecurringMeetings.id,
			team_id: teamRecurringMeetings.teamId,
			created_by: teamRecurringMeetings.createdBy,
			title: teamRecurringMeetings.title,
			description: teamRecurringMeetings.description,
			location: teamRecurringMeetings.location,
			days_of_week: teamRecurringMeetings.daysOfWeek,
			start_time: teamRecurringMeetings.startTime,
			end_time: teamRecurringMeetings.endTime,
			start_date: teamRecurringMeetings.startDate,
			end_date: teamRecurringMeetings.endDate,
			exceptions: teamRecurringMeetings.exceptions,
			meeting_type: teamRecurringMeetings.meetingType,
			created_at: teamRecurringMeetings.createdAt,
			creator_email: users.email,
			creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}), ${users.email})`,
		})
		.from(teamRecurringMeetings)
		.leftJoin(users, eq(teamRecurringMeetings.createdBy, users.id))
		.where(inArray(teamRecurringMeetings.teamId, filteredTeamIds))
		.orderBy(desc(teamRecurringMeetings.createdAt));

	return meetings
		.filter((meeting) => {
			if (meeting.meeting_type === "personal") {
				return meeting.created_by === userId;
			}
			return true;
		})
		.map((meeting) => ({
			...meeting,
			days_of_week: safeJsonParse<number[]>(meeting.days_of_week, []),
			exceptions: safeJsonParse<string[]>(meeting.exceptions, []),
			meeting_type: (meeting.meeting_type ?? "team") as "personal" | "team",
			start_date: meeting.start_date
				? new Date(meeting.start_date).toISOString().slice(0, 10)
				: null,
			end_date: meeting.end_date
				? new Date(meeting.end_date).toISOString().slice(0, 10)
				: null,
		}));
}

function getTargetTeamIds(
	meetingType: "personal" | "team",
	selectedTeamId: string | null,
	userTeams: Awaited<ReturnType<typeof listTeamsForUser>>,
) {
	if (meetingType === "personal") {
		return [];
	}
	if (!selectedTeamId) {
		return [];
	}
	if (selectedTeamId.startsWith("all-")) {
		const schoolName = selectedTeamId.replace("all-", "");
		return userTeams
			.filter((team) => team.school === schoolName)
			.map((team) => team.id);
	}
	return userTeams.some((team) => team.id === selectedTeamId)
		? [selectedTeamId]
		: [];
}

export async function createCalendarEvent(input: {
	userId: string;
	title: string;
	description?: string | null;
	startTime: string;
	endTime?: string | null;
	location?: string | null;
	eventType?: CalendarEventType | null;
	isAllDay?: boolean | null;
	isRecurring?: boolean | null;
	recurrencePattern?: Record<string, unknown> | null;
	meetingType: "personal" | "team";
	selectedTeamId?: string | null;
}): Promise<{ eventIds: string[] }> {
	const userTeams = await listTeamsForUser(input.userId);
	const targetTeamIds = getTargetTeamIds(
		input.meetingType,
		input.selectedTeamId ?? null,
		userTeams,
	);

	if (input.meetingType === "team" && targetTeamIds.length === 0) {
		throw new Error("You are not authorized to create events for that team");
	}

	const eventsToInsert =
		input.meetingType === "personal"
			? [
					{
						teamId: null,
					},
				]
			: targetTeamIds.map((teamId) => ({ teamId }));

	const createdIds: string[] = [];
	for (const target of eventsToInsert) {
		const [result] = await dbPg
			.insert(teamEvents)
			.values({
				teamId: target.teamId,
				createdBy: input.userId,
				title: input.title,
				description: input.description ?? null,
				eventType: input.eventType ?? "practice",
				startTime: input.startTime,
				endTime: input.endTime ?? null,
				location: input.location ?? null,
				isAllDay: input.isAllDay ?? false,
				isRecurring: input.isRecurring ?? false,
				recurrencePattern: input.recurrencePattern ?? null,
			})
			.returning({ id: teamEvents.id });

		if (result?.id) {
			createdIds.push(result.id);
		}
	}

	return { eventIds: createdIds };
}

export async function createRecurringMeeting(input: {
	userId: string;
	title: string;
	description?: string | null;
	location?: string | null;
	daysOfWeek: number[];
	startTime?: string | null;
	endTime?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	exceptions?: string[] | null;
	meetingType: "personal" | "team";
	selectedTeamId?: string | null;
}): Promise<{ meetingIds: string[] }> {
	const userTeams = await listTeamsForUser(input.userId);
	let targetTeamIds: string[] = [];
	if (input.meetingType === "personal") {
		if (
			input.selectedTeamId &&
			userTeams.some((team) => team.id === input.selectedTeamId)
		) {
			targetTeamIds = [input.selectedTeamId];
		} else {
			const fallbackTeam = userTeams[0];
			if (!fallbackTeam) {
				throw new Error("No team available for personal recurring meeting");
			}
			targetTeamIds = [fallbackTeam.id];
		}
	} else {
		targetTeamIds = getTargetTeamIds(
			"team",
			input.selectedTeamId ?? null,
			userTeams,
		);
	}

	if (targetTeamIds.length === 0) {
		throw new Error("You are not authorized to create recurring meetings");
	}

	const normalizeDate = (value?: string | null) => {
		if (!value) {
			return null;
		}
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
		return null;
	};

	const meetingIds: string[] = [];
	for (const teamId of targetTeamIds) {
		const [result] = await dbPg
			.insert(teamRecurringMeetings)
			.values({
				teamId,
				createdBy: input.userId,
				title: input.title,
				description: input.description ?? null,
				location: input.location ?? null,
				daysOfWeek: input.daysOfWeek,
				startTime: input.startTime ?? "00:00:00",
				endTime: input.endTime ?? "23:59:59",
				startDate: normalizeDate(input.startDate),
				endDate: normalizeDate(input.endDate),
				exceptions: input.exceptions ?? [],
				meetingType: input.meetingType,
			})
			.returning({ id: teamRecurringMeetings.id });

		if (result?.id) {
			meetingIds.push(result.id);
		}
	}

	return { meetingIds };
}

export async function deleteCalendarEvent(input: {
	userId: string;
	eventId: string;
}): Promise<{ success: true }> {
	const [event] = await dbPg
		.select({
			id: teamEvents.id,
			teamId: teamEvents.teamId,
			createdBy: teamEvents.createdBy,
		})
		.from(teamEvents)
		.where(eq(teamEvents.id, input.eventId))
		.limit(1);

	if (!event) {
		throw new Error("Event not found");
	}

	if (event.teamId) {
		const { membership } = await assertTeamAccess(event.teamId, input.userId);
		const isCaptain = membership.role === "captain" || membership.role === "admin";
		if (!(event.createdBy === input.userId || isCaptain)) {
			throw new Error("You do not have permission to delete this event");
		}
	} else if (event.createdBy !== input.userId) {
		throw new Error("You do not have permission to delete this event");
	}

	await dbPg.delete(teamEvents).where(eq(teamEvents.id, input.eventId));
	return { success: true };
}

export async function deleteRecurringMeeting(input: {
	userId: string;
	meetingId: string;
}): Promise<{ success: true }> {
	const [meeting] = await dbPg
		.select({
			id: teamRecurringMeetings.id,
			teamId: teamRecurringMeetings.teamId,
			createdBy: teamRecurringMeetings.createdBy,
			meetingType: teamRecurringMeetings.meetingType,
		})
		.from(teamRecurringMeetings)
		.where(eq(teamRecurringMeetings.id, input.meetingId))
		.limit(1);

	if (!meeting) {
		throw new Error("Recurring meeting not found");
	}

	if (meeting.meetingType === "personal") {
		if (meeting.createdBy !== input.userId) {
			throw new Error("You do not have permission to delete this meeting");
		}
	} else {
		const { membership } = await assertTeamAccess(meeting.teamId, input.userId);
		const isCaptain =
			membership.role === "captain" || membership.role === "admin";
		if (!(meeting.createdBy === input.userId || isCaptain)) {
			throw new Error("You do not have permission to delete this meeting");
		}
	}

	await dbPg
		.delete(teamRecurringMeetings)
		.where(eq(teamRecurringMeetings.id, input.meetingId));

	return { success: true };
}

export async function getTeamEventsForTimers(input: {
	teamSlug: string;
	subteamId: string;
	userId: string;
}) {
	const { team } = await assertTeamAccess(input.teamSlug, input.userId);

	const upcomingEvents = await dbPg
		.select({
			id: teamEvents.id,
			title: teamEvents.title,
			start_time: teamEvents.startTime,
			location: teamEvents.location,
			event_type: teamEvents.eventType,
			subteam_id: teamEvents.subteamId,
		})
		.from(teamEvents)
		.where(
			and(
				eq(teamEvents.teamId, team.id),
				or(isNull(teamEvents.subteamId), eq(teamEvents.subteamId, input.subteamId)),
				gte(teamEvents.startTime, sql`now()`),
			),
		)
		.orderBy(asc(teamEvents.startTime));

	return upcomingEvents.map((event) => ({
		id: event.id,
		title: event.title,
		start_time: event.start_time,
		location: event.location,
		event_type: event.event_type ?? "other",
	}));
}
