import type { TeamFullData } from "@/lib/server/teams-v2";
import { trpcClient } from "../../client";
import { fetchWithDeduplication } from "../../utils";

export const loadFullTeam = (teamSlug: string) =>
	fetchWithDeduplication(`full-${teamSlug}`, async () => {
		const result = await trpcClient.teams.full.query({ teamSlug });
		return result as TeamFullData;
	});

export const getCacheKey = (type: string, ...params: string[]) =>
	`${type}-${params.join("-")}`;

export const isDataFresh = (
	timestamp: number | undefined,
	maxAge: number = 5 * 60 * 1000,
) => {
	if (!timestamp) {
		return false;
	}
	return Date.now() - timestamp < maxAge;
};
