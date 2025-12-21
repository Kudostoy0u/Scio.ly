"use client";

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
	recurrence_pattern?: Record<string, unknown>;
	created_by: string;
	team_id?: string;
	attendees?: Array<{
		user_id: string;
		status: "pending" | "attending" | "declined" | "tentative";
		name: string;
		email: string;
	}>;
}

interface PracticeEvent {
	id: string;
	title: string;
	description?: string;
	start_time: string;
	end_time?: string;
	location?: string;
	is_all_day: boolean;
	is_recurring: boolean;
	created_by: string;
	team_id?: string;
}

interface RecurringMeeting {
	id: string;
	team_id?: string;
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

interface EventListProps {
	darkMode: boolean;
	events: CalendarEvent[];
	recurringMeetings: RecurringMeeting[];
	eventTypeFilter: string;
	referenceDate: Date;
	onEventClick: (event: CalendarEvent) => void;
	onDeleteEvent: (eventId: string) => void;
	title?: string;
	hideHeader?: boolean;
	hideEmptyState?: boolean;
}

export default function EventList({
	darkMode,
	events,
	recurringMeetings,
	eventTypeFilter,
	referenceDate,
	onEventClick,
	onDeleteEvent,
	title = "Upcoming Events",
	hideHeader = false,
	hideEmptyState = false,
}: EventListProps) {
	const getEventColors = (type: string) => {
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
	};

	// Helper function to check if a recurring event should be included
	const shouldIncludeRecurringEvent = (
		meeting: RecurringMeeting,
		dateStr: string,
		dayOfWeek: number,
	) => {
		if (
			!(
				Array.isArray(meeting.days_of_week) &&
				meeting.days_of_week.includes(dayOfWeek)
			)
		) {
			return false;
		}

		if (
			meeting.exceptions &&
			Array.isArray(meeting.exceptions) &&
			meeting.exceptions.includes(dateStr)
		) {
			return false;
		}

		if (meeting.start_date && dateStr < meeting.start_date) {
			return false;
		}

		if (meeting.end_date && dateStr > meeting.end_date) {
			return false;
		}

		return true;
	};

	// Helper function to create a recurring event object
	const createRecurringEvent = (
		meeting: RecurringMeeting,
		dateStr: string,
		eventId: string,
	) => {
		const startTime = meeting.start_time
			? `${dateStr}T${meeting.start_time}`
			: `${dateStr}T00:00:00`;
		const endTime = meeting.end_time
			? `${dateStr}T${meeting.end_time}`
			: undefined;

		return {
			id: eventId,
			title: meeting.title,
			description: meeting.description,
			start_time: startTime,
			end_time: endTime,
			location: meeting.location,
			event_type: "meeting" as const,
			is_all_day: !(meeting.start_time && meeting.end_time),
			is_recurring: true,
			recurrence_pattern: {
				days_of_week: meeting.days_of_week,
				start_date: meeting.start_date,
				end_date: meeting.end_date,
				exceptions: meeting.exceptions,
			},
			created_by: meeting.created_by || "",
			team_id: meeting.team_id,
			attendees: [],
		};
	};

	// Helper function to generate recurring events for a specific month
	const generateRecurringEventsForMonth = (
		targetYear: number,
		targetMonth: number,
	) => {
		const recurringEvents: CalendarEvent[] = [];
		const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(targetYear, targetMonth, day);
			const dayOfWeek = date.getDay();
			const dateStr = date.toISOString().split("T")[0];

			if (!dateStr) {
				continue;
			}

			for (const meeting of recurringMeetings) {
				if (!shouldIncludeRecurringEvent(meeting, dateStr, dayOfWeek)) {
					continue;
				}

				const eventId = `recurring-${meeting.id}-${dateStr}`;

				recurringEvents.push(createRecurringEvent(meeting, dateStr, eventId));
			}
		}

		return recurringEvents;
	};

	// Helper function to filter and sort events
	const filterAndSortEvents = (allEvents: CalendarEvent[]) => {
		const filtered =
			eventTypeFilter === "all"
				? allEvents
				: allEvents.filter((event) => event.event_type === eventTypeFilter);

		return filtered.sort(
			(a, b) =>
				new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
		);
	};

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

	// Helper function to format event time
	const formatEventTime = (event: CalendarEvent | PracticeEvent) => {
		const startTime = new Date(event.start_time).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});

		if (event.end_time) {
			const endTime = new Date(event.end_time).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			return `${startTime} - ${endTime}`;
		}

		return startTime;
	};

	// Helper function to handle event click
	const handleEventClick = (event: CalendarEvent | PracticeEvent) => {
		if ("event_type" in event) {
			onEventClick(event as CalendarEvent);
		}
	};

	// Get filtered events for list view
	const getFilteredEvents = () => {
		const currentMonth = referenceDate.getMonth();
		const currentYear = referenceDate.getFullYear();

		// Generate recurring events for the selected month
		const currentMonthEvents = generateRecurringEventsForMonth(
			currentYear,
			currentMonth,
		);
		const recurringEvents = [...currentMonthEvents];

		const allEvents = [...events, ...recurringEvents];
		return filterAndSortEvents(allEvents);
	};

	const filteredEvents = getFilteredEvents();
	const uniqueEvents = new Map<string, CalendarEvent>();
	for (const event of filteredEvents) {
		const key = `${event.id}-${event.start_time}`;
		if (!uniqueEvents.has(key)) {
			uniqueEvents.set(key, event);
		}
	}
	const dedupedEvents = Array.from(uniqueEvents.values());

	return (
		<div
			className={`rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"} h-[600px] overflow-y-auto`}
		>
			<div className="p-4">
				{!hideHeader && (
					<h3
						className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
					>
						{title}
					</h3>
				)}
				{dedupedEvents.length === 0 ? (
					hideEmptyState ? null : (
						<div
							className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							No events found for the selected filter.
						</div>
					)
				) : (
					<div className="space-y-3">
						{dedupedEvents.map((event, index) => {
							const eventType =
								"event_type" in event ? event.event_type : "practice";
							// Create a unique key that combines event.id with index and start_time to ensure uniqueness
							const uniqueKey = `${event.id}-${event.start_time}-${index}`;

							return (
								<button
									type="button"
									key={uniqueKey}
									className={`w-full text-left p-4 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${getEventColors(eventType)}`}
									onClick={() => handleEventClick(event)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h4 className="font-semibold text-lg">{event.title}</h4>
												<span className={getEventTypeBadgeClasses(eventType)}>
													{eventType.charAt(0).toUpperCase() +
														eventType.slice(1)}
												</span>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
												<div className="flex items-center gap-2">
													<span className="font-medium">Date:</span>
													<span>
														{new Date(event.start_time).toLocaleDateString()}
													</span>
												</div>

												{event.start_time && (
													<div className="flex items-center gap-2">
														<span className="font-medium">Time:</span>
														<span>{formatEventTime(event)}</span>
													</div>
												)}

												{event.location && (
													<div className="flex items-center gap-2">
														<span className="font-medium">Location:</span>
														<span>{event.location}</span>
													</div>
												)}

												{event.description && (
													<div className="flex items-start gap-2 md:col-span-2">
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
											className={`ml-4 p-2 rounded-full transition-colors cursor-pointer ${
												darkMode
													? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
													: "text-red-500 hover:bg-red-100 hover:text-red-700"
											}`}
											title="Delete event"
											aria-label="Delete event"
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
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
