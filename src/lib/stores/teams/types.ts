/**
 * Team Store Type Definitions
 */

export interface UserTeam {
	id: string;
	slug: string;
	school: string;
	division: "B" | "C";
	user_role: string;
	name: string;
}

export interface Subteam {
	id: string;
	name: string;
	team_id: string;
	description: string;
	created_at: string;
}

export interface TeamMember {
	id: string | null;
	name: string | null;
	email: string | null;
	role: string;
	events: string[];
	isPendingInvitation: boolean;
	subteamId?: string;
	isUnlinked?: boolean;
	username?: string | null;
	subteam?: {
		id: string;
		name: string;
		description: string;
	};
	joinedAt?: string | null;
	isCreator?: boolean;
}

export interface RosterData {
	roster: Record<string, string[]>;
	removed_events: string[];
}

export interface StreamComment {
	id: string;
	post_id: string;
	author_name: string;
	author_email: string;
	content: string;
	created_at: string;
}

export interface StreamPost {
	id: string;
	content: string;
	show_tournament_timer: boolean;
	tournament_id: string | null;
	tournament_title: string | null;
	tournament_start_time: string | null;
	author_name: string;
	author_email: string;
	created_at: string;
	attachment_url: string | null;
	attachment_title: string | null;
	comments: StreamComment[];
	// Legacy fields for backward compatibility
	author?: string;
	title?: string;
	type?: string;
}

export interface Assignment {
	id: string;
	title: string;
	description: string;
	due_date: string;
	assigned_to: string[];
	created_by: string;
	created_at: string;
}

export interface Tournament {
	id: string;
	title: string;
	start_time: string;
	location: string | null;
	event_type: string;
	has_timer: boolean;
}

export interface Timer {
	id: string;
	title: string;
	start_time: string;
	location: string | null;
	event_type: string;
	added_at: string;
}

export interface TeamStoreState {
	userTeams: UserTeam[];
	subteams: Record<string, Subteam[]>;
	roster: Record<string, RosterData>;
	members: Record<string, TeamMember[]>;
	stream: Record<string, StreamPost[]>;
	assignments: Record<string, Assignment[]>;
	tournaments: Record<string, Tournament[]>;
	timers: Record<string, Timer[]>;

	loading: {
		userTeams: boolean;
		subteams: Record<string, boolean>;
		roster: Record<string, boolean>;
		members: Record<string, boolean>;
		stream: Record<string, boolean>;
		assignments: Record<string, boolean>;
		tournaments: Record<string, boolean>;
		timers: Record<string, boolean>;
	};

	errors: {
		userTeams: string | null;
		subteams: Record<string, string | null>;
		roster: Record<string, string | null>;
		members: Record<string, string | null>;
		stream: Record<string, string | null>;
		assignments: Record<string, string | null>;
		tournaments: Record<string, string | null>;
		timers: Record<string, string | null>;
	};

	inflightRequests: Set<string>;
	cacheTimestamps: Record<string, number>;
}

export interface TeamStoreActions {
	// Data fetching
	fetchUserTeams: (userId: string) => Promise<UserTeam[]>;
	fetchSubteams: (teamSlug: string) => Promise<Subteam[]>;
	fetchRoster: (teamSlug: string, subteamId: string) => Promise<RosterData>;
	fetchMembers: (teamSlug: string, subteamId?: string) => Promise<TeamMember[]>;
	fetchStream: (teamSlug: string, subteamId: string) => Promise<StreamPost[]>;
	fetchAssignments: (teamSlug: string) => Promise<Assignment[]>;
	fetchTournaments: (
		teamSlug: string,
		subteamId: string,
	) => Promise<Tournament[]>;
	fetchTimers: (teamSlug: string, subteamId: string) => Promise<Timer[]>;

	fetchStreamData: (
		teamSlug: string,
		subteamId: string,
	) => Promise<{
		stream: StreamPost[];
		tournaments: Tournament[];
		timers: Timer[];
	}>;

	// Data updates
	updateRoster: (
		teamSlug: string,
		subteamId: string,
		roster: RosterData,
	) => void;
	updateMembers: (
		teamSlug: string,
		subteamId: string,
		members: TeamMember[],
	) => void;
	updateSubteams: (teamSlug: string, subteams: Subteam[]) => void;
	updateAssignments: (teamSlug: string, assignments: Assignment[]) => void;

	// Cache management
	clearCache: (type: string, ...params: string[]) => void;
	clearAllCache: () => void;

	// Data mutations
	addStreamPost: (
		teamSlug: string,
		subteamId: string,
		post: StreamPost,
	) => void;
	addAssignment: (teamSlug: string, assignment: Assignment) => void;
	updateTimer: (teamSlug: string, subteamId: string, timer: Timer) => void;
	addSubteam: (teamSlug: string, subteam: Subteam) => void;
	updateSubteam: (
		teamSlug: string,
		subteamId: string,
		updates: Partial<Subteam>,
	) => void;
	deleteSubteam: (teamSlug: string, subteamId: string) => void;
	invalidateCache: (key?: string) => void;
	preloadData: (userId: string, teamSlug?: string) => Promise<void>;

	getCacheKey: (type: string, ...params: string[]) => string;
	isDataFresh: (key: string, maxAge?: number) => boolean;

	addRosterEntry: (
		teamSlug: string,
		subteamId: string,
		eventName: string,
		slotIndex: number,
		studentName: string,
	) => void;
	removeRosterEntry: (
		teamSlug: string,
		subteamId: string,
		eventName: string,
		slotIndex: number,
	) => void;

	addMemberEvent: (
		teamSlug: string,
		subteamId: string,
		memberId: string | null,
		memberName: string,
		eventName: string,
	) => void;
	removeMemberEvent: (
		teamSlug: string,
		subteamId: string,
		memberId: string | null,
		memberName: string,
		eventName: string,
	) => void;
}

export const CACHE_DURATIONS = {
	userTeams: 5 * 60 * 1000, // 5 minutes
	subteams: 10 * 60 * 1000, // 10 minutes
	roster: 5 * 60 * 1000, // 5 minutes
	members: 2 * 60 * 1000, // 2 minutes
	stream: 2 * 60 * 1000, // 2 minutes
	assignments: 3 * 60 * 1000, // 3 minutes
	tournaments: 5 * 60 * 1000, // 5 minutes
	timers: 1 * 60 * 1000, // 1 minute
} as const;
