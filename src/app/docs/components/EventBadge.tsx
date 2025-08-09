"use client";
import Link from 'next/link';
import type { DocsEvent } from '@/app/docs/utils/events2026';
import { getPrimaryBadgeForEvent } from '@/app/docs/utils/events2026';
import { useTheme } from '@/app/contexts/ThemeContext';

export function EventBadge({ evt }: { evt: DocsEvent }) {
  const { darkMode } = useTheme();
  const badge = getPrimaryBadgeForEvent(evt);
  if (!badge) return null;

  const base = 'text-xs px-2 py-1 rounded border transition-colors';
  const styles = {
    notesheet: darkMode
      ? 'bg-blue-950 text-blue-300 border-blue-900 hover:bg-blue-900/60'
      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    build: darkMode
      ? 'bg-red-950 text-red-300 border-red-900 hover:bg-red-900/60'
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    binder: darkMode
      ? 'bg-green-950 text-green-300 border-green-900 hover:bg-green-900/60'
      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    misc: darkMode
      ? 'bg-purple-950 text-purple-300 border-purple-900 hover:bg-purple-900/60'
      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  } as const;

  if (badge.kind === 'notesheet') {
    return (
      <Link href={`/docs/${evt.slug}#notesheet`} className={`${base} ${styles.notesheet}`}>
        {badge.label}
      </Link>
    );
  }

  if (badge.kind === 'build') {
    return <span className={`${base} ${styles.build}`}>{badge.label}</span>;
  }

  if (badge.kind === 'misc') {
    return <span className={`${base} ${styles.misc}`}>{badge.label}</span>;
  }

  // binder
  return <span className={`${base} ${styles.binder}`}>{badge.label}</span>;
}


