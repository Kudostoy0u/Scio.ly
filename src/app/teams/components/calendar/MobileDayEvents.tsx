"use client";

import React from "react";

interface CalendarEvent {
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
	created_by: string;
	team_id?: string;
}

interface RecurringMeeting {
	id: string;
	team_id: string;
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

interface MobileDayEventsProps {
	darkMode: boolean;
	date: Date;
	events: CalendarEvent[];
	recurringMeetings: RecurringMeeting[];
	onEventClick: (event: CalendarEvent) => void;
	onDeleteEvent: (eventId: string) => void;
	isEventBlacklisted?: (eventId: string) => boolean;
}

function getEventColors(type: string, darkMode: boolean): string {
	switch (type) {
		case "tournament":
			return darkMode
				? "bg-red-900/20 text-red-300 border-red-800"
				: "bg-red-100 text-red-800 border-red-200";
		case "practice":
			return darkMode
				? "bg-green-900/20 text-green-300 border-green-800"
				: "bg-green-100 text-green-800 border-green-200";
		case "meeting":
			return darkMode
				? "bg-blue-900/20 text-blue-300 border-blue-800"
				: "bg-blue-100 text-blue-800 border-blue-200";
		case "personal":
			return darkMode
				? "bg-green-900/20 text-green-300 border-green-800"
				: "bg-green-100 text-green-800 border-green-200";
		case "deadline":
			return darkMode
				? "bg-orange-900/20 text-orange-300 border-orange-800"
				: "bg-orange-100 text-orange-800 border-orange-200";
		default:
			return darkMode
				? "bg-gray-700/50 text-gray-200 border-gray-600"
				: "bg-gray-100 text-gray-800 border-gray-200";
	}
}

export default function MobileDayEvents({
	darkMode,
	date,
	events,
	recurringMeetings,
	onEventClick,
	onDeleteEvent,
	isEventBlacklisted,
}: MobileDayEventsProps) {
	const sameDayEvents = React.useMemo(() => {
		const dateStrParts = date.toISOString().split("T");
		const dateStr = dateStrParts[0];
		if (!dateStr) {
			return [];
		}
		const base = events.filter(
			(e) => new Date(e.start_time).toISOString().split("T")[0] === dateStr,
		);
		const dayOfWeek = date.getDay();
		const recurringToday: CalendarEvent[] = recurringMeetings
			.filter((m) => {
				if (
					!(Array.isArray(m.days_of_week) && m.days_of_week.includes(dayOfWeek))
				) {
					return false;
				}
				if (
					m.exceptions &&
					Array.isArray(m.exceptions) &&
					m.exceptions.includes(dateStr)
				) {
					return false;
				}
				if (m.start_date && dateStr < m.start_date) {
					return false;
				}
				if (m.end_date && dateStr > m.end_date) {
					return false;
				}
				const eventId = `recurring-${m.id}-${dateStr}`;
				if (isEventBlacklisted?.(eventId)) {
					return false;
				}
				return true;
			})
			.map((m) => ({
				id: `recurring-${m.id}-${dateStr}`,
				title: m.title,
				description: m.description,
				start_time: m.start_time
					? `${dateStr}T${m.start_time}`
					: `${dateStr}T00:00:00`,
				end_time: m.end_time ? `${dateStr}T${m.end_time}` : undefined,
				location: m.location,
				event_type: "meeting" as const,
				is_all_day: !(m.start_time && m.end_time),
				is_recurring: true,
				created_by: m.created_by || "",
				team_id: m.team_id,
			}));

		return [...base, ...recurringToday].sort(
			(a, b) =>
				new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
		);
	}, [events, recurringMeetings, date, isEventBlacklisted]);

	if (sameDayEvents.length === 0) {
		return (
			<div
				className={`rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"} p-4 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
			>
				No events on this day.
			</div>
		);
	}

	// Helper function to get event type badge classes
	const getEventTypeBadgeClasses = (eventType: string) => {
		const baseClasses = "px-2 py-1 text-xs rounded-full";

		switch (eventType) {
			case "tournament":
				return `${baseClasses} ${darkMode ? "bg-red-800 text-red-200" : "bg-red-200 text-red-800"}`;
			case "practice":
				return `${baseClasses} ${
					darkMode
						? "bg-green-800 text-green-200"
						: "bg-green-200 text-green-800"
				}`;
			case "meeting":
				return `${baseClasses} ${
					darkMode ? "bg-blue-800 text-blue-200" : "bg-blue-200 text-blue-800"
				}`;
			case "personal":
				return `${baseClasses} ${
					darkMode
						? "bg-green-800 text-green-200"
						: "bg-green-200 text-green-800"
				}`;
			case "deadline":
				return `${baseClasses} ${
					darkMode
						? "bg-orange-800 text-orange-200"
						: "bg-orange-200 text-orange-800"
				}`;
			default:
				return `${baseClasses} ${
					darkMode ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-800"
				}`;
		}
	};

	return (
		<div className="space-y-3">
			{sameDayEvents.map((event) => (
				<button
					type="button"
					key={event.id}
					className={`w-full text-left p-4 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${getEventColors(event.event_type, darkMode)}`}
					onClick={() => onEventClick(event)}
				>
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<div className="flex items-center gap-3 mb-2">
								<h4 className="font-semibold text-base">{event.title}</h4>
								<span className={getEventTypeBadgeClasses(event.event_type)}>
									{event.event_type.charAt(0).toUpperCase() +
										event.event_type.slice(1)}
								</span>
							</div>
							<div className="grid grid-cols-1 gap-2 text-sm">
								{event.start_time && (
									<div className="flex items-center gap-2">
										<span className="font-medium">Time:</span>
										<span>
											{new Date(event.start_time).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
											{event.end_time &&
												` - ${new Date(event.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
										</span>
									</div>
								)}
								{event.location && (
									<div className="flex items-center gap-2">
										<span className="font-medium">Location:</span>
										<span>{event.location}</span>
									</div>
								)}
								{event.description && (
									<div className="flex items-start gap-2">
										<span className="font-medium">Description:</span>
										<span className="flex-1">{event.description}</span>
									</div>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteEvent(event.id);
							}}
							className={`ml-4 p-2 rounded-full transition-colors ${darkMode ? "text-red-400 hover:bg-red-900/30 hover:text-red-300" : "text-red-500 hover:bg-red-100 hover:text-red-700"}`}
							title="Delete event"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Delete event</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</button>
			))}
		</div>
	);
}
