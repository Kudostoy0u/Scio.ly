import type {
	StreamPost,
	TeamStoreActions,
	TeamStoreState,
	Timer,
	Tournament,
} from "../../types";
import { CACHE_DURATIONS } from "../../types";
import { fetchWithDeduplication, handleApiError } from "../../utils";
import { getCacheKey, isDataFresh } from "./utils";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchStreamDataAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (
		teamSlug: string,
		subteamId: string,
	): Promise<{
		stream: StreamPost[];
		tournaments: Tournament[];
		timers: Timer[];
	}> => {
		const key = getCacheKey("stream-data", teamSlug, subteamId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.stream) &&
			get().stream[key]
		) {
			const streamKey = getCacheKey("stream", teamSlug, subteamId);
			const tournamentsKey = getCacheKey("tournaments", teamSlug, subteamId);
			const timersKey = getCacheKey("timers", teamSlug, subteamId);

			return {
				stream: get().stream[streamKey] || [],
				tournaments: get().tournaments[tournamentsKey] || [],
				timers: get().timers[timersKey] || [],
			};
		}

		const streamKey = getCacheKey("stream", teamSlug, subteamId);
		const tournamentsKey = getCacheKey("tournaments", teamSlug, subteamId);
		const timersKey = getCacheKey("timers", teamSlug, subteamId);

		set((state) => ({
			loading: {
				...state.loading,
				stream: { ...state.loading.stream, [streamKey]: true },
				tournaments: { ...state.loading.tournaments, [tournamentsKey]: true },
				timers: { ...state.loading.timers, [timersKey]: true },
			},
			errors: {
				...state.errors,
				stream: { ...state.errors.stream, [streamKey]: null },
				tournaments: { ...state.errors.tournaments, [tournamentsKey]: null },
				timers: { ...state.errors.timers, [timersKey]: null },
			},
		}));

		try {
			const { stream, tournaments, timers } = await fetchWithDeduplication(
				key,
				async () => {
					const [streamRes, tournamentsRes, timersRes] = await Promise.all([
						fetch(`/api/teams/${teamSlug}/stream?subteamId=${subteamId}`),
						fetch(`/api/teams/${teamSlug}/tournaments?subteamId=${subteamId}`),
						fetch(`/api/teams/${teamSlug}/timers?subteamId=${subteamId}`),
					]);

					if (!streamRes.ok) {
						throw new Error(`HTTP ${streamRes.status}`);
					}
					if (!tournamentsRes.ok) {
						throw new Error(`HTTP ${tournamentsRes.status}`);
					}
					if (!timersRes.ok) {
						throw new Error(`HTTP ${timersRes.status}`);
					}

					const [streamJson, tournamentsJson, timersJson] = await Promise.all([
						streamRes.json(),
						tournamentsRes.json(),
						timersRes.json(),
					]);

					return {
						stream: streamJson.posts || [],
						tournaments: tournamentsJson.events || [],
						timers: timersJson.timers || [],
					};
				},
			);

			set((state) => ({
				stream: { ...state.stream, [streamKey]: stream },
				tournaments: { ...state.tournaments, [tournamentsKey]: tournaments },
				timers: { ...state.timers, [timersKey]: timers },
				loading: {
					...state.loading,
					stream: { ...state.loading.stream, [streamKey]: false },
					tournaments: {
						...state.loading.tournaments,
						[tournamentsKey]: false,
					},
					timers: { ...state.loading.timers, [timersKey]: false },
				},
				cacheTimestamps: {
					...state.cacheTimestamps,
					[streamKey]: Date.now(),
					[tournamentsKey]: Date.now(),
					[timersKey]: Date.now(),
				},
			}));

			return { stream, tournaments, timers };
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchStreamData");
			set((state) => ({
				loading: {
					...state.loading,
					stream: { ...state.loading.stream, [streamKey]: false },
					tournaments: {
						...state.loading.tournaments,
						[tournamentsKey]: false,
					},
					timers: { ...state.loading.timers, [timersKey]: false },
				},
				errors: {
					...state.errors,
					stream: { ...state.errors.stream, [streamKey]: errorMessage },
					tournaments: {
						...state.errors.tournaments,
						[tournamentsKey]: errorMessage,
					},
					timers: { ...state.errors.timers, [timersKey]: errorMessage },
				},
			}));
			throw error;
		}
	};
};
