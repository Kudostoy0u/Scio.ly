import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { DocsMarkdown } from '@/app/docs/components/DocsMarkdown';
import { getEventMeta } from '@/app/docs/utils/eventMeta';

export const revalidate = 600;

export function generateStaticParams() {
  const params: Array<{ event: string; sub: string }> = [];
  for (const slug of getEventBySlug.allSlugs()) {
    const evt = getEventBySlug(slug);
    if (evt?.subsections) {
      for (const s of evt.subsections) params.push({ event: slug, sub: s.slug });
    }
  }
  return params;
}

export default async function EventSubsectionPage({ params }: { params: Promise<{ event: string; sub: string }> }) {
  const { event, sub: subSlug } = await params;
  const evt = getEventBySlug(event);
  if (!evt || !evt.subsections) return notFound();
  const sub = evt.subsections.find(s => s.slug === subSlug);
  if (!sub) return notFound();

  const md = await getAnyEventMarkdown(`${evt.slug}/${sub.slug}`);
  const meta = getEventMeta(evt);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  const extractToc = (content: string | null) => {
    if (!content) return [] as { level: number; text: string; id: string }[];
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 order-last lg:order-first">
        <div className="sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">On this page</h2>
            <Link href={`/docs/${evt.slug}/${sub.slug}/edit`} className="text-xs font-medium hover:underline text-blue-600 dark:text-blue-400">Edit</Link>
          </div>
          <nav className="text-sm">
            <ul className="space-y-2">
              {toc.map(item => (
                <li key={item.id} className={item.level === 2 ? 'ml-0' : item.level === 3 ? 'ml-4' : item.level >= 4 ? 'ml-8' : ''}>
                  <a href={`#${item.id}`} className="hover:underline block py-0.5">{item.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <article className="lg:col-span-9 space-y-10">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black dark:text-gray-100">{evt.name} - {sub.title}</h1>
          <Link href={`/docs/${evt.slug}/${sub.slug}/edit`} className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400">Edit</Link>
        </header>
        <section>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-gray-600 dark:text-gray-400">Type:</span> <span className="text-gray-900 dark:text-gray-100">{meta.typeLabel}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Divisions:</span> <span className="text-gray-900 dark:text-gray-100">{evt.division.join(', ')}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Participants:</span> <span className="text-gray-900 dark:text-gray-100">{meta.participants}</span></div>
              <div><span className="text-gray-600 dark:text-gray-400">Approx. Time:</span> <span className="text-gray-900 dark:text-gray-100">{meta.approxTime}</span></div>
              <div className="sm:col-span-2"><span className="text-gray-600 dark:text-gray-400">Allowed Resources:</span> <span className="text-gray-900 dark:text-gray-100">{meta.allowedResources}</span></div>
            </div>
          </div>
        </section>
        {md ? (
          <DocsMarkdown content={md} withHeadingIds />
        ) : (
          <div className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4`}>
            <p className={`text-sm text-gray-600 dark:text-gray-400`}>No content yet. Be the first to contribute!</p>
          </div>
        )}
      </article>
    </div>
  );
}


