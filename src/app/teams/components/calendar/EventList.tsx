'use client';

import React from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_type: 'practice' | 'tournament' | 'meeting' | 'deadline' | 'other' | 'personal';
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: any;
  created_by: string;
  team_id?: string;
  attendees?: Array<{
    user_id: string;
    status: 'pending' | 'attending' | 'declined' | 'tentative';
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
}

interface EventListProps {
  darkMode: boolean;
  events: CalendarEvent[];
  recurringMeetings: RecurringMeeting[];
  eventTypeFilter: string;
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export default function EventList({
  darkMode,
  events,
  recurringMeetings,
  eventTypeFilter,
  onEventClick,
  onDeleteEvent
}: EventListProps) {
  const getEventColors = (type: string) => {
    switch (type) {
      case 'tournament':
        return darkMode 
          ? 'bg-red-900/20 text-red-300 border-red-800' 
          : 'bg-red-100 text-red-800 border-red-200';
      case 'meeting':
        return darkMode 
          ? 'bg-blue-900/20 text-blue-300 border-blue-800' 
          : 'bg-blue-100 text-blue-800 border-blue-200';
      case 'personal':
        return darkMode 
          ? 'bg-green-900/20 text-green-300 border-green-800' 
          : 'bg-green-100 text-green-800 border-green-200';
      case 'deadline':
        return darkMode 
          ? 'bg-orange-900/20 text-orange-300 border-orange-800' 
          : 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return darkMode 
          ? 'bg-gray-700/50 text-gray-200 border-gray-600' 
          : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get filtered events for list view
  const getFilteredEvents = () => {
    const allEvents = [...events, ...recurringMeetings.flatMap(meeting => 
      meeting.days_of_week.map(_day => ({
        ...meeting,
        start_time: `${meeting.start_date}T${meeting.start_time || '00:00:00'}`,
        end_time: meeting.end_time ? `${meeting.start_date}T${meeting.end_time}` : undefined,
        event_type: 'meeting'
      }))
    )];

    if (eventTypeFilter === 'all') {
      return allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }

    return allEvents
      .filter(event => event.event_type === eventTypeFilter)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} h-[600px] overflow-y-auto`}>
      <div className="p-4">
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Upcoming Events
        </h3>
        
        {filteredEvents.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No events found for the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event, index) => {
              const eventType = 'event_type' in event ? event.event_type : 'practice';

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:opacity-80 ${getEventColors(eventType)}`}
                  onClick={() => {
                    if ('event_type' in event) {
                      onEventClick(event as CalendarEvent);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          eventType === 'tournament' 
                            ? darkMode ? 'bg-red-800 text-red-200' : 'bg-red-200 text-red-800'
                            : eventType === 'meeting'
                            ? darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-200 text-blue-800'
                            : eventType === 'personal'
                            ? darkMode ? 'bg-green-800 text-green-200' : 'bg-green-200 text-green-800'
                            : darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Date:</span>
                          <span>{new Date(event.start_time).toLocaleDateString()}</span>
                        </div>
                        
                        {event.start_time && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Time:</span>
                            <span>
                              {new Date(event.start_time).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}`}
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
                          <div className="flex items-start gap-2 md:col-span-2">
                            <span className="font-medium">Description:</span>
                            <span className="flex-1">{event.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(event.id);
                      }}
                      className={`ml-4 p-2 rounded-full transition-colors ${
                        darkMode 
                          ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300' 
                          : 'text-red-500 hover:bg-red-100 hover:text-red-700'
                      }`}
                      title="Delete event"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
