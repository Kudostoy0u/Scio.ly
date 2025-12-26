// Calendar utility functions

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	start_time: string;
	end_time?: string;
	location?: string;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "other"
		| "personal";
	is_all_day: boolean;
	is_recurring: boolean;
	recurrence_pattern?: Record<string, unknown>;
	created_by: string;
	owner_user_id?: string | null;
	team_id?: string;
	subteam_id?: string;
	attendees?: Array<{
		user_id: string;
		status: "pending" | "attending" | "declined" | "tentative";
		name: string;
		email: string;
	}>;
}

export interface RecurringMeeting {
	id: string;
	team_id?: string;
	subteam_id?: string;
	days_of_week: number[];
	start_time: string;
	end_time: string;
	start_date: string;
	end_date?: string;
	title: string;
	description?: string;
	location?: string;
	exceptions: string[];
	created_by?: string;
}

export interface EventForm {
	title: string;
	description: string;
	date: string;
	start_time: string;
	end_time: string;
	location: string;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "other"
		| "personal";
	is_all_day: boolean;
	is_recurring: boolean;
	recurrence_pattern: Record<string, unknown>;
	meeting_type: "personal" | "team";
	selected_team_id: string;
	selected_subteam_id: string;
}

export interface RecurringForm {
	title: string;
	description: string;
	location: string;
	days_of_week: number[];
	start_time: string;
	end_time: string;
	start_date: string;
	end_date: string;
	exceptions: string[];
	meeting_type: "personal" | "team";
	selected_team_id: string;
	selected_subteam_id: string;
}

export interface UserTeam {
	id: string;
	name: string;
	slug: string;
	school: string;
	division?: "B" | "C";
	user_role: string;
	team_id: string;
	subteams?: Array<{
		id: string;
		name: string;
	}>;
}

// Get team options for dropdowns
// Default form values
export const getDefaultEventForm = (): EventForm => ({
	title: "",
	description: "",
	date: "",
	start_time: "",
	end_time: "",
	location: "",
	event_type: "practice",
	is_all_day: false,
	is_recurring: false,
	recurrence_pattern: {},
	meeting_type: "personal",
	selected_team_id: "",
	selected_subteam_id: "",
});

export const getDefaultRecurringForm = (): RecurringForm => ({
	title: "",
	description: "",
	location: "",
	days_of_week: [],
	start_time: "",
	end_time: "",
	start_date: "",
	end_date: "",
	exceptions: [],
	meeting_type: "personal",
	selected_team_id: "",
	selected_subteam_id: "",
});
