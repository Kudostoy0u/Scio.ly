/**
 * Hook for loading calendar data via tRPC
 */

import { trpc } from "@/lib/trpc/client";
import { useMemo } from "react";
import type {
	CalendarEvent,
	RecurringMeeting,
	UserTeam,
} from "../../calendar/calendarUtils";
import {
	filterValidEventsWithBlacklist,
	filterValidRecurringMeetingsWithBlacklist,
} from "../utils/eventFilters";

export function useCalendarData(
	userId: string | undefined,
	teamSlug: string | undefined,
	blacklistVersion: number,
) {
	const { data: teamsData, isLoading: teamsLoading } =
		trpc.teams.listUserTeams.useQuery(undefined, {
			enabled: !!userId,
		});

	const userTeams = useMemo<UserTeam[]>(
		() =>
			teamsData?.teams.map((team) => ({
				id: team.id,
				name: team.name || `${team.school} ${team.division}`,
				slug: team.slug,
				school: team.school,
				user_role: team.role ?? "member",
				team_id: team.id,
			})) ?? [],
		[teamsData],
	);

	const targetTeamIds = useMemo(() => {
		if (!userTeams.length) {
			return [];
		}
		if (teamSlug) {
			const match = userTeams.find((team) => team.slug === teamSlug);
			return match ? [match.id] : [];
		}
		return userTeams.map((team) => team.id);
	}, [teamSlug, userTeams]);

	const { data: eventsData, isLoading: eventsLoading } =
		trpc.teams.calendarEvents.useQuery(
			{
				teamIds: targetTeamIds,
				includePersonal: true,
			},
			{ enabled: !!userId },
		);

	const { data: recurringData, isLoading: recurringLoading } =
		trpc.teams.recurringMeetings.useQuery(
			{ teamIds: targetTeamIds },
			{ enabled: !!userId && targetTeamIds.length > 0 },
		);

	const events = useMemo(() => {
		return filterValidEventsWithBlacklist(
			(eventsData as CalendarEvent[] | undefined) ?? [],
			userId,
		);
	}, [eventsData, userId, blacklistVersion]);

	const recurringMeetings = useMemo(() => {
		return filterValidRecurringMeetingsWithBlacklist(
			(recurringData as RecurringMeeting[] | undefined) ?? [],
			userId,
		);
	}, [recurringData, userId, blacklistVersion]);

	return {
		events,
		recurringMeetings,
		loading: teamsLoading || eventsLoading || recurringLoading,
		userTeams,
		targetTeamIds,
	};
}
