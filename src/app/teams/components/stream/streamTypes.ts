// Types for Stream components

export interface Event {
	id: string;
	title: string;
	start_time: string;
	location: string | null;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "personal"
		| "other";
	has_timer?: boolean;
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
	attachment_url?: string | null;
	attachment_title?: string | null;
	comments?: StreamComment[];
}

export interface StreamComment {
	id: string;
	post_id: string;
	content: string;
	author_name: string;
	author_email: string;
	created_at: string;
}

export interface TimeRemaining {
	months: number;
	weeks: number;
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

export interface Team {
	id: string;
	school: string;
	division: "B" | "C";
	slug: string;
}

export interface EventType {
	value: string;
	label: string;
	color: string;
}

export const EVENT_TYPES: EventType[] = [
	{
		value: "tournament",
		label: "Tournament",
		color: "bg-blue-100 text-blue-800",
	},
	{
		value: "practice",
		label: "Practice",
		color: "bg-green-100 text-green-800",
	},
	{
		value: "meeting",
		label: "Meeting",
		color: "bg-purple-100 text-purple-800",
	},
	{ value: "deadline", label: "Deadline", color: "bg-red-100 text-red-800" },
	{
		value: "personal",
		label: "Personal",
		color: "bg-yellow-100 text-yellow-800",
	},
	{ value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
];
