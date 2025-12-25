/**
 * Unified Team Data Hooks (v2)
 *
 * Single source of truth for all team data powered by tRPC + React Query.
 * Queries are persisted via the global QueryClient provider.
 */

"use client";

import type { TeamFullData } from "@/lib/server/teams";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logging/logger";
import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import { getQueryKey } from "@trpc/react-query";
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

const toTimestamp = (value: string | null | undefined) => {
	if (!value) {
		return 0;
	}
	const parsed = new Date(value).getTime();
	return Number.isFinite(parsed) ? parsed : 0;
};

export function useTeamCacheInvalidation(teamSlug: string) {
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();
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

		logger.log("[TeamCache] Manifest fetched", {
			teamSlug,
			manifest,
		});

		const invalidations: Promise<unknown>[] = [];
		const refreshes: Promise<unknown>[] = [];
		const staleFlags: string[] = [];

		const formatUpdatedAt = (value: number) =>
			value ? new Date(value).toISOString() : null;

		const compareCache = (options: {
			label: string;
			manifestUpdatedAt: number;
			queryKey: readonly unknown[];
			invalidate: () => Promise<unknown>;
			prefetch?: () => Promise<unknown>;
		}) => {
			const queryState = queryClient.getQueryState(options.queryKey);
			const query = queryClient
				.getQueryCache()
				.find({ queryKey: options.queryKey });
			const hasObservers = (query?.getObserversCount?.() ?? 0) > 0;
			const cachedUpdatedAt = queryState?.dataUpdatedAt ?? 0;

			logger.log("[TeamCache] Compare updated_at", {
				teamSlug,
				label: options.label,
				manifestUpdatedAt: formatUpdatedAt(options.manifestUpdatedAt),
				cachedUpdatedAt: formatUpdatedAt(cachedUpdatedAt),
				hasObservers,
			});

			if (!cachedUpdatedAt) {
				return;
			}

			if (options.manifestUpdatedAt > cachedUpdatedAt) {
				staleFlags.push(options.label);
				invalidations.push(options.invalidate());
				if (!hasObservers && options.prefetch) {
					refreshes.push(options.prefetch());
				}
			}
		};

		const fullManifestUpdatedAt = Math.max(
			toTimestamp(manifest.fullUpdatedAt),
			toTimestamp(manifest.rosterUpdatedAt),
			toTimestamp(manifest.membersUpdatedAt),
			toTimestamp(manifest.subteamsUpdatedAt),
		);

		compareCache({
			label: "teams.full",
			manifestUpdatedAt: fullManifestUpdatedAt,
			queryKey: getQueryKey(trpc.teams.full, { teamSlug }, "query"),
			invalidate: () => utils.teams.full.invalidate({ teamSlug }),
			prefetch: () => utils.teams.full.prefetch({ teamSlug }),
		});

		compareCache({
			label: "teams.assignments",
			manifestUpdatedAt: toTimestamp(manifest.assignmentsUpdatedAt),
			queryKey: getQueryKey(trpc.teams.assignments, { teamSlug }, "query"),
			invalidate: () => utils.teams.assignments.invalidate({ teamSlug }),
			prefetch: () => utils.teams.assignments.prefetch({ teamSlug }),
		});

		for (const subteam of manifest.subteams ?? []) {
			const subteamId = subteam.subteamId;

			compareCache({
				label: `teams.getStream:${subteamId}`,
				manifestUpdatedAt: toTimestamp(subteam.streamUpdatedAt),
				queryKey: getQueryKey(
					trpc.teams.getStream,
					{ teamSlug, subteamId },
					"query",
				),
				invalidate: () => utils.teams.getStream.invalidate({ teamSlug, subteamId }),
				prefetch: () => utils.teams.getStream.prefetch({ teamSlug, subteamId }),
			});

			compareCache({
				label: `teams.getTimers:${subteamId}`,
				manifestUpdatedAt: toTimestamp(subteam.timersUpdatedAt),
				queryKey: getQueryKey(
					trpc.teams.getTimers,
					{ teamSlug, subteamId },
					"query",
				),
				invalidate: () => utils.teams.getTimers.invalidate({ teamSlug, subteamId }),
				prefetch: () => utils.teams.getTimers.prefetch({ teamSlug, subteamId }),
			});

			compareCache({
				label: `teams.getTournaments:${subteamId}`,
				manifestUpdatedAt: toTimestamp(subteam.tournamentsUpdatedAt),
				queryKey: getQueryKey(
					trpc.teams.getTournaments,
					{ teamSlug, subteamId },
					"query",
				),
				invalidate: () =>
					utils.teams.getTournaments.invalidate({ teamSlug, subteamId }),
				prefetch: () =>
					utils.teams.getTournaments.prefetch({ teamSlug, subteamId }),
			});

			compareCache({
				label: `teams.getRosterNotes:${subteamId}`,
				manifestUpdatedAt: toTimestamp(subteam.rosterNotesUpdatedAt),
				queryKey: getQueryKey(
					trpc.teams.getRosterNotes,
					{ teamSlug, subteamId },
					"query",
				),
				invalidate: () =>
					utils.teams.getRosterNotes.invalidate({ teamSlug, subteamId }),
				prefetch: () =>
					utils.teams.getRosterNotes.prefetch({ teamSlug, subteamId }),
			});
		}

		if (invalidations.length > 0) {
			logger.log("[TeamCache] Stale cache detected", {
				teamSlug,
				entries: staleFlags,
			});
			void Promise.all(invalidations);
			void Promise.all(refreshes).then(() => {
				logger.log("[TeamCache] Cache refresh complete", {
					teamSlug,
					count: refreshes.length,
				});
			});
		} else {
			logger.log("[TeamCache] Cache up to date", { teamSlug });
		}

	}, [manifest, queryClient, teamSlug, utils]);

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
