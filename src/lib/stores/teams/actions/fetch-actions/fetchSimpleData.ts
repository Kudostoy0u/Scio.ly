import type {
	Assignment,
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

export const createFetchStreamAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string, subteamId: string): Promise<StreamPost[]> => {
		const key = getCacheKey("stream", teamSlug, subteamId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.stream) &&
			get().stream[key]
		) {
			return get().stream[key] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				stream: { ...state.loading.stream, [key]: true },
			},
			errors: {
				...state.errors,
				stream: { ...state.errors.stream, [key]: null },
			},
		}));

		try {
			const stream = await fetchWithDeduplication(key, async () => {
				const response = await fetch(
					`/api/teams/${teamSlug}/stream?subteamId=${subteamId}`,
				);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const result = await response.json();
				return (result.posts || []) as StreamPost[];
			});

			const finalStream: StreamPost[] = stream || [];

			set((state) => ({
				stream: { ...state.stream, [key]: finalStream },
				loading: {
					...state.loading,
					stream: { ...state.loading.stream, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return finalStream;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchStream");
			set((state) => ({
				loading: {
					...state.loading,
					stream: { ...state.loading.stream, [key]: false },
				},
				errors: {
					...state.errors,
					stream: { ...state.errors.stream, [key]: errorMessage },
				},
			}));
			throw error;
		}
	};
};

export const createFetchAssignmentsAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string): Promise<Assignment[]> => {
		const key = getCacheKey("assignments", teamSlug);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.assignments) &&
			get().assignments[key]
		) {
			return get().assignments[key] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				assignments: { ...state.loading.assignments, [key]: true },
			},
			errors: {
				...state.errors,
				assignments: { ...state.errors.assignments, [key]: null },
			},
		}));

		try {
			const assignments = await fetchWithDeduplication(key, async () => {
				const response = await fetch("/api/trpc/teams.getAssignments", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						json: { teamSlug },
						meta: { values: { teamSlug: [undefined] } },
					}),
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const result = await response.json();
				return (result.result?.data?.assignments || []) as Assignment[];
			});

			const finalAssignments: Assignment[] = assignments || [];

			set((state) => ({
				assignments: { ...state.assignments, [key]: finalAssignments },
				loading: {
					...state.loading,
					assignments: { ...state.loading.assignments, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return finalAssignments;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchAssignments");
			set((state) => ({
				loading: {
					...state.loading,
					assignments: { ...state.loading.assignments, [key]: false },
				},
				errors: {
					...state.errors,
					assignments: { ...state.errors.assignments, [key]: errorMessage },
				},
			}));
			throw error;
		}
	};
};

export const createFetchTournamentsAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string, subteamId: string): Promise<Tournament[]> => {
		const key = getCacheKey("tournaments", teamSlug, subteamId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.tournaments) &&
			get().tournaments[key]
		) {
			return get().tournaments[key] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				tournaments: { ...state.loading.tournaments, [key]: true },
			},
			errors: {
				...state.errors,
				tournaments: { ...state.errors.tournaments, [key]: null },
			},
		}));

		try {
			const tournaments = await fetchWithDeduplication(key, async () => {
				const response = await fetch(
					`/api/teams/${teamSlug}/tournaments?subteamId=${subteamId}`,
				);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const result = await response.json();
				return (result.events || []) as Tournament[];
			});

			const finalTournaments: Tournament[] = tournaments || [];

			set((state) => ({
				tournaments: { ...state.tournaments, [key]: finalTournaments },
				loading: {
					...state.loading,
					tournaments: { ...state.loading.tournaments, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return finalTournaments;
		} catch (error) {
			const _errorMessage = handleApiError(error, "fetchTournaments");
			set((state) => ({
				loading: {
					...state.loading,
					tournaments: { ...state.loading.tournaments, [key]: false },
				},
				errors: {
					...state.errors,
					tournaments: { ...state.errors.tournaments, [key]: _errorMessage },
				},
			}));
			throw error;
		}
	};
};

export const createFetchTimersAction = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
) => {
	return async (teamSlug: string, subteamId: string): Promise<Timer[]> => {
		const key = getCacheKey("timers", teamSlug, subteamId);

		if (
			isDataFresh(get().cacheTimestamps[key], CACHE_DURATIONS.timers) &&
			get().timers[key]
		) {
			return get().timers[key] || [];
		}

		set((state) => ({
			loading: {
				...state.loading,
				timers: { ...state.loading.timers, [key]: true },
			},
			errors: {
				...state.errors,
				timers: { ...state.errors.timers, [key]: null },
			},
		}));

		try {
			const timers = await fetchWithDeduplication(key, async () => {
				const response = await fetch(
					`/api/teams/${teamSlug}/timers?subteamId=${subteamId}`,
				);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const result = await response.json();
				return (result.timers || []) as Timer[];
			});

			const finalTimers: Timer[] = timers || [];

			set((state) => ({
				timers: { ...state.timers, [key]: finalTimers },
				loading: {
					...state.loading,
					timers: { ...state.loading.timers, [key]: false },
				},
				cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
			}));

			return finalTimers;
		} catch (error) {
			const errorMessage = handleApiError(error, "fetchTimers");
			set((state) => ({
				loading: {
					...state.loading,
					timers: { ...state.loading.timers, [key]: false },
				},
				errors: {
					...state.errors,
					timers: { ...state.errors.timers, [key]: errorMessage },
				},
			}));
			throw error;
		}
	};
};
