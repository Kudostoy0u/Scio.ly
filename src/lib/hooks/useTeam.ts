/**
 * Unified Team Data Hooks (v2)
 *
 * Single source of truth for all team data powered by tRPC + React Query.
 * Queries are persisted via the global QueryClient provider.
 */

"use client";

import type { TeamFullData } from "@/lib/server/teams-v2";
import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import { trpc } from "@/lib/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

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
		return membersData.filter((m) => m.subteamId === subteamId);
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

export function useInvalidateTeam() {
	const queryClient = useQueryClient();
	const utils = trpc.useUtils();

	return {
		invalidateTeam: async (teamSlug: string, options?: { invalidateUserTeams?: boolean }) => {
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
				queryClient.invalidateQueries({ queryKey: [["teams", "listUserTeams"]] }),
			]);
		},
		updateTeamData: (
			teamSlug: string,
			updater: (prev?: TeamFullData) => TeamFullData,
		) => {
			queryClient.setQueryData(teamKeys.full(teamSlug), updater);
		},
		refetchTeam: async (teamSlug: string) => {
			await utils.teams.full.invalidate({ teamSlug });
		},
	};
}
