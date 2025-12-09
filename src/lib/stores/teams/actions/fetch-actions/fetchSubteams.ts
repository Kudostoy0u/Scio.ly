import type { TeamFullData } from "@/lib/server/teams-v2";
import type { Subteam, TeamStoreActions, TeamStoreState } from "../../types";
import { CACHE_DURATIONS } from "../../types";
import { fetchWithDeduplication, handleApiError } from "../../utils";
import { getCacheKey, isDataFresh, loadFullTeam } from "./utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchSubteamsAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string): Promise<Subteam[]> => {
		const key = getCacheKey("subteams", teamSlug);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.subteams) &&
			get().subteams[teamSlug]
		) {
			return get().subteams[teamSlug] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				subteams: { ...state.loading.subteams, [teamSlug]: true },
			},
			errors: {
				...state.errors,
				subteams: { ...state.errors.subteams, [teamSlug]: null },
			},
		}));

		try {
			const subteams = (await fetchWithDeduplication(key, async () => {
				const full = (await loadFullTeam(teamSlug)) as TeamFullData;
				return full.subteams.map(
					(subteam) =>
						({
							id: subteam.id,
							name: subteam.name,
							team_id: subteam.teamId,
							description: subteam.description || "",
							created_at: subteam.createdAt,
						}) satisfies Subteam,
				);
			})) as Subteam[];

			set((state) => ({
				subteams: { ...state.subteams, [teamSlug]: subteams },
				loading: {
					...state.loading,
					subteams: { ...state.loading.subteams, [teamSlug]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return subteams;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchSubteams");
			set((state) => ({
				loading: {
					...state.loading,
					subteams: { ...state.loading.subteams, [teamSlug]: false },
				},
				errors: {
					...state.errors,
					subteams: { ...state.errors.subteams, [teamSlug]: errorMessage },
				},
			}));
			throw error;
		}
	};
};
