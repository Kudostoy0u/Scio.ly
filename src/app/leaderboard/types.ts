/**
 * Type definitions for leaderboard components
 */

export interface Leaderboard {
	id: string;
	name: string;
	description: string;
	is_public: boolean;
	join_code: string | null;
	reset_frequency: string;
	created_by: string;
	member_count?: number;
}

export interface LeaderboardMember {
	user_id: string;
	display_name: string | null;
	email: string;
	photo_url: string | null;
	questions_attempted: number;
	correct_answers: number;
	accuracy_percentage: number;
	rank?: number;
}

export interface UserProfile {
	id: string;
	email: string;
	display_name?: string | null;
}
