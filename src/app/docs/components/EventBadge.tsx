import Link from 'next/link';
import type { DocsEvent } from '@/app/docs/utils/events2026';
import { getPrimaryBadgeForEvent } from '@/app/docs/utils/events2026';

export function EventBadge({ evt }: { evt: DocsEvent }) {
  const badge = getPrimaryBadgeForEvent(evt);
  if (!badge) return null;

  if (badge.kind === 'notesheet') {
    return (
      <Link
        href={`/docs/${evt.slug}#notesheet`}
        className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
      >
        {badge.label}
      </Link>
    );
  }

  if (badge.kind === 'build') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
        {badge.label}
      </span>
    );
  }

  if (badge.kind === 'misc') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
        {badge.label}
      </span>
    );
  }

  // binder
  return (
    <span className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900">
      {badge.label}
    </span>
  );
}


