/**
 * Data Update Actions for Team Store
 */

import type {
	Assignment,
	RosterData,
	StreamPost,
	Subteam,
	TeamMember,
	TeamStoreActions,
	TeamStoreState,
	Timer,
} from "../types";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createUpdateActions = (
	_get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
): Partial<TeamStoreActions> => {
	const getCacheKey = (type: string, ...params: string[]) =>
		`${type}-${params.join("-")}`;

	const updateRoster = (
		teamSlug: string,
		subteamId: string,
		roster: RosterData,
	) => {
		const key = getCacheKey("roster", teamSlug, subteamId);
		set((state) => ({
			roster: { ...state.roster, [key]: roster },
			cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
		}));
	};

	const updateMembers = (
		teamSlug: string,
		subteamId: string,
		members: TeamMember[],
	) => {
		const key = getCacheKey("members", teamSlug, subteamId);
		set((state) => ({
			members: { ...state.members, [key]: members },
			cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
		}));
	};

	const updateSubteams = (teamSlug: string, subteams: Subteam[]) => {
		const key = getCacheKey("subteams", teamSlug);
		set((state) => ({
			subteams: { ...state.subteams, [key]: subteams },
			cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
		}));
	};

	const updateAssignments = (teamSlug: string, assignments: Assignment[]) => {
		const key = getCacheKey("assignments", teamSlug);
		set((state) => ({
			assignments: { ...state.assignments, [key]: assignments },
			cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
		}));
	};

	const addStreamPost = (
		teamSlug: string,
		subteamId: string,
		post: StreamPost,
	) => {
		const key = getCacheKey("stream", teamSlug, subteamId);
		set((state) => ({
			stream: {
				...state.stream,
				[key]: [post, ...(state.stream[key] || [])],
			},
		}));
	};

	const addAssignment = (teamSlug: string, assignment: Assignment) => {
		const key = getCacheKey("assignments", teamSlug);
		set((state) => ({
			assignments: {
				...state.assignments,
				[key]: [assignment, ...(state.assignments[key] || [])],
			},
		}));
	};

	const updateTimer = (teamSlug: string, subteamId: string, timer: Timer) => {
		const key = getCacheKey("timers", teamSlug, subteamId);
		set((state) => ({
			timers: {
				...state.timers,
				[key]: (state.timers[key] || []).map((t) =>
					t.id === timer.id ? timer : t,
				),
			},
		}));
	};

	const addSubteam = (teamSlug: string, subteam: Subteam) => {
		set((state) => ({
			subteams: {
				...state.subteams,
				[teamSlug]: [...(state.subteams[teamSlug] || []), subteam],
			},
			cacheTimestamps: {
				...state.cacheTimestamps,
				[getCacheKey("subteams", teamSlug)]: Date.now(),
			},
		}));
	};

	const updateSubteam = (
		teamSlug: string,
		subteamId: string,
		updates: Partial<Subteam>,
	) => {
		set((state) => ({
			subteams: {
				...state.subteams,
				[teamSlug]: (state.subteams[teamSlug] || []).map((subteam) =>
					subteam.id === subteamId ? { ...subteam, ...updates } : subteam,
				),
			},
			cacheTimestamps: {
				...state.cacheTimestamps,
				[getCacheKey("subteams", teamSlug)]: Date.now(),
			},
		}));
	};

	const deleteSubteam = (teamSlug: string, subteamId: string) => {
		set((state) => ({
			subteams: {
				...state.subteams,
				[teamSlug]: (state.subteams[teamSlug] || []).filter(
					(subteam) => subteam.id !== subteamId,
				),
			},
			cacheTimestamps: {
				...state.cacheTimestamps,
				[getCacheKey("subteams", teamSlug)]: Date.now(),
			},
		}));
	};

	return {
		updateRoster,
		updateMembers,
		updateSubteams,
		updateAssignments,
		addStreamPost,
		addAssignment,
		updateTimer,
		addSubteam,
		updateSubteam,
		deleteSubteam,
	};
};
