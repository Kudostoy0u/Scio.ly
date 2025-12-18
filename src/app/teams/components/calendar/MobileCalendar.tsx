"use client";

import React from "react";

interface CalendarEvent {
	id: string;
	title: string;
	start_time: string;
	end_time?: string;
	event_type:
		| "practice"
		| "tournament"
		| "meeting"
		| "deadline"
		| "other"
		| "personal";
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

interface MobileCalendarProps {
	darkMode: boolean;
	currentDate: Date;
	events: CalendarEvent[];
	recurringMeetings: RecurringMeeting[];
	selectedDate: Date;
	onSelectDate: (date: Date) => void;
	isEventBlacklisted?: (eventId: string) => boolean;
}

const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

function getEventColor(type: string, darkMode: boolean): string {
	switch (type) {
		case "tournament":
			return darkMode ? "bg-red-500" : "bg-red-500";
		case "practice":
			return darkMode ? "bg-green-500" : "bg-green-500";
		case "meeting":
			return darkMode ? "bg-blue-500" : "bg-blue-500";
		case "deadline":
			return darkMode ? "bg-orange-500" : "bg-orange-500";
		case "personal":
			return darkMode ? "bg-emerald-500" : "bg-emerald-500";
		default:
			return darkMode ? "bg-gray-400" : "bg-gray-400";
	}
}

export default function MobileCalendar({
	darkMode,
	currentDate,
	events,
	recurringMeetings,
	selectedDate,
	onSelectDate,
	isEventBlacklisted,
}: MobileCalendarProps) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const firstDay = new Date(year, month, 1);
	const startDate = new Date(firstDay);
	startDate.setDate(startDate.getDate() - firstDay.getDay());

	const days: Date[] = [];
	const cursor = new Date(startDate);
	for (let i = 0; i < 42; i++) {
		days.push(new Date(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	const eventsByDate: Record<string, CalendarEvent[]> = React.useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {};
		for (const evt of events) {
			const eventDate = new Date(evt.start_time);
			const year = eventDate.getFullYear();
			const month = String(eventDate.getMonth() + 1).padStart(2, "0");
			const day = String(eventDate.getDate()).padStart(2, "0");
			const d = `${year}-${month}-${day}`;
			if (!map[d]) {
				map[d] = [];
			}
			map[d].push(evt);
		}
		// include recurring as dots as generic meetings
		// dots are rendered per actual day cell by checking dayOfWeek; handled inline
		return map;
	}, [events]);

	const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
	const isCurrentMonth = (d: Date) => d.getMonth() === month;

	return (
		<div
			className={`rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"} overflow-hidden md:hidden`}
		>
			{/* Day headers */}
			<div
				className={`${darkMode ? "bg-gray-800" : "bg-gray-50"} grid grid-cols-7`}
			>
				{dayNamesShort.map((d, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Static array
						key={`${d}-${i}`}
						className={`p-2 text-center text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						{d}
					</div>
				))}
			</div>
			{/* Grid */}
			<div className="grid grid-cols-7 grid-rows-6">
				{days.map((date, _idx) => {
					const dateStrParts = date.toISOString().split("T");
					const dateStr = dateStrParts[0];
					if (!dateStr) {
						return null;
					}
					const dayOfWeek = date.getDay();

					// Collect dot types for this date
					const baseEvents = eventsByDate[dateStr] || [];
					const recurringToday = recurringMeetings
						.filter((m) => {
							if (
								!(
									Array.isArray(m.days_of_week) &&
									m.days_of_week.includes(dayOfWeek)
								)
							) {
								return false;
							}
							const ds = dateStr;
							if (
								m.exceptions &&
								Array.isArray(m.exceptions) &&
								m.exceptions.includes(ds)
							) {
								return false;
							}
							if (m.start_date && ds < m.start_date) {
								return false;
							}
							if (m.end_date && ds > m.end_date) {
								return false;
							}
							const eventId = `recurring-${m.id}-${ds}`;
							if (isEventBlacklisted?.(eventId)) {
								return false;
							}
							return true;
						})
						.map(() => ({ event_type: "meeting" as const }));

					const dotTypes = [
						...baseEvents.map((e: CalendarEvent) => e.event_type),
						...recurringToday.map(
							(e: { event_type: "meeting" }) => e.event_type,
						),
					].slice(0, 4);

					const selected = isSameDay(date, selectedDate);

					return (
						<button
							type="button"
							key={dateStr}
							onClick={() => onSelectDate(date)}
							className={`h-16 p-1 border-r border-b text-left ${
								darkMode ? "border-gray-700" : "border-gray-200"
							} ${isCurrentMonth(date) ? "" : darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-400"} ${
								selected
									? darkMode
										? "ring-1 ring-blue-500"
										: "ring-1 ring-blue-500"
									: ""
							}`}
						>
							<div className="flex items-center justify-between">
								<span
									className={`text-xs font-medium ${
										selected
											? "text-blue-500"
											: isCurrentMonth(date)
												? (darkMode ? "text-white" : "text-gray-900")
												: (darkMode ? "text-gray-500" : "text-gray-400")
									}`}
								>
									{date.getDate()}
								</span>
							</div>
							<div className="mt-1 flex flex-wrap gap-1">
								{dotTypes.map((t, i) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: Order doesn't change
										key={`${t}-${i}`}
										className={`w-1.5 h-1.5 rounded-full ${getEventColor(t, darkMode)}`}
									/>
								))}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
