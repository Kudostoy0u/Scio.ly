/**
 * Event filtering utilities
 */

import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import type {
	CalendarEvent,
	RecurringMeeting,
} from "../../calendar/calendarUtils";

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export function filterValidEvents(events: CalendarEvent[]): CalendarEvent[] {
	return events.filter((event) => {
		try {
			if (!event.start_time) {
				return false;
			}
			const startDate = new Date(event.start_time);
			if (Number.isNaN(startDate.getTime())) {
				return false;
			}

			if (event.end_time) {
				const endDate = new Date(event.end_time);
				if (Number.isNaN(endDate.getTime())) {
					return false;
				}
			}

			return true;
		} catch {
			return false;
		}
	});
}

export function filterValidRecurringMeetings(
	meetings: RecurringMeeting[],
): RecurringMeeting[] {
	return meetings.filter((meeting) => {
		try {
			if (!(meeting.start_date && meeting.end_date)) {
				return false;
			}
			const startDate = new Date(meeting.start_date);
			const endDate = new Date(meeting.end_date);
			if (
				Number.isNaN(startDate.getTime()) ||
				Number.isNaN(endDate.getTime())
			) {
				return false;
			}

			if (meeting.start_time && !TIME_REGEX.test(meeting.start_time)) {
				return false;
			}

			if (meeting.end_time && !TIME_REGEX.test(meeting.end_time)) {
				return false;
			}

			return true;
		} catch {
			return false;
		}
	});
}

export function isEventBlacklisted(
	eventId: string,
	userId: string | undefined,
): boolean {
	const blacklistKey = `blacklisted_events_${userId}`;
	const currentBlacklist = globalApiCache.get<string[]>(blacklistKey) || [];
	return currentBlacklist.includes(eventId);
}

export function blacklistEventId(
	eventId: string,
	userId: string | undefined,
): void {
	const blacklistKey = `blacklisted_events_${userId}`;
	const currentBlacklist = globalApiCache.get<string[]>(blacklistKey) || [];
	if (!currentBlacklist.includes(eventId)) {
		const updatedBlacklist = [...currentBlacklist, eventId];
		globalApiCache.set(blacklistKey, updatedBlacklist);
	}
}

export function filterValidEventsWithBlacklist(
	events: CalendarEvent[],
	userId: string | undefined,
): CalendarEvent[] {
	return filterValidEvents(events).filter(
		(event) => !isEventBlacklisted(event.id, userId),
	);
}

export function filterValidRecurringMeetingsWithBlacklist(
	meetings: RecurringMeeting[],
	userId: string | undefined,
): RecurringMeeting[] {
	return filterValidRecurringMeetings(meetings).filter(
		(meeting) => !isEventBlacklisted(meeting.id, userId),
	);
}
