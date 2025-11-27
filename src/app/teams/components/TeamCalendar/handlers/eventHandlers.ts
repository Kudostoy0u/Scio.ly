/**
 * Event creation and deletion handlers
 */

import { globalApiCache } from "@/lib/utils/globalApiCache";
import type React from "react";
import { toast } from "react-toastify";
import type {
  CalendarEvent,
  EventForm,
  RecurringForm,
  RecurringMeeting,
  UserTeam,
} from "../../calendar/calendarUtils";
import { createTimezoneAwareDateTime } from "../utils/dateUtils";
import {
  blacklistEventId,
  filterValidEventsWithBlacklist,
  filterValidRecurringMeetingsWithBlacklist,
} from "../utils/eventFilters";

function validateEventForm(eventForm: EventForm): void {
  if (!eventForm.title.trim()) {
    alert("Please enter a title for the event");
    throw new Error("Title required");
  }
  if (!eventForm.date) {
    alert("Please select a date for the event");
    throw new Error("Date required");
  }
  if (eventForm.meeting_type === "team" && !eventForm.selected_team_id) {
    toast.error("Please select a team for the event");
    throw new Error("Team required");
  }
}

function getTargetTeamIds(eventForm: EventForm, userTeams: UserTeam[]): string[] {
  if (eventForm.meeting_type === "personal") {
    return [];
  }
  if (eventForm.meeting_type === "team" && eventForm.selected_team_id) {
    if (eventForm.selected_team_id.startsWith("all-")) {
      const schoolName = eventForm.selected_team_id.replace("all-", "");
      const schoolTeams = userTeams.filter((team) => team.school === schoolName);
      return schoolTeams.map((team) => team.id);
    }
    return [eventForm.selected_team_id];
  }
  return [];
}

function createEventData(
  eventForm: EventForm,
  userId: string,
  teamId: string | null
): Record<string, unknown> {
  return {
    ...eventForm,
    created_by: userId,
    team_id: teamId,
    start_time: createTimezoneAwareDateTime(eventForm.date, eventForm.start_time),
    end_time: eventForm.end_time
      ? createTimezoneAwareDateTime(eventForm.date, eventForm.end_time)
      : undefined,
  };
}

function createEventPromises(
  targetTeamIds: string[],
  eventForm: EventForm,
  userId: string
): Promise<Response>[] {
  if (targetTeamIds.length > 0) {
    return targetTeamIds.map((teamId) => {
      const eventData = createEventData(eventForm, userId, teamId);
      return fetch("/api/teams/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
    });
  }
  const eventData = createEventData(eventForm, userId, null);
  return [
    fetch("/api/teams/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    }),
  ];
}

async function handleEventCreationError(responses: Response[]): Promise<never> {
  const failedResponse = responses.find((res) => !res.ok);
  const errorData = failedResponse
    ? await failedResponse.json()
    : { error: "Failed to create event" };
  const errorMessage = errorData.error || "Failed to create event";

  if (errorMessage.includes("ambiguous")) {
    toast.error("Database error: Please try again later");
  } else if (errorMessage.includes("not found")) {
    toast.error("Team not found. Please refresh the page.");
  } else if (errorMessage.includes("Unauthorized")) {
    toast.error("You are not authorized to create events for this team");
  } else {
    toast.error(errorMessage);
  }

  throw new Error(errorMessage);
}

export async function createEvent(
  eventForm: EventForm,
  user: { id: string } | null,
  userTeams: UserTeam[],
  _teamSlug: string | undefined,
  onSuccess: () => void
): Promise<void> {
  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  validateEventForm(eventForm);

  try {
    const targetTeamIds = getTargetTeamIds(eventForm, userTeams);
    const eventPromises = createEventPromises(targetTeamIds, eventForm, user.id);
    const responses = await Promise.all(eventPromises);
    const allSuccessful = responses.every((res) => res.ok);

    if (allSuccessful) {
      const eventCount = targetTeamIds.length || 1;
      toast.success(
        `Event created successfully for ${eventCount} team${eventCount > 1 ? "s" : ""}`
      );
      onSuccess();
    } else {
      await handleEventCreationError(responses);
    }
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Failed to create event"))) {
      toast.error("Failed to create event");
    }
    throw error;
  }
}

function validateRecurringForm(recurringForm: RecurringForm): void {
  if (!recurringForm.title.trim()) {
    toast.error("Meeting title is required");
    throw new Error("Title required");
  }
  if (recurringForm.days_of_week.length === 0) {
    toast.error("Please select at least one day of the week");
    throw new Error("Days required");
  }
  if (!recurringForm.start_date) {
    toast.error("Start date is required");
    throw new Error("Start date required");
  }
  if (!recurringForm.end_date) {
    toast.error("End date is required");
    throw new Error("End date required");
  }
  if (recurringForm.meeting_type === "team" && !recurringForm.selected_team_id) {
    toast.error("Please select a team for the meeting");
    throw new Error("Team required");
  }
  if (recurringForm.end_date <= recurringForm.start_date) {
    toast.error("End date must be after start date");
    throw new Error("Invalid date range");
  }
  if (recurringForm.start_time && recurringForm.end_time) {
    if (recurringForm.start_time >= recurringForm.end_time) {
      toast.error("End time must be after start time");
      throw new Error("Invalid time range");
    }
  }
}

function getTargetTeamSlugs(
  recurringForm: RecurringForm,
  teamSlug: string | undefined,
  userTeams: UserTeam[]
): string[] {
  if (recurringForm.meeting_type === "personal") {
    if (teamSlug) {
      return [teamSlug];
    }
    if (userTeams.length > 0 && userTeams[0]) {
      return [userTeams[0].slug];
    }
    toast.error("No team context available for personal meeting");
    throw new Error("No team context");
  }
  if (recurringForm.meeting_type === "team" && recurringForm.selected_team_id) {
    if (recurringForm.selected_team_id.startsWith("all-")) {
      const schoolName = recurringForm.selected_team_id.replace("all-", "");
      const schoolTeams = userTeams.filter((team) => team.school === schoolName);
      return schoolTeams.map((team) => team.slug);
    }
    const selectedTeam = userTeams.find((team) => team.id === recurringForm.selected_team_id);
    if (selectedTeam) {
      return [selectedTeam.slug];
    }
  }
  return [];
}

function createMeetingData(
  recurringForm: RecurringForm,
  userId: string,
  slug: string
): Record<string, unknown> {
  return {
    ...recurringForm,
    team_slug: slug,
    created_by: userId,
  };
}

async function handleRecurringMeetingCreationError(responses: Response[]): Promise<never> {
  const failedResponse = responses.find((res) => !res.ok);
  let errorMessage = "Failed to create recurring meeting";

  if (failedResponse) {
    try {
      const errorData = await failedResponse.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = failedResponse.statusText || errorMessage;
    }
  }

  if (errorMessage.includes("ambiguous")) {
    toast.error("Database error: Please try again later");
  } else if (errorMessage.includes("not found")) {
    toast.error("Team not found. Please refresh the page.");
  } else if (errorMessage.includes("Unauthorized")) {
    toast.error("You are not authorized to create recurring meetings for this team");
  } else if (errorMessage.includes("Not a team member")) {
    toast.error("You must be a member of this team to create recurring meetings");
  } else if (errorMessage.includes("Not a captain")) {
    toast.error("Only team captains can create team-wide recurring meetings");
  } else {
    toast.error(errorMessage);
  }

  throw new Error(errorMessage);
}

export async function createRecurringMeeting(
  recurringForm: RecurringForm,
  user: { id: string } | null,
  userTeams: UserTeam[],
  teamSlug: string | undefined,
  onSuccess: () => void
): Promise<void> {
  if (!user?.id) {
    toast.error("User not authenticated. Please log in and try again.");
    throw new Error("User not authenticated");
  }

  validateRecurringForm(recurringForm);

  try {
    const targetTeamSlugs = getTargetTeamSlugs(recurringForm, teamSlug, userTeams);
    const meetingPromises = targetTeamSlugs.map((slug) => {
      const meetingData = createMeetingData(recurringForm, user.id, slug);
      return fetch("/api/teams/calendar/recurring-meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingData),
      });
    });

    const responses = await Promise.all(meetingPromises);
    const allSuccessful = responses.every((res) => res.ok);

    if (allSuccessful) {
      const meetingCount = targetTeamSlugs.length;
      toast.success(
        `Recurring meeting created successfully for ${meetingCount} team${meetingCount > 1 ? "s" : ""}`
      );
      onSuccess();
    } else {
      await handleRecurringMeetingCreationError(responses);
    }
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Failed to create recurring meeting"))) {
      toast.error(
        `Failed to create recurring meeting: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
    throw error;
  }
}

function getCacheKey(teamSlug: string | undefined, userId: string | undefined): string {
  return teamSlug ? `calendar_${teamSlug}` : `calendar_user_${userId}`;
}

function filterAndUpdateCache(
  eventId: string,
  userId: string | undefined,
  teamSlug: string | undefined,
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  setRecurringMeetings: React.Dispatch<React.SetStateAction<RecurringMeeting[]>>
): void {
  const cacheKey = getCacheKey(teamSlug, userId);
  const currentEvents = globalApiCache.get<CalendarEvent[]>(`${cacheKey}_events`) || [];
  const currentRecurring = globalApiCache.get<RecurringMeeting[]>(`${cacheKey}_recurring`) || [];

  const filteredEvents = filterValidEventsWithBlacklist(
    currentEvents.filter((event) => event.id !== eventId),
    userId
  );
  const filteredRecurring = filterValidRecurringMeetingsWithBlacklist(
    currentRecurring.filter((meeting) => meeting.id !== eventId),
    userId
  );

  globalApiCache.set(`${cacheKey}_events`, filteredEvents);
  globalApiCache.set(`${cacheKey}_recurring`, filteredRecurring);
  setEvents(filteredEvents);
  setRecurringMeetings(filteredRecurring);
}

async function handleDeleteError(
  res: Response,
  eventId: string,
  userId: string | undefined,
  teamSlug: string | undefined,
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  setRecurringMeetings: React.Dispatch<React.SetStateAction<RecurringMeeting[]>>
): Promise<never> {
  const errorData = await res.json().catch(() => ({}));
  const errorMessage = errorData.error || "Failed to delete event";

  if (res.status === 404) {
    toast.error("Event not found or already deleted");
    blacklistEventId(eventId, userId);
    filterAndUpdateCache(eventId, userId, teamSlug, setEvents, setRecurringMeetings);

    try {
      await fetch(`/api/teams/calendar/events/${eventId}`, {
        method: "DELETE",
        headers: { "X-Force-Delete": "true" },
      });
    } catch {
      // Ignore errors from the force delete attempt
    }
  } else if (res.status === 403) {
    toast.error("You do not have permission to delete this event");
  } else if (res.status === 401) {
    toast.error("Please log in to delete events");
  } else {
    toast.error(errorMessage);
  }
  throw new Error(errorMessage);
}

export async function deleteEvent(
  eventId: string,
  userId: string | undefined,
  teamSlug: string | undefined,
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
  setRecurringMeetings: React.Dispatch<React.SetStateAction<RecurringMeeting[]>>,
  onSuccess: () => void
): Promise<void> {
  try {
    if (eventId.startsWith("recurring-")) {
      toast.success("Recurring event occurrence removed from view");
      blacklistEventId(eventId, userId);
      filterAndUpdateCache(eventId, userId, teamSlug, setEvents, setRecurringMeetings);
      onSuccess();
      return;
    }

    const res = await fetch(`/api/teams/calendar/events/${eventId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Event deleted successfully");
      filterAndUpdateCache(eventId, userId, teamSlug, setEvents, setRecurringMeetings);
      onSuccess();
    } else {
      await handleDeleteError(res, eventId, userId, teamSlug, setEvents, setRecurringMeetings);
    }
  } catch (error) {
    if (!(error instanceof Error && error.message === "Failed to delete event")) {
      toast.error("Failed to delete event. Please try again.");
    }
    throw error instanceof Error ? error : new Error("Failed to delete event");
  }
}
