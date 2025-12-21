export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					email: string;
					username: string;
					display_name: string | null;
					photo_url: string | null;
					team_code: string | null;
					created_at: string;
				};
				Insert: {
					id: string;
					email: string;
					username: string;
					display_name?: string | null;
					photo_url?: string | null;
					team_code?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					email?: string;
					username?: string;
					display_name?: string | null;
					photo_url?: string | null;
					team_code?: string | null;
					created_at?: string;
				};
			};
			user_stats: {
				Row: {
					id: string;
					user_id: string;
					date: string;
					questions_attempted: number;
					correct_answers: number;
					events_practiced: string[];
					event_questions: Record<string, number>;
					game_points: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					date: string;
					questions_attempted?: number;
					correct_answers?: number;
					events_practiced?: string[];
					event_questions?: Record<string, number>;
					game_points?: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					date?: string;
					questions_attempted?: number;
					correct_answers?: number;
					events_practiced?: string[];
					event_questions?: Record<string, number>;
					game_points?: number;
					created_at?: string;
				};
			};
			bookmarks: {
				Row: {
					id: string;
					user_id: string;
					question_data: Record<string, unknown>;
					event_name: string;
					source: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					question_data: Record<string, unknown>;
					event_name: string;
					source: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					question_data?: Record<string, unknown>;
					event_name?: string;
					source?: string;
					created_at?: string;
				};
			};
			game_points: {
				Row: {
					id: string;
					user_id: string;
					points: number;
					source: string;
					description: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					points: number;
					source: string;
					description?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					points?: number;
					source?: string;
					description?: string | null;
					created_at?: string;
				};
			};
			notifications: {
				Row: {
					id: string;
					user_id: string;
					notification_type: string;
					title: string;
					message: string;
					data: Record<string, unknown>;
					is_read: boolean;
					created_at: string;
					read_at: string | null;
					team_id: string | null;
					team_name: string | null;
				};
				Insert: {
					id?: string;
					user_id: string;
					notification_type: string;
					title: string;
					message: string;
					data?: Record<string, unknown>;
					is_read?: boolean;
					created_at?: string;
					read_at?: string | null;
					team_id?: string | null;
					team_name?: string | null;
				};
				Update: {
					id?: string;
					user_id?: string;
					notification_type?: string;
					title?: string;
					message?: string;
					data?: Record<string, unknown>;
					is_read?: boolean;
					created_at?: string;
					read_at?: string | null;
					team_id?: string | null;
					team_name?: string | null;
				};
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
	};
}
