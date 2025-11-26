"use client";

import { Plus } from "lucide-react";

interface CalendarEvent {
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

interface CalendarGridProps {
  darkMode: boolean;
  currentDate: Date;
  events: CalendarEvent[];
  recurringMeetings: RecurringMeeting[];
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddEventForDate: (date: Date) => void;
  isEventBlacklisted?: (eventId: string) => boolean;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  darkMode,
  currentDate,
  events,
  recurringMeetings,
  onEventClick,
  onDeleteEvent,
  onAddEventForDate,
  isEventBlacklisted,
}: CalendarGridProps) {
  // Generate calendar days
  const generateCalendarDays = () => {
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

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
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
  const getRecurringEventsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    // Create date string in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return recurringMeetings
      .filter((meeting) => {
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
      })
      .map((meeting) => {
        // Convert recurring meeting to event format for display
        const startTime = meeting.start_time
          ? `${dateStr}T${meeting.start_time}`
          : `${dateStr}T00:00:00`;
        const endTime = meeting.end_time ? `${dateStr}T${meeting.end_time}` : undefined;

        const eventId = `recurring-${meeting.id}-${dateStr}`;

        // Skip if this event is blacklisted
        if (isEventBlacklisted?.(eventId)) {
          return null;
        }

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
      })
      .filter((event) => event !== null);
  };

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

  const calendarDays = generateCalendarDays();

  return (
    <div
      className={`rounded-lg border ${darkMode ? "border-gray-700" : "border-gray-200"} h-[500px] md:h-[600px] overflow-hidden`}
    >
      {/* Day Headers */}
      <div className={`grid grid-cols-7 ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
        {dayNames.map((day) => (
          <div
            key={day}
            className={`p-2 md:p-3 text-center text-xs md:text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 grid-rows-6 h-[calc(500px-48px)] md:h-[calc(600px-60px)]">
        {calendarDays.map((day, _index) => {
          const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
          const isToday = day.date.toDateString() === new Date().toDateString();
          const dayEvents = getEventsForDate(day.date);
          const recurringEvents = getRecurringEventsForDate(day.date);
          const allEvents = [...dayEvents, ...recurringEvents];

          return (
            <div
              key={day.date.toISOString()}
              className={`p-1 md:p-2 border-r border-b overflow-hidden max-h-[200%] flex flex-col ${
                darkMode ? "border-gray-700" : "border-gray-200"
              } ${isCurrentMonth ? "" : darkMode ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-400"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs md:text-sm font-medium ${
                    isToday
                      ? darkMode
                        ? "text-blue-400"
                        : "text-blue-600"
                      : isCurrentMonth
                        ? darkMode
                          ? "text-white"
                          : "text-gray-900"
                        : darkMode
                          ? "text-gray-500"
                          : "text-gray-400"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => onAddEventForDate(day.date)}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      darkMode
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
                {allEvents.map((event, eventIndex) => {
                  const eventType = "event_type" in event ? event.event_type : "practice";

                  return (
                    <button
                      key={`${eventIndex}-${event.title}-${event.start_time || "no-time"}`}
                      type="button"
                      className={`text-[10px] md:text-xs p-1 rounded border cursor-pointer transition-colors hover:opacity-80 text-left w-full ${getEventColors(eventType)}`}
                      onClick={() => {
                        if ("event_type" in event) {
                          onEventClick(event as CalendarEvent);
                        }
                      }}
                      aria-label={`View event: ${event.title}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{event.title}</div>
                          {event.start_time && (
                            <div className="text-[10px] md:text-xs opacity-75 mt-0.5">
                              {new Date(event.start_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(event.id);
                          }}
                          className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-colors ${
                            darkMode
                              ? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
                              : "text-red-500 hover:bg-red-100 hover:text-red-700"
                          }`}
                          title="Delete event"
                        >
                          ×
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
