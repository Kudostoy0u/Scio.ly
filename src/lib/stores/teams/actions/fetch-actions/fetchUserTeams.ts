import { trpcClient } from "../../client";
import type { TeamStoreActions, TeamStoreState, UserTeam } from "../../types";
import { CACHE_DURATIONS } from "../../types";
import { fetchWithDeduplication, handleApiError } from "../../utils";
import { getCacheKey, isDataFresh } from "./utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchUserTeamsAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (userId: string): Promise<UserTeam[]> => {
		const key = getCacheKey("userTeams", userId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.userTeams) &&
			get().userTeams.length > 0
		) {
			return get().userTeams;
		}

		set((state) => ({
			loading: { ...state.loading, userTeams: true },
			errors: { ...state.errors, userTeams: null },
		}));

		try {
			const teams = await fetchWithDeduplication(key, async () => {
				const result = await trpcClient.teams.listUserTeams.query();
				return (result.teams || []).map(
					(team): UserTeam => ({
						id: String(team.id),
						slug: String(team.slug),
						school: String(team.school),
						division: (team.division ?? "B") as "B" | "C",
						user_role: String(team.role ?? "member"),
						name: String(team.name),
					}),
				);
			});

			set((state) => ({
				userTeams: teams,
				loading: { ...state.loading, userTeams: false },
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return teams;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchUserTeams");
			set((state) => ({
				loading: { ...state.loading, userTeams: false },
				errors: { ...state.errors, userTeams: errorMessage },
			}));
			throw error;
		}
	};
};
