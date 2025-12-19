import type { TeamFullData } from "@/lib/server/teams";
import type { RosterData, TeamStoreActions, TeamStoreState } from "../../types";
import { CACHE_DURATIONS } from "../../types";
import { fetchWithDeduplication, handleApiError } from "../../utils";
import { getCacheKey, isDataFresh, loadFullTeam } from "./utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchRosterAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string, subteamId: string): Promise<RosterData> => {
		const key = getCacheKey("roster", teamSlug, subteamId);
		const cachedRoster = get().roster[key];
		const isFresh = isDataFresh(
			get().cacheTimestamps[key],
			CACHE_DURATIONS.roster,
		);
		const hasData =
			cachedRoster && Object.keys(cachedRoster.roster || {}).length > 0;

		if (isFresh && hasData) {
			return cachedRoster;
		}

		set((state) => ({
			loading: {
				...state.loading,
				roster: { ...state.loading.roster, [key]: true },
			},
			errors: {
				...state.errors,
				roster: { ...state.errors.roster, [key]: null },
			},
		}));

		try {
			const rosterData = await fetchWithDeduplication(key, async () => {
				const full = (await loadFullTeam(teamSlug)) as TeamFullData;
				const roster: Record<string, string[]> = {};
				for (const entry of full.rosterEntries) {
					if (entry.subteamId !== subteamId) {
						continue;
					}
					const slots = roster[entry.eventName] ?? [];
					roster[entry.eventName] = slots;
					slots[entry.slotIndex] = entry.displayName;
				}
				return {
					roster,
					removed_events: [],
				};
			});

			set((state) => ({
				roster: { ...state.roster, [key]: rosterData },
				loading: {
					...state.loading,
					roster: { ...state.loading.roster, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return rosterData;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchRoster");
			set((state) => ({
				loading: {
					...state.loading,
					roster: { ...state.loading.roster, [key]: false },
				},
				errors: {
					...state.errors,
					roster: { ...state.errors.roster, [key]: errorMessage },
				},
			}));
			throw error;
		}
	};
};
