"use client";

import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logging/logger";
import {
	INFINITE_TTL,
	LocalStorageCache,
} from "@/lib/utils/storage/localStorageCache";
import { useEffect } from "react";

type CalendarTeamManifest = {
	teamId: string;
	calendarUpdatedAt: string;
	subteamsUpdatedAt: string;
};

type CalendarManifest = {
	personalUpdatedAt: string;
	teamsUpdatedAt: string;
	teams: CalendarTeamManifest[];
};

const CALENDAR_MANIFEST_PREFIX = "calendar_manifest_";

const toTimestamp = (value: string | null | undefined) =>
	value ? new Date(value).getTime() : 0;

export function useCalendarCacheInvalidation(
	userId: string | undefined,
	teamIds: string[],
	isReady: boolean,
) {
	const utils = trpc.useUtils();
	const { data: manifest } = trpc.teams.calendarManifest.useQuery(undefined, {
		enabled: !!userId,
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!manifest || !userId) {
			return;
		}
		if (!isReady) {
			logger.log("[CalendarCache] Waiting for team context", { teamIds });
			return;
		}
		if (teamIds.length === 0 && manifest.teams.length > 0) {
			logger.log("[CalendarCache] Team list empty, skipping manifest sync", {
				manifestTeams: manifest.teams.length,
			});
			return;
		}

		const storageKey = `${CALENDAR_MANIFEST_PREFIX}${userId}`;
		const cached = LocalStorageCache.get<CalendarManifest>(storageKey);

		if (!cached) {
			const initialFetches: Promise<unknown>[] = [
				utils.teams.personalCalendarEvents.prefetch({}),
			];
			if (teamIds.length > 0) {
				initialFetches.push(
					utils.teams.teamCalendarEvents.prefetch({ teamIds }),
				);
			}

			void Promise.all(initialFetches).then(() => {
				logger.log("[CalendarCache] Bootstrap refresh complete", {
					teamIds,
					count: initialFetches.length,
				});
			});

			LocalStorageCache.set(storageKey, manifest, INFINITE_TTL);
			return;
		}

		if (process.env.NODE_ENV !== "production") {
			logger.log("[CalendarCache] Manifest comparison", {
				personalUpdatedAt: manifest.personalUpdatedAt,
				teamsUpdatedAt: manifest.teamsUpdatedAt,
				teamCount: manifest.teams.length,
				teamIds,
			});
		}

		const cachedTeams = new Map(
			cached.teams.map((team) => [team.teamId, team]),
		);
		const nextTeams = new Map(
			manifest.teams.map((team) => [team.teamId, team]),
		);

		const invalidations: Promise<unknown>[] = [];
		const refreshes: Promise<unknown>[] = [];
		const staleFlags: string[] = [];

		if (
			toTimestamp(manifest.personalUpdatedAt) >
			toTimestamp(cached.personalUpdatedAt)
		) {
			staleFlags.push("calendar.personal");
			invalidations.push(utils.teams.personalCalendarEvents.invalidate());
			refreshes.push(utils.teams.personalCalendarEvents.prefetch({}));
		}

		if (
			toTimestamp(manifest.teamsUpdatedAt) > toTimestamp(cached.teamsUpdatedAt)
		) {
			staleFlags.push("calendar.teams");
			invalidations.push(utils.teams.listUserTeamsWithSubteams.invalidate());
			invalidations.push(utils.teams.listUserTeams.invalidate());
			refreshes.push(utils.teams.listUserTeamsWithSubteams.prefetch());
			refreshes.push(utils.teams.listUserTeams.prefetch());
		}

		const staleTeamIds = teamIds.filter((teamId) => {
			const next = nextTeams.get(teamId);
			const previous = cachedTeams.get(teamId);
			if (!next) {
				return false;
			}
			if (!previous) {
				return true;
			}
			return (
				toTimestamp(next.calendarUpdatedAt) >
					toTimestamp(previous.calendarUpdatedAt) ||
				toTimestamp(next.subteamsUpdatedAt) >
					toTimestamp(previous.subteamsUpdatedAt)
			);
		});

		if (staleTeamIds.length > 0) {
			staleFlags.push(`calendar.team:${staleTeamIds.length}`);
			invalidations.push(
				utils.teams.teamCalendarEvents.invalidate({ teamIds }),
			);
			refreshes.push(utils.teams.teamCalendarEvents.prefetch({ teamIds }));
			invalidations.push(utils.teams.listUserTeamsWithSubteams.invalidate());
			invalidations.push(utils.teams.listUserTeams.invalidate());
			refreshes.push(utils.teams.listUserTeamsWithSubteams.prefetch());
			refreshes.push(utils.teams.listUserTeams.prefetch());
		}

		if (invalidations.length > 0) {
			logger.log("[CalendarCache] Stale cache detected", {
				staleFlags,
				teamIds,
			});
			void Promise.all(invalidations);
			void Promise.all(refreshes).then(() => {
				logger.log("[CalendarCache] Cache refresh complete", {
					teamIds,
					count: refreshes.length,
				});
			});
		} else {
			logger.log("[CalendarCache] Cache up to date", { teamIds });
		}

		LocalStorageCache.set(storageKey, manifest, INFINITE_TTL);
	}, [manifest, userId, teamIds, isReady, utils]);

	return { manifest };
}
