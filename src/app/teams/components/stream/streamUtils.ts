// Utility functions for Stream components

import { TimeRemaining } from './streamTypes';

// Calculate time remaining for a tournament
export const calculateTimeRemaining = (startTime: string): TimeRemaining => {
  const now = new Date();
  const target = new Date(startTime);
  
  // Check if the date is valid
  if (isNaN(target.getTime())) {
    console.error('Invalid start time:', startTime);
    return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const weeks = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24 * 7));
  const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { months, weeks, days, hours, minutes, seconds };
};

// Get the largest time increment and next two
export const getDisplayTimeUnits = (timeRemaining: TimeRemaining) => {
  const units = [
    { value: timeRemaining.months, label: 'Months', key: 'months' },
    { value: timeRemaining.weeks, label: 'Weeks', key: 'weeks' },
    { value: timeRemaining.days, label: 'Days', key: 'days' },
    { value: timeRemaining.hours, label: 'Hours', key: 'hours' },
    { value: timeRemaining.minutes, label: 'Minutes', key: 'minutes' },
    { value: timeRemaining.seconds, label: 'Seconds', key: 'seconds' },
  ];

  // Find the first non-zero unit (largest increment)
  const firstNonZeroIndex = units.findIndex(unit => unit.value > 0);
  
  if (firstNonZeroIndex === -1) {
    return [units[units.length - 1]]; // Return seconds if all are zero
  }

  // Return the largest increment and the next two
  return units.slice(firstNonZeroIndex, firstNonZeroIndex + 3);
};

// Get status text and color based on time remaining
export const getEventStatus = (startTime: string) => {
  const now = new Date();
  const target = new Date(startTime);
  const diffInDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays > 7) {
    return { text: 'Upcoming', color: 'text-green-600' };
  } else if (diffInDays >= 3) {
    return { text: 'Soon', color: 'text-yellow-600' };
  } else {
    return { text: 'Very soon', color: 'text-red-600' };
  }
};

// Format date and time for display
export const formatEventDateTime = (startTime: string) => {
  const date = new Date(startTime);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dayName}, ${dateStr} at ${timeStr}`;
};

// Get event type color
export const getEventTypeColor = (eventType: string) => {
  switch (eventType) {
    case 'tournament':
      return 'bg-blue-100 text-blue-800';
    case 'practice':
      return 'bg-green-100 text-green-800';
    case 'meeting':
      return 'bg-purple-100 text-purple-800';
    case 'deadline':
      return 'bg-red-100 text-red-800';
    case 'personal':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// localStorage utilities for stream data
export const getStreamCacheKey = (teamSlug: string, subteamId: string) => 
  `stream_posts_${teamSlug}_${subteamId}`;

export const getTimersCacheKey = (teamSlug: string, subteamId: string) => 
  `active_timers_${teamSlug}_${subteamId}`;

export const getEventsCacheKey = (teamSlug: string, subteamId: string) => 
  `upcoming_events_${teamSlug}_${subteamId}`;

export const loadFromCache = <T>(key: string): T[] => {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error loading from cache:', error);
    return [];
  }
};

export const saveToCache = <T>(key: string, data: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
};
