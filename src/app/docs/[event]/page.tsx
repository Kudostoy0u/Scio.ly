import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { getEventMeta } from '@/app/docs/utils/eventMeta';
import { EventDocsClient } from './EventDocsClient';

export const revalidate = 600;

export function generateStaticParams() {
  return getEventBySlug.allSlugs().map(slug => ({ event: slug }));
}

export default async function EventDocsPage({ params }: any) {
  const { event } = (await params) as { event: string };
  const evt = getEventBySlug(event);
  if (!evt) return notFound();
  const md = await getAnyEventMarkdown(evt.slug);
  const meta = getEventMeta(evt);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const extractToc = (content: string | null) => {
    if (!content) return [] as { level: number; text: string; id: string }[];
    // Normalize LaTeX delimiters early so IDs match rendered headings
    const normalized = content
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`)
      .replace(/\\\(([^]*?)\\\)/g, (_, inner) => `$${inner}$`);
    const lines = normalized.split('\n');
    const items: { level: number; text: string; id: string }[] = [];
    const idCounts: Record<string, number> = {};
    for (const line of lines) {
      const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
      if (m) {
        const level = m[1].length;
        const text = m[2].replace(/[#*`_]/g, '').trim();
        const base = slugify(text);
        const n = (idCounts[base] ?? 0) + 1;
        idCounts[base] = n;
        const id = n > 1 ? `${base}-${n}` : base;
        items.push({ level, text, id });
      }
    }
    return items;
  };
  const toc = extractToc(md);

  return <EventDocsClient evt={evt} md={md} meta={meta} toc={toc} />;
}


