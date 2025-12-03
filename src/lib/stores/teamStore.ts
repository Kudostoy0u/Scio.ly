/**
 * Unified Team Data Store
 *
 * Re-exports from the modular team store implementation.
 * This file maintains backward compatibility for existing imports.
 */
export { useTeamStore } from "./teams";

// Re-export types with original names for backward compatibility
export type {
	UserTeam,
	Subteam,
	TeamMember,
	RosterData,
	StreamPost,
	StreamComment,
	Assignment,
	Tournament,
	Timer,
} from "./teams/types";

// Re-export with aliases for backward compatibility
export type {
	UserTeam as TeamUserTeam,
	Subteam as TeamSubteam,
	TeamMember as TeamMemberType,
	RosterData as TeamRosterData,
	StreamPost as TeamStreamPost,
	StreamComment as TeamStreamComment,
	Assignment as TeamAssignment,
	Tournament as TeamTournament,
	Timer as TeamTimer,
} from "./teams/types";

export type { TeamStoreState, TeamStoreActions } from "./teams/types";
