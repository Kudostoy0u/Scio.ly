// Utility functions for Stream components

import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import type { TimeRemaining } from "./streamTypes";

// Calculate time remaining for a tournament
export const calculateTimeRemaining = (startTime: string): TimeRemaining => {
  const now = new Date();
  const target = new Date(startTime);

  // Check if the date is valid
  if (Number.isNaN(target.getTime())) {
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
    { value: timeRemaining.months, label: "Months", key: "months" },
    { value: timeRemaining.weeks, label: "Weeks", key: "weeks" },
    { value: timeRemaining.days, label: "Days", key: "days" },
    { value: timeRemaining.hours, label: "Hours", key: "hours" },
    { value: timeRemaining.minutes, label: "Minutes", key: "minutes" },
    { value: timeRemaining.seconds, label: "Seconds", key: "seconds" },
  ];

  // Find the first non-zero unit (largest increment)
  const firstNonZeroIndex = units.findIndex((unit) => unit.value > 0);

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
    return { text: "Upcoming", color: "text-green-600" };
  }
  if (diffInDays >= 3) {
    return { text: "Soon", color: "text-yellow-600" };
  }
  return { text: "Very soon", color: "text-red-600" };
};

// Format date and time for display
export const formatEventDateTime = (startTime: string) => {
  const date = new Date(startTime);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayName}, ${dateStr} at ${timeStr}`;
};

// Get event type color
export const getEventTypeColor = (eventType: string, darkMode = false) => {
  switch (eventType) {
    case "tournament":
      return darkMode
        ? "bg-blue-900/20 text-blue-300 border-blue-800"
        : "bg-blue-100 text-blue-800";
    case "practice":
      return darkMode
        ? "bg-green-900/20 text-green-300 border-green-800"
        : "bg-green-100 text-green-800";
    case "meeting":
      return darkMode
        ? "bg-purple-900/20 text-purple-300 border-purple-800"
        : "bg-purple-100 text-purple-800";
    case "deadline":
      return darkMode ? "bg-red-900/20 text-red-300 border-red-800" : "bg-red-100 text-red-800";
    case "personal":
      return darkMode
        ? "bg-yellow-900/20 text-yellow-300 border-yellow-800"
        : "bg-yellow-100 text-yellow-800";
    default:
      return darkMode
        ? "bg-gray-700/50 text-gray-200 border-gray-600"
        : "bg-gray-100 text-gray-800";
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
    const cached = SyncLocalStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  } catch (_error) {
    return [];
  }
};

export const saveToCache = <T>(key: string, data: T[]) => {
  try {
    SyncLocalStorage.setItem(key, JSON.stringify(data));
  } catch (_error) {}
};
