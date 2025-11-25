// Calendar utility functions

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_type: "practice" | "tournament" | "meeting" | "deadline" | "other" | "personal";
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

export interface RecurringMeeting {
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

export interface EventForm {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  event_type: "practice" | "tournament" | "meeting" | "deadline" | "other" | "personal";
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern: Record<string, unknown>;
  meeting_type: "personal" | "team";
  selected_team_id: string;
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
}

export interface UserTeam {
  id: string;
  name: string;
  slug: string;
  school: string;
  user_role: string;
  team_id: string;
}

// Get events for a specific date
export const getEventsForDate = (date: Date, events: CalendarEvent[]) => {
  // Create date string in local timezone to avoid UTC conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return events.filter((event) => {
    const eventDate = new Date(event.start_time);
    const eventYear = eventDate.getFullYear();
    const eventMonth = String(eventDate.getMonth() + 1).padStart(2, "0");
    const eventDay = String(eventDate.getDate()).padStart(2, "0");
    const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
    return eventDateStr === dateStr;
  });
};

// Get recurring events for a specific date
export const getRecurringEventsForDate = (date: Date, recurringMeetings: RecurringMeeting[]) => {
  const dayOfWeek = date.getDay();
  // Create date string in local timezone to avoid UTC conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return recurringMeetings.filter((meeting) => {
    if (!(Array.isArray(meeting.days_of_week) && meeting.days_of_week.includes(dayOfWeek))) {
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
  });
};

// Generate calendar days for a given month
export const generateCalendarDays = (currentDate: Date, events: CalendarEvent[]) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Array<{
    date: Date;
    events: CalendarEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
    isLastDay: boolean;
  }> = [];
  const current = new Date(startDate);
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  for (let i = 0; i < 42; i++) {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === current.toDateString();
    });

    days.push({
      date: new Date(current),
      events: dayEvents,
      isCurrentMonth: current.getMonth() === month,
      isToday: current.toDateString() === new Date().toDateString(),
      isLastDay:
        current.getDate() === lastDay.getDate() && current.getMonth() === lastDay.getMonth(),
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
};

// Get filtered events for list view
export const getFilteredEvents = (
  events: CalendarEvent[],
  recurringMeetings: RecurringMeeting[],
  eventTypeFilter: string
) => {
  const allEvents = [
    ...events,
    ...recurringMeetings.flatMap((meeting) =>
      meeting.days_of_week.map((_day) => ({
        ...meeting,
        start_time: `${meeting.start_date}T${meeting.start_time || "00:00:00"}`,
        end_time: meeting.end_time ? `${meeting.start_date}T${meeting.end_time}` : undefined,
        event_type: "meeting",
      }))
    ),
  ];

  if (eventTypeFilter === "all") {
    return allEvents.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }

  return allEvents
    .filter((event) => event.event_type === eventTypeFilter)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
};

// Get event colors based on type and theme
export const getEventColors = (type: string, darkMode: boolean) => {
  switch (type) {
    case "tournament":
      return darkMode
        ? "bg-red-900/20 text-red-300 border-red-800"
        : "bg-red-100 text-red-800 border-red-200";
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

// Get team options for dropdowns
export const getTeamOptions = (userTeams: UserTeam[]) => {
  type TeamOption = UserTeam & { isAllTeams?: boolean };
  return userTeams.reduce((acc: TeamOption[], team) => {
    const schoolKey = team.school || "Unknown School";
    const existingGroup = acc.find((group) => group.school === schoolKey);

    if (existingGroup) {
      acc.push(team);
    } else {
      acc.push({
        id: `all-${schoolKey}`,
        school: schoolKey,
        team_id: "All",
        name: "",
        slug: "",
        user_role: "",
        isAllTeams: true,
      });
      acc.push(team);
    }

    return acc;
  }, []);
};

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
});
