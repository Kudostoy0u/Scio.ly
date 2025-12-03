/**
 * Cache Management Actions for Team Store
 */

import type { TeamStoreActions, TeamStoreState } from "../types";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createCacheActions = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
): Partial<TeamStoreActions> => {
	const getCacheKey = (type: string, ...params: string[]) =>
		`${type}-${params.join("-")}`;

	const isDataFresh = (key: string, maxAge: number = 5 * 60 * 1000) => {
		const timestamp = get().cacheTimestamps[key];
		if (!timestamp) {
			return false;
		}
		return Date.now() - timestamp < maxAge;
	};

	const clearCache = (type: string, ...params: string[]) => {
		const key = getCacheKey(type, ...params);
		set((state) => ({
			cacheTimestamps: { ...state.cacheTimestamps, [key]: 0 },
		}));
	};

	const clearAllCache = () => {
		set({ cacheTimestamps: {} });
	};

	const invalidateCache = (key?: string) => {
		if (key) {
			set((_state) => {
				const newState = { ..._state };
				delete newState.cacheTimestamps[key];
				return newState;
			});
		} else {
			set((_state) => ({
				cacheTimestamps: {},
				userTeams: [],
				subteams: {},
				roster: {},
				members: {},
				stream: {},
				assignments: {},
				tournaments: {},
				timers: {},
			}));
		}
	};

	const preloadData = async (userId: string, teamSlug?: string) => {
		const promises: Promise<unknown>[] = [];

		promises.push(get().fetchUserTeams(userId));

		if (teamSlug) {
			promises.push(get().fetchSubteams(teamSlug));
		}

		await Promise.allSettled(promises);
	};

	return {
		getCacheKey,
		isDataFresh,
		clearCache,
		clearAllCache,
		invalidateCache,
		preloadData,
	};
};
