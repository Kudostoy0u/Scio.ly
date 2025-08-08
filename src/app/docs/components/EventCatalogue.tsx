import Link from 'next/link';
import type { DocsEvent } from '@/app/docs/utils/events2026';
import { events2026 as defaultEvents } from '@/app/docs/utils/events2026';
import { EventBadge } from '@/app/docs/components/EventBadge';

type EventsByDivision = { B: DocsEvent[]; C: DocsEvent[] };

export function EventCatalogue({ eventsByDivision = defaultEvents }: { eventsByDivision?: EventsByDivision }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(['B', 'C'] as const).map((div) => (
        <section key={div} className="rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-xl font-semibold mb-3">Division {div}</h2>
          <ul className="space-y-2">
            {eventsByDivision[div].map((evt) => (
              <li key={evt.slug} className="flex items-center justify-between">
                <Link href={`/docs/${evt.slug}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {evt.name}
                </Link>
                <EventBadge evt={evt} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}


