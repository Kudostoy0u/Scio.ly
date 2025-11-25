"use client";
import { useTheme } from "@/app/contexts/themeContext";
import { EventBadge } from "@/app/docs/components/EventBadge";
import type { DocsEvent } from "@/app/docs/utils/events2026";
import { events2026 as defaultEvents } from "@/app/docs/utils/events2026";
import Link from "next/link";

type EventsByDivision = { B: DocsEvent[]; C: DocsEvent[] };

export function EventCatalogue({
  eventsByDivision = defaultEvents,
}: { eventsByDivision?: EventsByDivision }) {
  const { darkMode } = useTheme();
  const cardBg = darkMode ? "dark:bg-gray-900" : "bg-white";
  const border = darkMode ? "dark:border-gray-800" : "border-gray-200";
  const heading = darkMode ? "dark:text-gray-100" : "text-black";

  if (!(eventsByDivision && (eventsByDivision.B?.length > 0 || eventsByDivision.C?.length > 0))) {
    return (
      <div className={`rounded-lg border ${border} ${cardBg} p-5`}>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>No events available.</p>
      </div>
    );
  }

  const sorted: EventsByDivision = {
    B: [...(eventsByDivision.B || [])].sort((a, b) => a.name.localeCompare(b.name)),
    C: [...(eventsByDivision.C || [])].sort((a, b) => a.name.localeCompare(b.name)),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(["B", "C"] as const).map((div) => {
        const events = sorted[div];
        if (!events || events.length === 0) {
          return null;
        }
        return (
          <section key={div} className={`rounded-lg border ${border} ${cardBg} p-5`}>
            <h2 className={`text-xl font-semibold mb-3 ${heading}`}>Division {div}</h2>
            <ul className="space-y-2">
              {events.map((evt) => {
                if (!(evt?.slug && evt?.name)) {
                  return null;
                }
                return (
                  <li key={evt.slug} className="flex items-center justify-between">
                    <Link
                      href={`/docs/${evt.slug}`}
                      prefetch={false}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {evt.name}
                    </Link>
                    <EventBadge evt={evt} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
