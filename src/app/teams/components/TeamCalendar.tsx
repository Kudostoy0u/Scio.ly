"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import Modal from "@/app/components/Modal";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import logger from "@/lib/utils/logging/logger";
import { useState } from "react";
import { toast } from "react-toastify";
import { useCalendarData } from "./TeamCalendar/hooks/useCalendarData";
import {
	createTimezoneAwareDateTime,
	getLocalDateString,
} from "./TeamCalendar/utils/dateUtils";
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
	const [deleteEventConfirm, setDeleteEventConfirm] = useState<string | null>(
		null,
	);
	const [recurringDeleteTarget, setRecurringDeleteTarget] = useState<{
		eventId: string;
		occurrenceDate: string;
	} | null>(null);
	const [isDeletingRecurring, setIsDeletingRecurring] = useState(false);

	const { events, recurringMeetings, loading, userTeams, targetTeamIds } =
		useCalendarData(user?.id, teamSlug);

	const utils = trpc.useUtils();
	const createEventMutation = trpc.teams.createCalendarEvent.useMutation();
	const updateEventMutation = trpc.teams.updateCalendarEvent.useMutation();
	const deleteEventMutation = trpc.teams.deleteCalendarEvent.useMutation();
	const skipOccurrenceMutation =
		trpc.teams.skipCalendarOccurrence.useMutation();

	const parseRecurringEventId = (eventId: string) => {
		if (!eventId.startsWith("recurring-")) {
			return null;
		}
		const rest = eventId.slice("recurring-".length);
		if (rest.length < 11) {
			return null;
		}
		const occurrenceDate = rest.slice(-10);
		const baseEventId = rest.slice(0, -11);
		if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
			return null;
		}
		return { baseEventId, occurrenceDate };
	};

	const personalCalendarKey = {};
	const teamCalendarKey = { teamIds: targetTeamIds };

	const snapshotCalendarCache = () => ({
		personal: utils.teams.personalCalendarEvents.getData(personalCalendarKey),
		team:
			targetTeamIds.length > 0
				? utils.teams.teamCalendarEvents.getData(teamCalendarKey)
				: undefined,
	});

	const restoreCalendarCache = (snapshot: {
		personal: CalendarEvent[] | undefined;
		team: CalendarEvent[] | undefined;
	}) => {
		utils.teams.personalCalendarEvents.setData(
			personalCalendarKey,
			snapshot.personal,
		);
		if (targetTeamIds.length > 0) {
			utils.teams.teamCalendarEvents.setData(teamCalendarKey, snapshot.team);
		}
	};

	const updatePersonalEvents = (
		updater: (events: CalendarEvent[]) => CalendarEvent[],
	) => {
		utils.teams.personalCalendarEvents.setData(
			personalCalendarKey,
			(current) => {
				if (!current) {
					return current;
				}
				return updater(current);
			},
		);
	};

	const updateTeamEvents = (
		updater: (events: CalendarEvent[]) => CalendarEvent[],
	) => {
		if (targetTeamIds.length === 0) {
			return;
		}
		utils.teams.teamCalendarEvents.setData(teamCalendarKey, (current) => {
			if (!current) {
				return current;
			}
			return updater(current);
		});
	};

	const addEventToCache = (event: CalendarEvent, isPersonal: boolean) => {
		if (isPersonal) {
			utils.teams.personalCalendarEvents.setData(
				personalCalendarKey,
				(current) => {
					const next = current ? [...current] : [];
					next.push(event);
					return next;
				},
			);
			return;
		}
		if (event.team_id && targetTeamIds.includes(event.team_id)) {
			utils.teams.teamCalendarEvents.setData(teamCalendarKey, (current) => {
				const next = current ? [...current] : [];
				next.push(event);
				return next;
			});
		}
	};

	const updateEventInCache = (
		eventId: string,
		updater: (event: CalendarEvent) => CalendarEvent,
		isPersonal: boolean,
	) => {
		const applyUpdate = (events: CalendarEvent[]) =>
			events.map((event) => (event.id === eventId ? updater(event) : event));
		if (isPersonal) {
			updatePersonalEvents(applyUpdate);
		} else {
			updateTeamEvents(applyUpdate);
		}
	};

	const removeEventFromCaches = (eventId: string) => {
		const removeEvent = (events: CalendarEvent[]) =>
			events.filter((event) => event.id !== eventId);
		updatePersonalEvents(removeEvent);
		updateTeamEvents(removeEvent);
	};

	const canCreateTeamEvent = (teamId: string | undefined) => {
		if (!teamId) {
			return false;
		}
		const team = userTeams.find((item) => item.id === teamId);
		return team?.user_role === "captain" || team?.user_role === "admin";
	};

	const handleDeleteEvent = (eventId: string) => {
		const parsed = parseRecurringEventId(eventId);
		if (parsed) {
			setRecurringDeleteTarget({
				eventId: parsed.baseEventId,
				occurrenceDate: parsed.occurrenceDate,
			});
			return;
		}
		setDeleteEventConfirm(eventId);
	};

	const confirmDeleteEvent = () => {
		if (!deleteEventConfirm) return;

		const eventId = deleteEventConfirm;
		setDeleteEventConfirm(null);

		const snapshot = snapshotCalendarCache();
		removeEventFromCaches(eventId);

		deleteEventMutation
			.mutateAsync({ eventId })
			.then(() => {
				toast.success("Event deleted successfully");
			})
			.catch((error) => {
				restoreCalendarCache(snapshot);
				toast.error(
					error instanceof Error ? error.message : "Failed to delete event",
				);
			});
	};

	const handleDeleteRecurringOccurrence = () => {
		if (!recurringDeleteTarget) {
			return;
		}
		setIsDeletingRecurring(true);
		logger.dev.structured("debug", "[Calendar] Skip recurring occurrence", {
			eventId: recurringDeleteTarget.eventId,
			occurrenceDate: recurringDeleteTarget.occurrenceDate,
		});
		const snapshot = snapshotCalendarCache();
		const applyOccurrenceSkip = (event: CalendarEvent) => {
			const pattern =
				event.recurrence_pattern && typeof event.recurrence_pattern === "object"
					? { ...event.recurrence_pattern }
					: {};
			const existing = Array.isArray(pattern.exceptions)
				? pattern.exceptions
				: [];
			pattern.exceptions = Array.from(
				new Set([...existing, recurringDeleteTarget.occurrenceDate]),
			);
			return { ...event, recurrence_pattern: pattern };
		};
		updatePersonalEvents((events) =>
			events.map((event) =>
				event.id === recurringDeleteTarget.eventId
					? applyOccurrenceSkip(event)
					: event,
			),
		);
		updateTeamEvents((events) =>
			events.map((event) =>
				event.id === recurringDeleteTarget.eventId
					? applyOccurrenceSkip(event)
					: event,
			),
		);

		skipOccurrenceMutation
			.mutateAsync({
				eventId: recurringDeleteTarget.eventId,
				occurrenceDate: recurringDeleteTarget.occurrenceDate,
			})
			.then(() => {
				toast.success("Recurring event occurrence removed");
				setRecurringDeleteTarget(null);
			})
			.catch((error) => {
				restoreCalendarCache(snapshot);
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to remove recurring occurrence",
				);
			})
			.finally(() => {
				setIsDeletingRecurring(false);
			});
	};

	const handleDeleteRecurringSeries = async () => {
		if (!recurringDeleteTarget) {
			return;
		}
		setIsDeletingRecurring(true);
		const snapshot = snapshotCalendarCache();
		removeEventFromCaches(recurringDeleteTarget.eventId);
		try {
			logger.dev.structured("debug", "[Calendar] Delete recurring series", {
				eventId: recurringDeleteTarget.eventId,
			});
			await deleteEventMutation.mutateAsync({
				eventId: recurringDeleteTarget.eventId,
			});
			toast.success("Recurring meeting deleted");
			setRecurringDeleteTarget(null);
		} catch (error) {
			restoreCalendarCache(snapshot);
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

	const handleEditEvent = (event: CalendarEvent) => {
		setSelectedEvent(event);
		setShowEventDetailsModal(false);

		// Convert CalendarEvent to EventForm
		const startDate = new Date(event.start_time);
		const dateStr = getLocalDateString(startDate);
		const startTimeStr = event.is_all_day
			? ""
			: startDate.toTimeString().slice(0, 5); // HH:MM format
		const endTimeStr = event.end_time
			? new Date(event.end_time).toTimeString().slice(0, 5)
			: "";

		const meetingType: "personal" | "team" =
			event.owner_user_id && !event.team_id ? "personal" : "team";

		setEventForm({
			title: event.title,
			description: event.description || "",
			date: dateStr,
			start_time: startTimeStr,
			end_time: endTimeStr,
			location: event.location || "",
			event_type: event.event_type,
			is_all_day: event.is_all_day,
			is_recurring: event.is_recurring,
			recurrence_pattern: event.recurrence_pattern || {},
			meeting_type: meetingType,
			selected_team_id: event.team_id || "",
			selected_subteam_id: event.subteam_id || "",
		});
		setShowEventModal(true);
	};

	const handleAddEventForDate = (date: Date) => {
		const localDateString = getLocalDateString(date);
		setSelectedEvent(null); // Ensure selectedEvent is null when creating
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
			selected_subteam_id: "",
		}));
		setShowEventModal(true);
	};

	const handleAddEvent = () => {
		const localDateString = getLocalDateString(new Date());
		setSelectedEvent(null); // Ensure selectedEvent is null when creating
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
			selected_subteam_id: "",
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
		if (eventForm.meeting_type === "team") {
			if (!eventForm.selected_team_id) {
				toast.error("Select a team to create a team event.");
				return;
			}
			if (!canCreateTeamEvent(eventForm.selected_team_id)) {
				toast.error("Only captains/admins can create team events.");
				return;
			}
		}

		const startTime = createTimezoneAwareDateTime(
			eventForm.date,
			eventForm.start_time,
		);
		const endTime = eventForm.end_time
			? createTimezoneAwareDateTime(eventForm.date, eventForm.end_time)
			: null;

		const eventType =
			eventForm.meeting_type === "personal" ? "personal" : eventForm.event_type;
		const isPersonal = eventForm.meeting_type === "personal";
		const teamId = eventForm.selected_team_id || undefined;
		const subteamId = eventForm.selected_subteam_id || undefined;

		const snapshot = snapshotCalendarCache();
		try {
			// Check if we're editing an existing event
			if (selectedEvent) {
				updateEventInCache(
					selectedEvent.id,
					(event) => ({
						...event,
						title: eventForm.title,
						description: eventForm.description || undefined,
						start_time: startTime,
						end_time: endTime || undefined,
						location: eventForm.location || undefined,
						event_type: eventType,
						is_all_day: eventForm.is_all_day,
						is_recurring: eventForm.is_recurring,
						recurrence_pattern: eventForm.recurrence_pattern,
					}),
					!selectedEvent.team_id,
				);
				await updateEventMutation.mutateAsync({
					eventId: selectedEvent.id,
					title: eventForm.title,
					description: eventForm.description || null,
					startTime,
					endTime,
					location: eventForm.location || null,
					eventType,
					isAllDay: eventForm.is_all_day,
					isRecurring: eventForm.is_recurring,
					recurrencePattern: eventForm.recurrence_pattern,
				});

				toast.success("Event updated successfully!");
			} else {
				const optimisticId = `temp-${Date.now()}-${Math.random()
					.toString(36)
					.slice(2, 10)}`;
				const optimisticEvent: CalendarEvent = {
					id: optimisticId,
					title: eventForm.title,
					description: eventForm.description || undefined,
					start_time: startTime,
					end_time: endTime || undefined,
					location: eventForm.location || undefined,
					event_type: eventType,
					is_all_day: eventForm.is_all_day,
					is_recurring: eventForm.is_recurring,
					recurrence_pattern: eventForm.recurrence_pattern,
					created_by: user.id,
					owner_user_id: isPersonal ? user.id : null,
					team_id: isPersonal ? undefined : teamId,
					subteam_id: isPersonal ? undefined : subteamId,
				};
				addEventToCache(optimisticEvent, isPersonal);

				const createResult = await createEventMutation.mutateAsync({
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
					teamId: eventForm.selected_team_id || null,
					subteamId: eventForm.selected_subteam_id || null,
				});

				if (createResult?.eventId) {
					updateEventInCache(
						optimisticId,
						(event) => ({ ...event, id: createResult.eventId }),
						isPersonal,
					);
				}
				toast.success("Event created successfully!");
			}

			setShowEventModal(false);
			setSelectedEvent(null);
			setEventForm(getDefaultEventForm());
		} catch (error) {
			restoreCalendarCache(snapshot);
			toast.error(
				error instanceof Error ? error.message : "Failed to save event",
			);
		}
	};

	const handleCreateRecurringMeeting = async () => {
		if (!user?.id) {
			return;
		}
		if (recurringForm.meeting_type === "team") {
			if (!recurringForm.selected_team_id) {
				toast.error("Select a team to create a team event.");
				return;
			}
			if (!canCreateTeamEvent(recurringForm.selected_team_id)) {
				toast.error("Only captains/admins can create team events.");
				return;
			}
		}

		const isPersonal = recurringForm.meeting_type === "personal";
		const teamId = recurringForm.selected_team_id || undefined;
		const subteamId = recurringForm.selected_subteam_id || undefined;

		const snapshot = snapshotCalendarCache();
		try {
			const recurrencePattern = {
				days_of_week: recurringForm.days_of_week,
				start_date: recurringForm.start_date || null,
				end_date: recurringForm.end_date || null,
				exceptions: recurringForm.exceptions,
				start_time: recurringForm.start_time || null,
				end_time: recurringForm.end_time || null,
			};
			const startTime = recurringForm.start_date
				? createTimezoneAwareDateTime(
						recurringForm.start_date,
						recurringForm.start_time || undefined,
					)
				: createTimezoneAwareDateTime(
						getLocalDateString(new Date()),
						recurringForm.start_time || undefined,
					);
			const endTime = recurringForm.end_time
				? createTimezoneAwareDateTime(
						recurringForm.start_date || getLocalDateString(new Date()),
						recurringForm.end_time,
					)
				: null;

			const optimisticId = `temp-${Date.now()}-${Math.random()
				.toString(36)
				.slice(2, 10)}`;
			const optimisticEvent: CalendarEvent = {
				id: optimisticId,
				title: recurringForm.title,
				description: recurringForm.description || undefined,
				start_time: startTime,
				end_time: endTime || undefined,
				location: recurringForm.location || undefined,
				event_type: isPersonal ? "personal" : "meeting",
				is_all_day: false,
				is_recurring: true,
				recurrence_pattern: recurrencePattern,
				created_by: user.id,
				owner_user_id: isPersonal ? user.id : null,
				team_id: isPersonal ? undefined : teamId,
				subteam_id: isPersonal ? undefined : subteamId,
			};
			addEventToCache(optimisticEvent, isPersonal);

			const createResult = await createEventMutation.mutateAsync({
				title: recurringForm.title,
				description: recurringForm.description || null,
				startTime,
				endTime,
				location: recurringForm.location || null,
				eventType:
					recurringForm.meeting_type === "personal" ? "personal" : "meeting",
				isAllDay: false,
				isRecurring: true,
				recurrencePattern,
				meetingType: recurringForm.meeting_type,
				teamId: recurringForm.selected_team_id || null,
				subteamId: recurringForm.selected_subteam_id || null,
			});

			if (createResult?.eventId) {
				updateEventInCache(
					optimisticId,
					(event) => ({ ...event, id: createResult.eventId }),
					isPersonal,
				);
			}
			toast.success("Recurring meeting created successfully!");
			setShowRecurringModal(false);
			setRecurringForm(getDefaultRecurringForm());
		} catch (error) {
			restoreCalendarCache(snapshot);
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
					referenceDate={currentDate}
					onEventClick={handleEventClick}
					onDeleteEvent={handleDeleteEvent}
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
				userTeams={userTeams}
				onClose={() => setShowEventDetailsModal(false)}
				onEdit={handleEditEvent}
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
