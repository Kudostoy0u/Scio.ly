/**
 * Unified Team Data Hooks (v2)
 *
 * Single source of truth for all team data powered by tRPC + React Query.
 * Queries are persisted via the global QueryClient provider.
 */

"use client";

import type { TeamFullData } from "@/lib/server/teams-v2";
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

	const members = useMemo(() => {
		if (!query.data?.members) {
			return [];
		}
		if (!subteamId || subteamId === "all") {
			return query.data.members;
		}
		return query.data.members.filter((m) => m.subteamId === subteamId);
	}, [query.data?.members, subteamId]);

	return { ...query, data: members };
}

export function useTeamRoster(teamSlug: string, subteamId: string | null) {
	const query = useTeamFull(teamSlug);

	const roster = useMemo(() => {
		if (!(query.data?.rosterEntries && subteamId)) {
			return { roster: {}, removedEvents: [] as string[] };
		}

		const rosterObj: Record<string, string[]> = {};
		for (const entry of query.data.rosterEntries) {
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
	}, [query.data?.rosterEntries, subteamId]);

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
		invalidateTeam: async (teamSlug: string) => {
			await Promise.all([
				utils.teams.full.invalidate({ teamSlug }),
				utils.teams.meta.invalidate({ teamSlug }),
				queryClient.invalidateQueries({ queryKey: teamKeys.full(teamSlug) }),
				queryClient.invalidateQueries({ queryKey: teamKeys.meta(teamSlug) }),
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
