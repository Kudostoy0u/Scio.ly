"use client";

import { useAuth } from "@/app/contexts/authContext";
import { useTheme } from "@/app/contexts/themeContext";
import { useState } from "react";
import {
	createEvent,
	createRecurringMeeting,
	deleteEvent,
} from "./TeamCalendar/handlers/eventHandlers";
import { useCalendarData } from "./TeamCalendar/hooks/useCalendarData";
import { getLocalDateString } from "./TeamCalendar/utils/dateUtils";
import { isEventBlacklisted } from "./TeamCalendar/utils/eventFilters";
import CalendarGrid from "./calendar/CalendarGrid";
import CalendarHeader from "./calendar/CalendarHeader";
import EventDetailsModal from "./calendar/EventDetailsModal";
import EventList from "./calendar/EventList";
import EventModal from "./calendar/EventModal";
import MobileCalendar from "./calendar/MobileCalendar";
import MobileDayEvents from "./calendar/MobileDayEvents";
import RecurringMeetingModal from "./calendar/RecurringMeetingModal";
import SettingsModal from "./calendar/SettingsModal";
import {
	type CalendarEvent,
	type EventForm,
	type RecurringForm,
	getDefaultEventForm,
	getDefaultRecurringForm,
} from "./calendar/calendarUtils";

interface TeamCalendarProps {
	teamId?: string;
	isCaptain: boolean;
	teamSlug?: string;
}

export default function TeamCalendar({
	teamId: _teamId,
	isCaptain,
	teamSlug,
}: TeamCalendarProps) {
	const { darkMode } = useTheme();
	const { user } = useAuth();

	const [currentDate, setCurrentDate] = useState(new Date());
	const [showListView, setShowListView] = useState(false);
	const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
	const [selectedMobileDate, setSelectedMobileDate] = useState<Date>(
		new Date(),
	);

	const [showEventModal, setShowEventModal] = useState(false);
	const [showRecurringModal, setShowRecurringModal] = useState(false);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);

	const [eventForm, setEventForm] = useState<EventForm>(getDefaultEventForm());
	const [recurringForm, setRecurringForm] = useState<RecurringForm>(
		getDefaultRecurringForm(),
	);

	const {
		events,
		setEvents,
		recurringMeetings,
		setRecurringMeetings,
		loading,
		userTeams,
		loadEvents,
	} = useCalendarData(user?.id, teamSlug);

	const handleDeleteEvent = (eventId: string) => {
		if (window.confirm("Are you sure you want to delete this event?")) {
			deleteEvent(
				eventId,
				user?.id,
				teamSlug,
				setEvents,
				setRecurringMeetings,
				loadEvents,
			).catch(() => {
				// Error handling is done in the deleteEvent function
			});
		}
	};

	const handleEventClick = (event: CalendarEvent) => {
		setSelectedEvent(event);
		setShowEventDetailsModal(true);
	};

	const handleAddEventForDate = (date: Date) => {
		const localDateString = getLocalDateString(date);
		setEventForm((prev) => ({
			...prev,
			date: localDateString,
			title: "",
			description: "",
			start_time: "",
			end_time: "",
			location: "",
			event_type: "practice",
			meeting_type: "personal",
			selected_team_id: "",
		}));
		setShowEventModal(true);
	};

	const handleAddEvent = () => {
		const localDateString = getLocalDateString(new Date());
		setEventForm((prev) => ({
			...prev,
			date: localDateString,
			title: "",
			description: "",
			start_time: "",
			end_time: "",
			location: "",
			event_type: "practice",
			meeting_type: "personal",
			selected_team_id: "",
		}));
		setShowEventModal(true);
	};

	const handleEventFormChange = (updates: Partial<EventForm>) => {
		setEventForm((prev) => ({ ...prev, ...updates }));
	};

	const handleRecurringFormChange = (updates: Partial<RecurringForm>) => {
		setRecurringForm((prev) => ({ ...prev, ...updates }));
	};

	const handleCreateEvent = async () => {
		await createEvent(eventForm, user, userTeams, teamSlug, () => {
			setShowEventModal(false);
			setEventForm(getDefaultEventForm());
			loadEvents();
		});
	};

	const handleCreateRecurringMeeting = async () => {
		await createRecurringMeeting(
			recurringForm,
			user,
			userTeams,
			teamSlug,
			() => {
				setShowRecurringModal(false);
				setRecurringForm(getDefaultRecurringForm());
				loadEvents();
			},
		);
	};

	if (loading) {
		return (
			<div className="p-6">
				<div className="flex items-center justify-center h-64">
					<div className="text-gray-500 dark:text-gray-400">
						Loading calendar...
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`p-6 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
			<CalendarHeader
				darkMode={darkMode}
				currentDate={currentDate}
				showListView={showListView}
				eventTypeFilter={eventTypeFilter}
				isCaptain={isCaptain}
				onPreviousMonth={() =>
					setCurrentDate(
						new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
					)
				}
				onNextMonth={() =>
					setCurrentDate(
						new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
					)
				}
				onToggleView={setShowListView}
				onEventTypeFilterChange={setEventTypeFilter}
				onAddEvent={handleAddEvent}
				onAddRecurring={() => setShowRecurringModal(true)}
				onShowSettings={() => setShowSettingsModal(true)}
			/>

			{showListView ? (
				<EventList
					darkMode={darkMode}
					events={events}
					recurringMeetings={recurringMeetings}
					eventTypeFilter={eventTypeFilter}
					onEventClick={handleEventClick}
					onDeleteEvent={handleDeleteEvent}
					isEventBlacklisted={(id) => isEventBlacklisted(id, user?.id)}
				/>
			) : (
				<>
					<div className="md:hidden">
						<MobileCalendar
							darkMode={darkMode}
							currentDate={currentDate}
							events={events}
							recurringMeetings={recurringMeetings}
							selectedDate={selectedMobileDate}
							onSelectDate={setSelectedMobileDate}
							isEventBlacklisted={(id) => isEventBlacklisted(id, user?.id)}
						/>

						<div className="mt-4">
							<h3
								className={`text-sm font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								{selectedMobileDate.toLocaleDateString(undefined, {
									month: "long",
									day: "numeric",
									year: "numeric",
								})}
							</h3>
							<MobileDayEvents
								darkMode={darkMode}
								date={selectedMobileDate}
								events={events}
								recurringMeetings={recurringMeetings}
								onEventClick={handleEventClick}
								onDeleteEvent={handleDeleteEvent}
								isEventBlacklisted={(id) => isEventBlacklisted(id, user?.id)}
							/>
						</div>
					</div>

					<div className="hidden md:block">
						<CalendarGrid
							darkMode={darkMode}
							currentDate={currentDate}
							events={events}
							recurringMeetings={recurringMeetings}
							onEventClick={handleEventClick}
							onDeleteEvent={handleDeleteEvent}
							onAddEventForDate={handleAddEventForDate}
							isEventBlacklisted={(id) => isEventBlacklisted(id, user?.id)}
						/>
					</div>
				</>
			)}

			<EventModal
				darkMode={darkMode}
				showModal={showEventModal}
				selectedEvent={selectedEvent}
				eventForm={eventForm}
				userTeams={userTeams}
				onClose={() => setShowEventModal(false)}
				onFormChange={handleEventFormChange}
				onSubmit={handleCreateEvent}
			/>

			<RecurringMeetingModal
				darkMode={darkMode}
				showModal={showRecurringModal}
				recurringForm={recurringForm}
				userTeams={userTeams}
				onClose={() => setShowRecurringModal(false)}
				onFormChange={handleRecurringFormChange}
				onSubmit={handleCreateRecurringMeeting}
			/>

			<EventDetailsModal
				darkMode={darkMode}
				showModal={showEventDetailsModal}
				selectedEvent={selectedEvent}
				onClose={() => setShowEventDetailsModal(false)}
			/>

			<SettingsModal
				darkMode={darkMode}
				showModal={showSettingsModal}
				onClose={() => setShowSettingsModal(false)}
			/>
		</div>
	);
}
