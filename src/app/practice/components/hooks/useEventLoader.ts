import type { Event } from "@/app/practice/types";
import { EVENTS_2026 } from "@/lib/constants/events2026";
import logger from "@/lib/utils/logger";
import { useEffect, useState } from "react";

export function useEventLoader(viewMode: "current" | "all") {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const approvedEvents = EVENTS_2026;

        const eventsWithIds: Event[] = approvedEvents.map((event, index) => ({
          id: index + 1,
          ...event,
        }));

        setEvents(eventsWithIds);

        // Load subtopics from JSON file
        try {
          const subtopicsRes = await fetch("/subtopics.json");
          if (subtopicsRes.ok) {
            const eventSubtopics = await subtopicsRes.json();
            window.eventSubtopicsMapping = eventSubtopics;
          } else {
            window.eventSubtopicsMapping = {};
          }
        } catch (err) {
          logger.error("Error loading subtopics:", err);
          window.eventSubtopicsMapping = {};
        }
      } catch (err) {
        logger.error("Error fetching data:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    const loadAllEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, subtopicsRes] = await Promise.all([
          fetch("/api/meta/stats"),
          fetch("/subtopics.json"),
        ]);

        if (!statsRes.ok) {
          throw new Error("Failed to fetch stats");
        }
        const statsJson = await statsRes.json();
        const byEvent: Array<{ event: string; count: string }> = statsJson?.data?.byEvent || [];

        const filtered = byEvent.filter((e) => Number.parseInt(e.count || "0", 10) > 100);

        const mapped: Event[] = filtered.map((row, index) => ({
          id: index + 1,
          name: row.event,
          subject: "General",
          divisions: ["B", "C"],
        }));

        setEvents(mapped);

        if (subtopicsRes.ok) {
          try {
            const subtopicsJson = await subtopicsRes.json();
            window.eventSubtopicsMapping = subtopicsJson as Record<string, string[]>;
          } catch {
            // Ignore errors
          }
        }
      } catch (err) {
        logger.error("Error loading all events:", err);
        setError("Failed to load events. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === "current") {
      loadCurrentEvents();
    } else {
      loadAllEvents();
    }
  }, [viewMode]);

  return { events, loading, error };
}
