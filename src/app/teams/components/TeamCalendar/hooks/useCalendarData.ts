/**
 * Hook for loading and managing calendar events data
 */

import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type {
	CalendarEvent,
	RecurringMeeting,
	UserTeam,
} from "../../calendar/calendarUtils";
import {
	filterValidEventsWithBlacklist,
	filterValidRecurringMeetingsWithBlacklist,
} from "../utils/eventFilters";

function loadCachedData(
	cacheKey: string,
	userId: string,
	setEvents: (events: CalendarEvent[]) => void,
	setRecurringMeetings: (meetings: RecurringMeeting[]) => void,
	setUserTeams: (teams: UserTeam[]) => void,
) {
	const cachedEvents = globalApiCache.get<CalendarEvent[]>(
		`${cacheKey}_events`,
	);
	const cachedRecurring = globalApiCache.get<RecurringMeeting[]>(
		`${cacheKey}_recurring`,
	);
	const cachedTeams = globalApiCache.get<UserTeam[]>(`user-teams-${userId}`);

	if (cachedEvents) {
		const validEvents = filterValidEventsWithBlacklist(cachedEvents, userId);
		setEvents(validEvents);
		if (validEvents.length !== cachedEvents.length) {
			globalApiCache.set(`${cacheKey}_events`, validEvents);
		}
	}
	if (cachedRecurring) {
		const validRecurring = filterValidRecurringMeetingsWithBlacklist(
			cachedRecurring,
			userId,
		);
		setRecurringMeetings(validRecurring);
		if (validRecurring.length !== cachedRecurring.length) {
			globalApiCache.set(`${cacheKey}_recurring`, validRecurring);
		}
	}
	if (cachedTeams) {
		const captainTeams = cachedTeams.filter(
			(team) => team.user_role === "captain" || team.user_role === "co_captain",
		);
		setUserTeams(captainTeams);
	}

	return { cachedEvents, cachedRecurring, cachedTeams };
}

async function loadTeamEvents(
	teamSlug: string,
	cacheKey: string,
	userId: string,
	setEvents: (events: CalendarEvent[]) => void,
) {
	const eventsRes = await fetch(
		`/api/teams/calendar/events?teamId=${teamSlug}`,
	);
	if (eventsRes.ok) {
		const eventsData = await eventsRes.json();
		const freshEvents = filterValidEventsWithBlacklist(
			eventsData.events || [],
			userId,
		);
		setEvents(freshEvents);
		globalApiCache.set(`${cacheKey}_events`, freshEvents);
	}
}

async function loadPersonalEvents(
	userId: string,
	cacheKey: string,
	teamSlug: string | undefined,
	setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
) {
	const personalRes = await fetch(
		`/api/teams/calendar/personal?userId=${userId}`,
	);
	if (personalRes.ok) {
		const personalData = await personalRes.json();
		const personalEvents = personalData.events || [];
		setEvents((prev) => {
			const teamEvents = teamSlug ? prev : [];
			const combined = filterValidEventsWithBlacklist(
				[...teamEvents, ...personalEvents],
				userId,
			);
			globalApiCache.set(`${cacheKey}_events`, combined);
			return combined;
		});
	}
}

async function loadRecurringMeetings(
	teamSlug: string,
	cacheKey: string,
	userId: string,
	setRecurringMeetings: (meetings: RecurringMeeting[]) => void,
) {
	const recurringRes = await fetch(
		`/api/teams/calendar/recurring-meetings?teamSlug=${teamSlug}`,
	);
	if (recurringRes.ok) {
		const recurringData = await recurringRes.json();
		const freshRecurring = filterValidRecurringMeetingsWithBlacklist(
			recurringData.meetings || [],
			userId,
		);
		setRecurringMeetings(freshRecurring);
		globalApiCache.set(`${cacheKey}_recurring`, freshRecurring);
	}
}

async function loadUserTeams(
	userId: string,
	setUserTeams: (teams: UserTeam[]) => void,
) {
	const userTeamsCacheKey = `user-teams-${userId}`;
	const allTeams = await globalApiCache.fetchWithCache(
		userTeamsCacheKey,
		async () => {
			const response = await fetch("/api/teams/user-teams");
			if (!response.ok) {
				throw new Error("Failed to fetch user teams");
			}
			const result = await response.json();
			return result.teams || [];
		},
		"user-teams",
	);

	const captainTeams = allTeams.filter(
		(team: UserTeam) =>
			team.user_role === "captain" || team.user_role === "co_captain",
	);
	setUserTeams(captainTeams);
}

export function useCalendarData(
	userId: string | undefined,
	teamSlug: string | undefined,
) {
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [recurringMeetings, setRecurringMeetings] = useState<
		RecurringMeeting[]
	>([]);
	const [loading, setLoading] = useState(false);
	const [userTeams, setUserTeams] = useState<UserTeam[]>([]);

	const loadEvents = useCallback(async () => {
		if (!userId) {
			return;
		}

		const cacheKey = teamSlug
			? `calendar_${teamSlug}`
			: `calendar_user_${userId}`;
		const { cachedEvents, cachedRecurring, cachedTeams } = loadCachedData(
			cacheKey,
			userId,
			setEvents,
			setRecurringMeetings,
			setUserTeams,
		);

		try {
			if (!(cachedEvents || cachedRecurring || cachedTeams)) {
				setLoading(true);
			}

			if (teamSlug) {
				await loadTeamEvents(teamSlug, cacheKey, userId, setEvents);
			}

			await loadPersonalEvents(userId, cacheKey, teamSlug, setEvents);

			if (teamSlug) {
				await loadRecurringMeetings(
					teamSlug,
					cacheKey,
					userId,
					setRecurringMeetings,
				);
			}

			await loadUserTeams(userId, setUserTeams);
		} catch {
			if (!(cachedEvents || cachedRecurring)) {
				toast.error("Failed to load calendar events");
			}
		} finally {
			setLoading(false);
		}
	}, [userId, teamSlug]);

	useEffect(() => {
		loadEvents();
	}, [loadEvents]);

	return {
		events,
		setEvents,
		recurringMeetings,
		setRecurringMeetings,
		loading,
		userTeams,
		loadEvents,
	};
}
