import type { TeamStoreActions, TeamStoreState } from "../../types";
import { createFetchMembersAction } from "./fetchMembers";
import { createFetchRosterAction } from "./fetchRoster";
import {
	createFetchAssignmentsAction,
	createFetchStreamAction,
	createFetchTimersAction,
	createFetchTournamentsAction,
} from "./fetchSimpleData";
import { createFetchStreamDataAction } from "./fetchStreamData";
import { createFetchSubteamsAction } from "./fetchSubteams";
import { createFetchUserTeamsAction } from "./fetchUserTeams";

type StoreSlice = TeamStoreState & TeamStoreActions;

export const createFetchActions = (
	get: () => StoreSlice,
	set: (
		partial: Partial<StoreSlice> | ((state: StoreSlice) => Partial<StoreSlice>),
	) => void,
): Partial<TeamStoreActions> => {
	return {
		fetchUserTeams: createFetchUserTeamsAction(get, set),
		fetchSubteams: createFetchSubteamsAction(get, set),
		fetchRoster: createFetchRosterAction(get, set),
		fetchMembers: createFetchMembersAction(get, set),
		fetchStream: createFetchStreamAction(get, set),
		fetchAssignments: createFetchAssignmentsAction(get, set),
		fetchTournaments: createFetchTournamentsAction(get, set),
		fetchTimers: createFetchTimersAction(get, set),
		fetchStreamData: createFetchStreamDataAction(get, set),
	};
};
