/**
 * Hook for loading calendar data via tRPC + manifest-driven cache
 */

import { useCalendarCacheInvalidation } from "@/lib/hooks/useCalendar";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logging/logger";
import { useMemo } from "react";
import type {
	CalendarEvent,
	RecurringMeeting,
	UserTeam,
} from "../../calendar/calendarUtils";
import {
	filterValidEvents,
	filterValidRecurringMeetings,
} from "../utils/eventFilters";

const toDateString = (value?: string | null) => {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(0, 10);
};

const toTimeString = (value?: string | null) => {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toISOString().slice(11, 16);
};

export function useCalendarData(
	userId: string | undefined,
	teamSlug: string | undefined,
) {
	const { data: teamsData, isLoading: teamsWithSubteamsLoading } =
		trpc.teams.listUserTeamsWithSubteams.useQuery(undefined, {
			enabled: !!userId,
		});
	const { data: basicTeamsData, isLoading: basicTeamsLoading } =
		trpc.teams.listUserTeams.useQuery(undefined, {
			enabled: !!userId,
		});

	const teamsLoading = teamsWithSubteamsLoading || basicTeamsLoading;

	const userTeams = useMemo<UserTeam[]>(() => {
		const hasSubteams = (teamsData?.teams?.length ?? 0) > 0;
		const sourceTeams = hasSubteams
			? (teamsData?.teams ?? [])
			: (basicTeamsData?.teams ?? []);

		const mapped = sourceTeams.map((team) => {
			const subteams =
				"subteams" in team && Array.isArray(team.subteams) ? team.subteams : [];
			return {
				id: team.id,
				name: team.name || `${team.school} ${team.division}`,
				slug: team.slug,
				school: team.school,
				division: team.division as "B" | "C" | undefined,
				user_role: team.role ?? "member",
				team_id: team.id,
				subteams,
			};
		});

		if (process.env.NODE_ENV !== "production") {
			logger.dev.structured("debug", "[CalendarData] Team source", {
				userId,
				hasSubteams,
				count: mapped.length,
				subteamCounts: mapped.map((team) => ({
					teamId: team.id,
					subteams: Array.isArray(team.subteams)
						? team.subteams.map((subteam) => subteam.name)
						: [],
				})),
			});
		}

		return mapped;
	}, [basicTeamsData, teamsData, userId]);

	const targetTeamIds = useMemo(() => {
		if (!userTeams.length) {
			return [] as string[];
		}
		if (teamSlug) {
			const match = userTeams.find((team) => team.slug === teamSlug);
			return match ? [match.id] : [];
		}
		return userTeams.map((team) => team.id);
	}, [teamSlug, userTeams]);

	useCalendarCacheInvalidation(userId, targetTeamIds, !teamsLoading);

	const personalQuery = trpc.teams.personalCalendarEvents.useQuery(
		{},
		{
			enabled: !!userId,
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	);

	const teamQuery = trpc.teams.teamCalendarEvents.useQuery(
		{ teamIds: targetTeamIds },
		{
			enabled: !!userId && targetTeamIds.length > 0,
			staleTime: Number.POSITIVE_INFINITY,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	);

	const { events, recurringMeetings } = useMemo(() => {
		const personalEvents =
			(personalQuery.data as CalendarEvent[] | undefined) ?? [];
		const teamEvents = (teamQuery.data as CalendarEvent[] | undefined) ?? [];
		const personalIds = new Set(personalEvents.map((event) => event.id));
		const teamIds = new Set(teamEvents.map((event) => event.id));
		const byId = new Map<string, CalendarEvent>();
		for (const event of [...personalEvents, ...teamEvents]) {
			byId.set(event.id, event);
		}

		const nonRecurring: CalendarEvent[] = [];
		const recurringById = new Map<string, RecurringMeeting>();

		for (const event of byId.values()) {
			// Convert null to undefined for team_id compatibility
			const teamId =
				event.team_id === null || event.team_id === undefined
					? undefined
					: event.team_id;
			const subteamId =
				event.subteam_id === null || event.subteam_id === undefined
					? undefined
					: event.subteam_id;
			const normalizedEvent: CalendarEvent = {
				...event,
				team_id: teamId,
				subteam_id: subteamId,
			};
			if (normalizedEvent.is_recurring && normalizedEvent.recurrence_pattern) {
				const pattern = normalizedEvent.recurrence_pattern as {
					days_of_week?: number[];
					start_date?: string | null;
					end_date?: string | null;
					exceptions?: string[];
					start_time?: string | null;
					end_time?: string | null;
				};

				const fallbackStartDate = toDateString(normalizedEvent.start_time);
				const fallbackStartTime =
					toTimeString(normalizedEvent.start_time) || "00:00";
				const fallbackEndTime = toTimeString(normalizedEvent.end_time) || "";

				recurringById.set(normalizedEvent.id, {
					id: normalizedEvent.id,
					...(teamId !== undefined && { team_id: teamId }),
					...(subteamId !== undefined && { subteam_id: subteamId }),
					days_of_week: pattern.days_of_week ?? [],
					start_time: pattern.start_time ?? fallbackStartTime,
					end_time: pattern.end_time ?? fallbackEndTime,
					start_date: pattern.start_date ?? fallbackStartDate,
					end_date: pattern.end_date ?? undefined,
					title: normalizedEvent.title,
					description: normalizedEvent.description,
					location: normalizedEvent.location,
					exceptions: pattern.exceptions ?? [],
					created_by: normalizedEvent.created_by,
				});
				continue;
			}

			nonRecurring.push(normalizedEvent);
		}

		const dedupedEvents = filterValidEvents(nonRecurring);
		const dedupedRecurring = filterValidRecurringMeetings(
			Array.from(recurringById.values()),
		);

		if (process.env.NODE_ENV !== "production") {
			const overlap = [...personalIds].filter((id) => teamIds.has(id));
			console.log("[CalendarData] Loaded events", {
				personalCount: personalEvents.length,
				teamCount: teamEvents.length,
				uniqueCount: byId.size,
				dedupedCount: dedupedEvents.length,
				recurringCount: dedupedRecurring.length,
				overlapCount: overlap.length,
			});
		}

		return {
			events: dedupedEvents,
			recurringMeetings: dedupedRecurring,
		};
	}, [personalQuery.data, teamQuery.data]);

	return {
		events,
		recurringMeetings,
		loading: teamsLoading || personalQuery.isLoading || teamQuery.isLoading,
		userTeams,
		targetTeamIds,
	};
}
