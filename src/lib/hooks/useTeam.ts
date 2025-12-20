/**
 * Unified Team Data Hooks (v2)
 *
 * Single source of truth for all team data powered by tRPC + React Query.
 * Queries are persisted via the global QueryClient provider.
 */

"use client";

import type { TeamFullData } from "@/lib/server/teams";
import { trpc } from "@/lib/trpc/client";
import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import {
	INFINITE_TTL,
	LocalStorageCache,
} from "@/lib/utils/storage/localStorageCache";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export const teamKeys = {
	all: ["team"] as const,
	meta: (slug: string) => [...teamKeys.all, slug, "meta"] as const,
	full: (slug: string) => [...teamKeys.all, slug, "full"] as const,
};

export function useTeamMeta(teamSlug: string) {
	return trpc.teams.meta.useQuery(
		{ teamSlug },
		{
			enabled: !!teamSlug,
			staleTime: 60 * 1000,
		},
	);
}

export function useTeamFull(teamSlug: string) {
	return trpc.teams.full.useQuery(
		{ teamSlug },
		{
			enabled: !!teamSlug,
			staleTime: 5 * 60 * 1000,
			gcTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	);
}

export function useTeamMembers(teamSlug: string, subteamId?: string) {
	const query = useTeamFull(teamSlug);
	const membersData = query.data?.members;

	const members = useMemo(() => {
		if (!membersData) {
			return [];
		}
		if (!subteamId || subteamId === "all") {
			return membersData;
		}
		return membersData.filter(
			(m: TeamFullData["members"][0]) => m.subteamId === subteamId,
		);
	}, [membersData, subteamId]);

	return { ...query, data: members };
}

export function useTeamRoster(teamSlug: string, subteamId: string | null) {
	const query = useTeamFull(teamSlug);
	const rosterEntriesData = query.data?.rosterEntries;

	const roster = useMemo(() => {
		if (!(rosterEntriesData && subteamId)) {
			return { roster: {}, removedEvents: [] as string[] };
		}

		const rosterObj: Record<string, string[]> = {};
		for (const entry of rosterEntriesData) {
			if (entry.subteamId !== subteamId) {
				continue;
			}
			if (!rosterObj[entry.eventName]) {
				rosterObj[entry.eventName] = [];
			}
			const eventSlots = rosterObj[entry.eventName] ?? [];
			rosterObj[entry.eventName] = eventSlots;
			eventSlots[entry.slotIndex] = entry.displayName;
		}

		return { roster: rosterObj, removedEvents: [] as string[] };
	}, [rosterEntriesData, subteamId]);

	return { ...query, data: roster };
}

export function useTeamSubteams(teamSlug: string) {
	const query = useTeamFull(teamSlug);
	return { ...query, data: query.data?.subteams ?? [] };
}

export function useTeamAssignments(teamSlug: string) {
	const query = useTeamFull(teamSlug);
	return { ...query, data: query.data?.assignments ?? [] };
}

type SubteamCacheManifest = {
	subteamId: string;
	streamUpdatedAt: string;
	timersUpdatedAt: string;
	tournamentsUpdatedAt: string;
};

type TeamCacheManifest = {
	teamId: string;
	fullUpdatedAt: string;
	assignmentsUpdatedAt: string;
	rosterUpdatedAt: string;
	membersUpdatedAt: string;
	subteamsUpdatedAt: string;
	subteams: SubteamCacheManifest[];
};

const TEAM_MANIFEST_PREFIX = "team_cache_manifest_";

const toTimestamp = (value: string | null | undefined) =>
	value ? new Date(value).getTime() : 0;

export function useTeamCacheInvalidation(teamSlug: string) {
	const utils = trpc.useUtils();
	const { data: manifest } = trpc.teams.cacheManifest.useQuery(
		{ teamSlug },
		{
			enabled: !!teamSlug,
			staleTime: 0,
			refetchOnWindowFocus: false,
			refetchOnMount: true,
		},
	);

	useEffect(() => {
		if (!manifest) {
			return;
		}

		console.log("[TeamCache] Manifest fetched", {
			teamSlug,
			manifest,
		});

		const storageKey = `${TEAM_MANIFEST_PREFIX}${teamSlug}`;
		const cached = LocalStorageCache.get<TeamCacheManifest>(storageKey);

		if (!cached) {
			console.log("[TeamCache] No cached manifest, bootstrapping refresh", {
				teamSlug,
			});

			const bootstrapRefreshes: Promise<unknown>[] = [
				utils.teams.full.prefetch({ teamSlug }),
				utils.teams.assignments.prefetch({ teamSlug }),
			];

			for (const subteam of manifest.subteams ?? []) {
				bootstrapRefreshes.push(
					utils.teams.getStream.prefetch({
						teamSlug,
						subteamId: subteam.subteamId,
					}),
				);
				bootstrapRefreshes.push(
					utils.teams.getTimers.prefetch({
						teamSlug,
						subteamId: subteam.subteamId,
					}),
				);
				bootstrapRefreshes.push(
					utils.teams.getTournaments.prefetch({
						teamSlug,
						subteamId: subteam.subteamId,
					}),
				);
			}

			void Promise.all(bootstrapRefreshes).then(() => {
				console.log("[TeamCache] Bootstrap refresh complete", {
					teamSlug,
					count: bootstrapRefreshes.length,
				});
			});

			LocalStorageCache.set(storageKey, manifest, INFINITE_TTL);
			return;
		}

		const invalidations: Promise<unknown>[] = [];
		const refreshes: Promise<unknown>[] = [];
		const staleFlags: string[] = [];

		const fullNeedsRefresh =
			toTimestamp(manifest.fullUpdatedAt) > toTimestamp(cached.fullUpdatedAt) ||
			toTimestamp(manifest.rosterUpdatedAt) >
				toTimestamp(cached.rosterUpdatedAt) ||
			toTimestamp(manifest.membersUpdatedAt) >
				toTimestamp(cached.membersUpdatedAt) ||
			toTimestamp(manifest.subteamsUpdatedAt) >
				toTimestamp(cached.subteamsUpdatedAt);

		if (fullNeedsRefresh) {
			staleFlags.push("teams.full");
			invalidations.push(utils.teams.full.invalidate({ teamSlug }));
			refreshes.push(utils.teams.full.prefetch({ teamSlug }));
		}

		if (
			toTimestamp(manifest.assignmentsUpdatedAt) >
			toTimestamp(cached.assignmentsUpdatedAt)
		) {
			staleFlags.push("teams.assignments");
			invalidations.push(utils.teams.assignments.invalidate({ teamSlug }));
			refreshes.push(utils.teams.assignments.prefetch({ teamSlug }));
		}

		const cachedSubteams = new Map(
			(cached.subteams ?? []).map((subteam) => [subteam.subteamId, subteam]),
		);
		const nextSubteams = new Map(
			(manifest.subteams ?? []).map((subteam) => [subteam.subteamId, subteam]),
		);

		for (const [subteamId, next] of nextSubteams.entries()) {
			const previous = cachedSubteams.get(subteamId);
			if (!previous) {
				staleFlags.push(`teams.getStream:${subteamId}`);
				invalidations.push(
					utils.teams.getStream.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getStream.prefetch({ teamSlug, subteamId }));
				staleFlags.push(`teams.getTimers:${subteamId}`);
				invalidations.push(
					utils.teams.getTimers.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getTimers.prefetch({ teamSlug, subteamId }));
				staleFlags.push(`teams.getTournaments:${subteamId}`);
				invalidations.push(
					utils.teams.getTournaments.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(
					utils.teams.getTournaments.prefetch({ teamSlug, subteamId }),
				);
				continue;
			}

			if (
				toTimestamp(next.streamUpdatedAt) >
				toTimestamp(previous.streamUpdatedAt)
			) {
				staleFlags.push(`teams.getStream:${subteamId}`);
				invalidations.push(
					utils.teams.getStream.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getStream.prefetch({ teamSlug, subteamId }));
			}
			if (
				toTimestamp(next.timersUpdatedAt) >
				toTimestamp(previous.timersUpdatedAt)
			) {
				staleFlags.push(`teams.getTimers:${subteamId}`);
				invalidations.push(
					utils.teams.getTimers.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getTimers.prefetch({ teamSlug, subteamId }));
			}
			if (
				toTimestamp(next.tournamentsUpdatedAt) >
				toTimestamp(previous.tournamentsUpdatedAt)
			) {
				staleFlags.push(`teams.getTournaments:${subteamId}`);
				invalidations.push(
					utils.teams.getTournaments.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(
					utils.teams.getTournaments.prefetch({ teamSlug, subteamId }),
				);
			}
		}

		for (const [subteamId] of cachedSubteams.entries()) {
			if (!nextSubteams.has(subteamId)) {
				staleFlags.push(`teams.getStream:${subteamId}`);
				invalidations.push(
					utils.teams.getStream.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getStream.prefetch({ teamSlug, subteamId }));
				staleFlags.push(`teams.getTimers:${subteamId}`);
				invalidations.push(
					utils.teams.getTimers.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(utils.teams.getTimers.prefetch({ teamSlug, subteamId }));
				staleFlags.push(`teams.getTournaments:${subteamId}`);
				invalidations.push(
					utils.teams.getTournaments.invalidate({ teamSlug, subteamId }),
				);
				refreshes.push(
					utils.teams.getTournaments.prefetch({ teamSlug, subteamId }),
				);
			}
		}

		if (invalidations.length > 0) {
			console.log("[TeamCache] Stale cache detected", {
				teamSlug,
				entries: staleFlags,
			});
			void Promise.all(invalidations);
			void Promise.all(refreshes).then(() => {
				console.log("[TeamCache] Cache refresh complete", {
					teamSlug,
					count: refreshes.length,
				});
			});
		} else {
			console.log("[TeamCache] Cache up to date", { teamSlug });
		}

		LocalStorageCache.set(storageKey, manifest, INFINITE_TTL);
	}, [manifest, teamSlug, utils]);

	return { manifest };
}

export function useInvalidateTeam() {
	const queryClient = useQueryClient();
	const utils = trpc.useUtils();

	return {
		invalidateTeam: async (
			teamSlug: string,
			options?: { invalidateUserTeams?: boolean },
		) => {
			const invalidations = [
				utils.teams.full.invalidate({ teamSlug }),
				utils.teams.meta.invalidate({ teamSlug }),
				queryClient.invalidateQueries({ queryKey: teamKeys.full(teamSlug) }),
				queryClient.invalidateQueries({ queryKey: teamKeys.meta(teamSlug) }),
			];

			// If team is deleted, also invalidate user teams list
			if (options?.invalidateUserTeams) {
				invalidations.push(utils.teams.listUserTeams.invalidate());
			}

			await Promise.all(invalidations);
		},
		invalidateTeamAndUserTeams: async (teamSlug: string) => {
			// Invalidate globalApiCache for all user-teams (affects all users)
			globalApiCache.invalidateAllUserTeams();
			// Invalidate all team-specific caches in globalApiCache
			globalApiCache.invalidateTeamCaches(teamSlug);

			await Promise.all([
				utils.teams.full.invalidate({ teamSlug }),
				utils.teams.meta.invalidate({ teamSlug }),
				utils.teams.listUserTeams.invalidate(),
				queryClient.invalidateQueries({ queryKey: teamKeys.full(teamSlug) }),
				queryClient.invalidateQueries({ queryKey: teamKeys.meta(teamSlug) }),
				queryClient.invalidateQueries({
					queryKey: [["teams", "listUserTeams"]],
				}),
			]);
		},
		updateTeamData: (
			teamSlug: string,
			updater: (prev?: TeamFullData) => TeamFullData | undefined,
		) => {
			// Keep both caches in sync:
			// - tRPC's internal query key (used by `trpc.teams.full.useQuery`)
			// - our explicit `teamKeys.full` key (used by some manual invalidations)
			utils.teams.full.setData({ teamSlug }, updater);
			queryClient.setQueryData(teamKeys.full(teamSlug), updater);
		},
		refetchTeam: async (teamSlug: string) => {
			await utils.teams.full.invalidate({ teamSlug });
		},
	};
}
