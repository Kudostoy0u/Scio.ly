import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { getEventMeta } from '@/app/docs/utils/eventMeta';
import { EventDocsClient } from './EventDocsClient';
import { extractToc } from '@/lib/utils/markdown';

export const revalidate = 600;

export function generateStaticParams() {
  return getEventBySlug.allSlugs().map(slug => ({ event: slug }));
}

export default async function EventDocsPage({ params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  const evt = getEventBySlug(event);
  if (!evt) return notFound();
  const md = await getAnyEventMarkdown(evt.slug);
  const meta = getEventMeta(evt);

  const toc = extractToc(md);

  return <EventDocsClient evt={evt} md={md} meta={meta} toc={toc} />;
}


