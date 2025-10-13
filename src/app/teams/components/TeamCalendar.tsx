'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { toast } from 'react-toastify';
import { globalApiCache } from '@/lib/utils/globalApiCache';

// Import calendar components
import CalendarHeader from './calendar/CalendarHeader';
import CalendarGrid from './calendar/CalendarGrid';
import MobileCalendar from './calendar/MobileCalendar';
import MobileDayEvents from './calendar/MobileDayEvents';
import EventList from './calendar/EventList';
import EventModal from './calendar/EventModal';
import RecurringMeetingModal from './calendar/RecurringMeetingModal';
import EventDetailsModal from './calendar/EventDetailsModal';
import SettingsModal from './calendar/SettingsModal';
import {
  CalendarEvent,
  RecurringMeeting,
  EventForm,
  RecurringForm,
  UserTeam,
  getDefaultEventForm,
  getDefaultRecurringForm
} from './calendar/calendarUtils';

interface TeamCalendarProps {
  teamId?: string;
  isCaptain: boolean;
  teamSlug?: string;
}

export default function TeamCalendar({ teamId: _teamId, isCaptain, teamSlug }: TeamCalendarProps) {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showListView, setShowListView] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recurringMeetings, setRecurringMeetings] = useState<RecurringMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  
  // Filter state
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date>(new Date());
  
  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Form states
  const [eventForm, setEventForm] = useState<EventForm>(getDefaultEventForm());
  const [recurringForm, setRecurringForm] = useState<RecurringForm>(getDefaultRecurringForm());

  // Helper function to validate and filter events with invalid dates
  const filterValidEvents = (events: CalendarEvent[]): CalendarEvent[] => {
    return events.filter(event => {
      try {
        // Check if start_time is valid
        if (!event.start_time) return false;
        const startDate = new Date(event.start_time);
        if (isNaN(startDate.getTime())) return false;
        
        // Check if end_time is valid (if provided)
        if (event.end_time) {
          const endDate = new Date(event.end_time);
          if (isNaN(endDate.getTime())) return false;
        }
        
        return true;
      } catch {
        return false;
      }
    });
  };

  // Helper function to validate and filter recurring meetings with invalid dates
  const filterValidRecurringMeetings = (meetings: RecurringMeeting[]): RecurringMeeting[] => {
    return meetings.filter(meeting => {
      try {
        // Check if start_date and end_date are valid
        if (!meeting.start_date || !meeting.end_date) return false;
        const startDate = new Date(meeting.start_date);
        const endDate = new Date(meeting.end_date);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
        
        // Check if start_time and end_time are valid (if provided)
        if (meeting.start_time) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
          if (!timeRegex.test(meeting.start_time)) return false;
        }
        
        if (meeting.end_time) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
          if (!timeRegex.test(meeting.end_time)) return false;
        }
        
        return true;
      } catch {
        return false;
      }
    });
  };

  // Helper function to permanently blacklist an event ID
  const blacklistEventId = (eventId: string) => {
    const blacklistKey = `blacklisted_events_${user?.id}`;
    const currentBlacklist = globalApiCache.get<string[]>(blacklistKey) || [];
    if (!currentBlacklist.includes(eventId)) {
      const updatedBlacklist = [...currentBlacklist, eventId];
      globalApiCache.set(blacklistKey, updatedBlacklist);
    }
  };

  // Helper function to check if an event is blacklisted
  const isEventBlacklisted = useCallback((eventId: string): boolean => {
    const blacklistKey = `blacklisted_events_${user?.id}`;
    const currentBlacklist = globalApiCache.get<string[]>(blacklistKey) || [];
    return currentBlacklist.includes(eventId);
  }, [user?.id]);

  // Enhanced filter function that also removes blacklisted events
  const filterValidEventsWithBlacklist = useCallback((events: CalendarEvent[]): CalendarEvent[] => {
    return filterValidEvents(events).filter(event => !isEventBlacklisted(event.id));
  }, [isEventBlacklisted]);

  // Enhanced filter function for recurring meetings that also removes blacklisted events
  const filterValidRecurringMeetingsWithBlacklist = useCallback((meetings: RecurringMeeting[]): RecurringMeeting[] => {
    return filterValidRecurringMeetings(meetings).filter(meeting => !isEventBlacklisted(meeting.id));
  }, [isEventBlacklisted]);

  // Load events and recurring meetings
  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    
    // Load cached data immediately
    const cacheKey = teamSlug ? `calendar_${teamSlug}` : `calendar_user_${user.id}`;
    const cachedEvents = globalApiCache.get<CalendarEvent[]>(`${cacheKey}_events`);
    const cachedRecurring = globalApiCache.get<RecurringMeeting[]>(`${cacheKey}_recurring`);
    const cachedTeams = globalApiCache.get<UserTeam[]>(`user-teams-${user.id}`);
    
    if (cachedEvents) {
      const validEvents = filterValidEventsWithBlacklist(cachedEvents);
      setEvents(validEvents);
      // Update cache with filtered events if any were removed
      if (validEvents.length !== cachedEvents.length) {
        globalApiCache.set(`${cacheKey}_events`, validEvents);
      }
    }
    if (cachedRecurring) {
      const validRecurring = filterValidRecurringMeetingsWithBlacklist(cachedRecurring);
      setRecurringMeetings(validRecurring);
      // Update cache with filtered recurring meetings if any were removed
      if (validRecurring.length !== cachedRecurring.length) {
        globalApiCache.set(`${cacheKey}_recurring`, validRecurring);
      }
    }
    if (cachedTeams) {
      const captainTeams = cachedTeams.filter(team => 
        team.user_role === 'captain' || team.user_role === 'co_captain'
      );
      setUserTeams(captainTeams);
    }
    
    try {
      // Only show loading if we don't have cached data
      if (!cachedEvents && !cachedRecurring && !cachedTeams) {
        setLoading(true);
      }
      
      // Load team events
      if (teamSlug) {
        const eventsRes = await fetch(`/api/teams/calendar/events?teamId=${teamSlug}`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const freshEvents = filterValidEventsWithBlacklist(eventsData.events || []);
          setEvents(freshEvents);
          globalApiCache.set(`${cacheKey}_events`, freshEvents);
        }
      }
      
      // Load personal events
      const personalRes = await fetch(`/api/teams/calendar/personal?userId=${user.id}`);
      if (personalRes.ok) {
        const personalData = await personalRes.json();
        const personalEvents = personalData.events || [];
        setEvents(prev => {
          const teamEvents = teamSlug ? prev : [];
          const combined = filterValidEventsWithBlacklist([...teamEvents, ...personalEvents]);
          globalApiCache.set(`${cacheKey}_events`, combined);
          return combined;
        });
      }
      
      // Load recurring meetings using team slug
      if (teamSlug) {
        const recurringRes = await fetch(`/api/teams/calendar/recurring-meetings?teamSlug=${teamSlug}`);
        if (recurringRes.ok) {
          const recurringData = await recurringRes.json();
          const freshRecurring = filterValidRecurringMeetingsWithBlacklist(recurringData.meetings || []);
          setRecurringMeetings(freshRecurring);
          globalApiCache.set(`${cacheKey}_recurring`, freshRecurring);
        }
      }
      
      // Load user's teams where they are a captain using global cache
      const userTeamsCacheKey = `user-teams-${user.id}`;
      const allTeams = await globalApiCache.fetchWithCache(
        userTeamsCacheKey,
        async () => {
          const response = await fetch('/api/teams/user-teams');
          if (!response.ok) throw new Error('Failed to fetch user teams');
          const result = await response.json();
          return result.teams || [];
        },
        'user-teams'
      );
      
      const captainTeams = allTeams.filter((team: any) => 
        team.user_role === 'captain' || team.user_role === 'co_captain'
      );
      setUserTeams(captainTeams);
      
    } catch {
      // Only show error if we don't have cached data
      if (!cachedEvents && !cachedRecurring) {
        toast.error('Failed to load calendar events');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, teamSlug, filterValidEventsWithBlacklist, filterValidRecurringMeetingsWithBlacklist]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Event handlers
  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEvent(eventId);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };

  const handleAddEventForDate = (date: Date) => {
    // Create date string in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    setEventForm(prev => ({ 
      ...prev, 
      date: localDateString,
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      event_type: 'practice',
      meeting_type: 'personal',
      selected_team_id: ''
    }));
    setShowEventModal(true);
  };

  const handleAddEvent = () => {
    const today = new Date();
    // Create date string in local timezone to avoid UTC conversion issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    setEventForm(prev => ({ 
      ...prev, 
      date: localDateString,
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      event_type: 'practice',
      meeting_type: 'personal',
      selected_team_id: ''
    }));
    setShowEventModal(true);
  };

  const handleEventFormChange = (updates: Partial<EventForm>) => {
    setEventForm(prev => ({ ...prev, ...updates }));
  };

  const handleRecurringFormChange = (updates: Partial<RecurringForm>) => {
    setRecurringForm(prev => ({ ...prev, ...updates }));
  };

  // Helper function to create timezone-aware date strings
  const createTimezoneAwareDateTime = (dateStr: string, timeStr?: string) => {
    const time = timeStr || '00:00:00';
    
    // Create a date string in local timezone format
    // This ensures the date and time are preserved exactly as entered
    const dateTimeString = `${dateStr}T${time}`;
    
    // Create a Date object from the local date/time
    const localDate = new Date(dateTimeString);
    
    // Get timezone offset in minutes (positive for behind UTC, negative for ahead)
    const timezoneOffset = localDate.getTimezoneOffset();
    
    // Convert offset to hours and minutes for ISO string format
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    // Format the date components
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');
    
    // Return ISO string with timezone offset
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
  };

  // Create new event
  const createEvent = async () => {
    if (!user?.id) return;
    
    // Validate required fields
    if (!eventForm.title.trim()) {
      alert('Please enter a title for the event');
      return;
    }
    if (!eventForm.date) {
      alert('Please select a date for the event');
      return;
    }
    
    if (eventForm.meeting_type === 'team' && !eventForm.selected_team_id) {
      toast.error('Please select a team for the event');
      return;
    }
    
    try {
      // Determine which team(s) to use based on meeting type
      let targetTeamIds: string[] = [];
      
      if (eventForm.meeting_type === 'personal') {
        targetTeamIds = [];
      } else if (eventForm.meeting_type === 'team' && eventForm.selected_team_id) {
        if (eventForm.selected_team_id.startsWith('all-')) {
          const schoolName = eventForm.selected_team_id.replace('all-', '');
          const schoolTeams = userTeams.filter(team => team.school === schoolName);
          targetTeamIds = schoolTeams.map(team => team.id);
        } else {
          targetTeamIds = [eventForm.selected_team_id];
        }
      }
      
      // Create events for all target teams (or just one personal event)
      const eventPromises = targetTeamIds.length > 0 
        ? targetTeamIds.map(teamId => {
            const eventData = {
              ...eventForm,
              created_by: user.id,
              team_id: teamId,
              start_time: createTimezoneAwareDateTime(eventForm.date, eventForm.start_time),
              end_time: eventForm.end_time ? 
                createTimezoneAwareDateTime(eventForm.date, eventForm.end_time) : 
                undefined
            };
            
            return fetch('/api/teams/calendar/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData)
            });
          })
        : [(() => {
            const eventData = {
              ...eventForm,
              created_by: user.id,
              team_id: null, // Personal events should have null team_id
              start_time: createTimezoneAwareDateTime(eventForm.date, eventForm.start_time),
              end_time: eventForm.end_time ? 
                createTimezoneAwareDateTime(eventForm.date, eventForm.end_time) : 
                undefined
            };
            
            return fetch('/api/teams/calendar/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData)
            });
          })()];
      
      const responses = await Promise.all(eventPromises);
      const allSuccessful = responses.every(res => res.ok);
      
      if (allSuccessful) {
        const eventCount = targetTeamIds.length || 1;
        toast.success(`Event created successfully for ${eventCount} team${eventCount > 1 ? 's' : ''}`);
        setShowEventModal(false);
        setEventForm(getDefaultEventForm());
        
        // Refresh events to show the new event
        loadEvents();
      } else {
        const failedResponse = responses.find(res => !res.ok);
        const errorData = failedResponse ? await failedResponse.json() : { error: 'Failed to create event' };
        const errorMessage = errorData.error || 'Failed to create event';
        
        if (errorMessage.includes('ambiguous')) {
          toast.error('Database error: Please try again later');
        } else if (errorMessage.includes('not found')) {
          toast.error('Team not found. Please refresh the page.');
        } else if (errorMessage.includes('Unauthorized')) {
          toast.error('You are not authorized to create events for this team');
        } else {
          toast.error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Failed to create event')) {
        toast.error('Failed to create event');
      }
    }
  };

  // Create recurring meeting
  const createRecurringMeeting = async () => {
    if (!user?.id) {
      toast.error('User not authenticated. Please log in and try again.');
      return;
    }
    
    // Validate form data
    if (!recurringForm.title.trim()) {
      toast.error('Meeting title is required');
      return;
    }
    
    if (recurringForm.days_of_week.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }
    
    if (!recurringForm.start_date) {
      toast.error('Start date is required');
      return;
    }
    
    if (!recurringForm.end_date) {
      toast.error('End date is required');
      return;
    }
    
    if (recurringForm.meeting_type === 'team' && !recurringForm.selected_team_id) {
      toast.error('Please select a team for the meeting');
      return;
    }
    
    // Validate that end date is after start date
    if (recurringForm.end_date <= recurringForm.start_date) {
      toast.error('End date must be after start date');
      return;
    }
    
    // Validate times only if both are provided
    if (recurringForm.start_time && recurringForm.end_time) {
      if (recurringForm.start_time >= recurringForm.end_time) {
        toast.error('End time must be after start time');
        return;
      }
    }
    
    try {
      // Determine which team(s) to use based on meeting type
      let targetTeamSlugs: string[] = [];
      
      if (recurringForm.meeting_type === 'personal') {
        if (teamSlug) {
          targetTeamSlugs = [teamSlug];
        } else if (userTeams.length > 0) {
          targetTeamSlugs = [userTeams[0].slug];
        } else {
          toast.error('No team context available for personal meeting');
          return;
        }
      } else if (recurringForm.meeting_type === 'team' && recurringForm.selected_team_id) {
        if (recurringForm.selected_team_id.startsWith('all-')) {
          const schoolName = recurringForm.selected_team_id.replace('all-', '');
          const schoolTeams = userTeams.filter(team => team.school === schoolName);
          targetTeamSlugs = schoolTeams.map(team => team.slug);
        } else {
          const selectedTeam = userTeams.find(team => team.id === recurringForm.selected_team_id);
          if (selectedTeam) {
            targetTeamSlugs = [selectedTeam.slug];
          }
        }
      }
      
      // Create recurring meetings for all target teams
      const meetingPromises = targetTeamSlugs.map(teamSlug => {
        const meetingData = {
          ...recurringForm,
          team_slug: teamSlug,
          created_by: user.id
        };
        
        return fetch('/api/teams/calendar/recurring-meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meetingData)
        });
      });
      
      const responses = await Promise.all(meetingPromises);
      const allSuccessful = responses.every(res => res.ok);
      
      if (allSuccessful) {
        const meetingCount = targetTeamSlugs.length;
        toast.success(`Recurring meeting created successfully for ${meetingCount} team${meetingCount > 1 ? 's' : ''}`);
        setShowRecurringModal(false);
        setRecurringForm(getDefaultRecurringForm());
        
        // Refresh events to show the new recurring meeting
        loadEvents();
      } else {
        const failedResponse = responses.find(res => !res.ok);
        let errorMessage = 'Failed to create recurring meeting';
        
        if (failedResponse) {
          try {
            const errorData = await failedResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = failedResponse.statusText || errorMessage;
          }
        }
        
        if (errorMessage.includes('ambiguous')) {
          toast.error('Database error: Please try again later');
        } else if (errorMessage.includes('not found')) {
          toast.error('Team not found. Please refresh the page.');
        } else if (errorMessage.includes('Unauthorized')) {
          toast.error('You are not authorized to create recurring meetings for this team');
        } else if (errorMessage.includes('Not a team member')) {
          toast.error('You must be a member of this team to create recurring meetings');
        } else if (errorMessage.includes('Not a captain')) {
          toast.error('Only team captains can create team-wide recurring meetings');
        } else {
          toast.error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Failed to create recurring meeting')) {
        toast.error(`Failed to create recurring meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Helper function to remove event from UI and cache
  const removeEventFromUI = (eventId: string) => {
    // Check if this is a recurring event occurrence
    if (eventId.startsWith('recurring-')) {
      // For recurring events, we don't remove from recurringMeetings state
      // as they are generated dynamically. We just blacklist the specific occurrence.
      blacklistEventId(eventId);
      return;
    }
    
    // Remove from local state immediately
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setRecurringMeetings(prev => prev.filter(meeting => meeting.id !== eventId));
    
    // Update cache with the filtered data
    const cacheKey = teamSlug ? `calendar_${teamSlug}` : `calendar_user_${user?.id}`;
    const currentEvents = globalApiCache.get<CalendarEvent[]>(`${cacheKey}_events`) || [];
    const currentRecurring = globalApiCache.get<RecurringMeeting[]>(`${cacheKey}_recurring`) || [];
    
    const filteredEvents = filterValidEventsWithBlacklist(currentEvents.filter(event => event.id !== eventId));
    const filteredRecurring = filterValidRecurringMeetingsWithBlacklist(currentRecurring.filter(meeting => meeting.id !== eventId));
    
    globalApiCache.set(`${cacheKey}_events`, filteredEvents);
    globalApiCache.set(`${cacheKey}_recurring`, filteredRecurring);
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    try {
      // Check if this is a recurring event occurrence
      if (eventId.startsWith('recurring-')) {
        // For recurring events, we need to handle them differently
        // Extract the meeting ID and date from the event ID
        const parts = eventId.split('-');
        if (parts.length >= 3) {
          // For now, we'll just remove it from the UI and cache
          // In the future, we could add an exception to the recurring meeting
          toast.success('Recurring event occurrence removed from view');
          removeEventFromUI(eventId);
          return;
        }
      }
      
      const res = await fetch(`/api/teams/calendar/events/${eventId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success('Event deleted successfully');
        // Just remove from UI and cache - no full refresh needed
        removeEventFromUI(eventId);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to delete event';
        
        if (res.status === 404) {
          toast.error('Event not found or already deleted');
          // Permanently blacklist this event ID so it never shows up again
          blacklistEventId(eventId);
          // Remove it from UI and cache
          removeEventFromUI(eventId);
          
          // Try to force delete from database as well (in case of race conditions)
          try {
            await fetch(`/api/teams/calendar/events/${eventId}`, {
              method: 'DELETE',
              headers: { 'X-Force-Delete': 'true' }
            });
          } catch {
            // Ignore errors from the force delete attempt
          }
        } else if (res.status === 403) {
          toast.error('You do not have permission to delete this event');
        } else if (res.status === 401) {
          toast.error('Please log in to delete events');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch {
      toast.error('Failed to delete event. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <CalendarHeader
        darkMode={darkMode}
        currentDate={currentDate}
        showListView={showListView}
        eventTypeFilter={eventTypeFilter}
        isCaptain={isCaptain}
        onPreviousMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
        onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
        onToggleView={setShowListView}
        onEventTypeFilterChange={setEventTypeFilter}
        onAddEvent={handleAddEvent}
        onAddRecurring={() => setShowRecurringModal(true)}
        onShowSettings={() => setShowSettingsModal(true)}
      />

      {/* Calendar or List View */}
      {!showListView ? (
        <>
          {/* Mobile: compact calendar with dots */}
          <div className="md:hidden">
            <MobileCalendar
              darkMode={darkMode}
              currentDate={currentDate}
              events={events}
              recurringMeetings={recurringMeetings}
              selectedDate={selectedMobileDate}
              onSelectDate={setSelectedMobileDate}
              isEventBlacklisted={isEventBlacklisted}
            />

            {/* Selected day events list */}
            <div className="mt-4">
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedMobileDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <MobileDayEvents
                darkMode={darkMode}
                date={selectedMobileDate}
                events={events}
                recurringMeetings={recurringMeetings}
                onEventClick={handleEventClick}
                onDeleteEvent={handleDeleteEvent}
                isEventBlacklisted={isEventBlacklisted}
              />
            </div>
          </div>

          {/* Desktop: full grid */}
          <div className="hidden md:block">
            <CalendarGrid
              darkMode={darkMode}
              currentDate={currentDate}
              events={events}
              recurringMeetings={recurringMeetings}
              onEventClick={handleEventClick}
              onDeleteEvent={handleDeleteEvent}
              onAddEventForDate={handleAddEventForDate}
              isEventBlacklisted={isEventBlacklisted}
            />
          </div>
        </>
      ) : (
        <EventList
          darkMode={darkMode}
          events={events}
          recurringMeetings={recurringMeetings}
          eventTypeFilter={eventTypeFilter}
          onEventClick={handleEventClick}
          onDeleteEvent={handleDeleteEvent}
          isEventBlacklisted={isEventBlacklisted}
        />
      )}

      {/* Modals */}
      <EventModal
        darkMode={darkMode}
        showModal={showEventModal}
        selectedEvent={selectedEvent}
        eventForm={eventForm}
        userTeams={userTeams}
        onClose={() => setShowEventModal(false)}
        onFormChange={handleEventFormChange}
        onSubmit={createEvent}
      />

      <RecurringMeetingModal
        darkMode={darkMode}
        showModal={showRecurringModal}
        recurringForm={recurringForm}
        userTeams={userTeams}
        onClose={() => setShowRecurringModal(false)}
        onFormChange={handleRecurringFormChange}
        onSubmit={createRecurringMeeting}
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