import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { getEventMeta } from '@/app/docs/utils/eventMeta';
import { extractToc } from '@/lib/utils/markdown';
import { EventSubsectionClient } from './EventSubsectionClient';

export const dynamic = 'force-dynamic';

export function generateStaticParams() { return []; }

export default async function EventSubsectionPage({ params }: { params: Promise<{ event: string; sub: string }> }) {
  const { event, sub: subSlug } = await params;
  const evt = getEventBySlug(event);
  if (!evt || !evt.subsections) return notFound();
  const sub = evt.subsections.find(s => s.slug === subSlug);
  if (!sub) return notFound();

  const md = await getAnyEventMarkdown(`${evt.slug}/${sub.slug}`);
  const meta = getEventMeta(evt);

  const toc = extractToc(md);

  return <EventSubsectionClient evt={evt} sub={sub} md={md} meta={meta} toc={toc} />;
}


