"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import Modal from "@/app/components/Modal";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useState } from "react";
import { toast } from "react-toastify";
import { useCalendarData } from "./TeamCalendar/hooks/useCalendarData";
import {
	createTimezoneAwareDateTime,
	getLocalDateString,
} from "./TeamCalendar/utils/dateUtils";
import {
	blacklistEventId,
	isEventBlacklisted,
} from "./TeamCalendar/utils/eventFilters";
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
import { trpc } from "@/lib/trpc/client";

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
	const [deleteEventConfirm, setDeleteEventConfirm] = useState<string | null>(
		null,
	);
	const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<{
		eventId: string;
		meetingId: string;
	} | null>(null);
	const [isDeletingRecurring, setIsDeletingRecurring] = useState(false);
	const [blacklistVersion, setBlacklistVersion] = useState(0);

	const {
		events,
		recurringMeetings,
		loading,
		userTeams,
		targetTeamIds,
	} = useCalendarData(user?.id, teamSlug, blacklistVersion);

	const utils = trpc.useUtils();
	const createEventMutation = trpc.teams.createCalendarEvent.useMutation();
	const createRecurringMutation =
		trpc.teams.createRecurringMeeting.useMutation();
	const deleteEventMutation = trpc.teams.deleteCalendarEvent.useMutation();
	const deleteRecurringMutation =
		trpc.teams.deleteRecurringMeeting.useMutation();

	const handleDeleteEvent = (eventId: string) => {
		if (eventId.startsWith("recurring-")) {
			const parts = eventId.split("-");
			if (parts.length >= 3) {
				const meetingId = parts.slice(1, 6).join("-");
				setRecurringDeleteTarget({ eventId, meetingId });
				return;
			}
		}
		setDeleteEventConfirm(eventId);
	};

	const confirmDeleteEvent = () => {
		if (!deleteEventConfirm) return;

		const eventId = deleteEventConfirm;
		setDeleteEventConfirm(null);

		deleteEventMutation
			.mutateAsync({ eventId })
			.then(() => {
				toast.success("Event deleted successfully");
				utils.teams.calendarEvents.invalidate({
					teamIds: targetTeamIds,
					includePersonal: true,
				});
			})
			.catch((error) => {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to delete event",
				);
			});
	};

	const handleDeleteRecurringOccurrence = () => {
		if (!recurringDeleteTarget) {
			return;
		}
		blacklistEventId(recurringDeleteTarget.eventId, user?.id);
		setBlacklistVersion((prev) => prev + 1);
		setRecurringDeleteTarget(null);
		toast.success("Recurring event occurrence removed");
	};

	const handleDeleteRecurringSeries = async () => {
		if (!recurringDeleteTarget) {
			return;
		}
		setIsDeletingRecurring(true);
		try {
			await deleteRecurringMutation.mutateAsync({
				meetingId: recurringDeleteTarget.meetingId,
			});
			toast.success("Recurring meeting deleted");
			setRecurringDeleteTarget(null);
			utils.teams.recurringMeetings.invalidate({ teamIds: targetTeamIds });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to delete recurring meeting",
			);
		} finally {
			setIsDeletingRecurring(false);
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
		if (!user?.id) {
			return;
		}

		const startTime = createTimezoneAwareDateTime(
			eventForm.date,
			eventForm.start_time,
		);
		const endTime = eventForm.end_time
			? createTimezoneAwareDateTime(eventForm.date, eventForm.end_time)
			: null;

		try {
			const eventType =
				eventForm.meeting_type === "personal"
					? "personal"
					: eventForm.event_type;

			await createEventMutation.mutateAsync({
				title: eventForm.title,
				description: eventForm.description || null,
				startTime,
				endTime,
				location: eventForm.location || null,
				eventType,
				isAllDay: eventForm.is_all_day,
				isRecurring: eventForm.is_recurring,
				recurrencePattern: eventForm.recurrence_pattern,
				meetingType: eventForm.meeting_type,
				selectedTeamId: eventForm.selected_team_id || null,
			});

			toast.success("Event created successfully!");
			setShowEventModal(false);
			setEventForm(getDefaultEventForm());
			utils.teams.calendarEvents.invalidate({
				teamIds: targetTeamIds,
				includePersonal: true,
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create event",
			);
		}
	};

	const handleCreateRecurringMeeting = async () => {
		if (!user?.id) {
			return;
		}

		try {
			await createRecurringMutation.mutateAsync({
				title: recurringForm.title,
				description: recurringForm.description || null,
				location: recurringForm.location || null,
				daysOfWeek: recurringForm.days_of_week,
				startTime: recurringForm.start_time || null,
				endTime: recurringForm.end_time || null,
				startDate: recurringForm.start_date || null,
				endDate: recurringForm.end_date || null,
				exceptions: recurringForm.exceptions,
				meetingType: recurringForm.meeting_type,
				selectedTeamId: recurringForm.selected_team_id || null,
			});

			toast.success("Recurring meeting created successfully!");
			setShowRecurringModal(false);
			setRecurringForm(getDefaultRecurringForm());
			utils.teams.recurringMeetings.invalidate({ teamIds: targetTeamIds });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create recurring meeting",
			);
		}
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

			<ConfirmModal
				isOpen={deleteEventConfirm !== null}
				onClose={() => setDeleteEventConfirm(null)}
				onConfirm={confirmDeleteEvent}
				title="Delete event?"
				message="Are you sure you want to delete this event?"
				confirmText="Delete"
				confirmVariant="danger"
			/>

			<Modal
				isOpen={recurringDeleteTarget !== null}
				onClose={() => {
					if (!isDeletingRecurring) {
						setRecurringDeleteTarget(null);
					}
				}}
				title="Delete recurring event"
				maxWidth="md"
			>
				<div className="space-y-4">
					<p
						className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Do you want to delete just this occurrence, or the entire recurring
						series?
					</p>
					<div className="flex flex-col sm:flex-row sm:justify-end gap-2">
						<button
							type="button"
							onClick={handleDeleteRecurringOccurrence}
							disabled={isDeletingRecurring}
							className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
								darkMode
									? "bg-gray-700 text-white hover:bg-gray-600"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Delete occurrence
						</button>
						<button
							type="button"
							onClick={handleDeleteRecurringSeries}
							disabled={isDeletingRecurring}
							className="rounded-lg px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
						>
							Delete series
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
