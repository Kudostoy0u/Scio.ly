import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { DocsMarkdown } from '@/app/docs/components/DocsMarkdown';

export const revalidate = 600;

export function generateStaticParams() {
  return getEventBySlug.allSlugs().map(slug => ({ event: slug }));
}

export default async function EventDocsPage({ params }: any) {
  const { event } = (await params) as { event: string };
  const evt = getEventBySlug(event);
  if (!evt) return notFound();
  const md = await getAnyEventMarkdown(evt.slug);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 order-last lg:order-first">
        <div className="sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">On this page</h2>
            <Link href={`/docs/${evt.slug}/edit`} className="text-xs font-medium hover:underline text-blue-600 dark:text-blue-400">Edit</Link>
          </div>
          <nav className="text-sm">
            <ul className="space-y-2">
              {toc.map(item => (
                <li key={item.id} className={item.level === 2 ? 'ml-0' : item.level === 3 ? 'ml-4' : item.level >= 4 ? 'ml-8' : ''}>
                  <a href={`#${item.id}`} className="hover:underline block py-0.5" onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}>{item.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <article className="lg:col-span-9 space-y-10">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-black dark:text-gray-100">{evt.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">2026 season</p>
        </header>

        <section>
          <div>
            {md ? (
              <DocsMarkdown content={md} withHeadingIds />
            ) : (
              <div className="prose prose-slate max-w-none">
                <p>{evt.overview}</p>
                <ul>
                  {evt.keyTopics.map(t => (<li key={t}>{t}</li>))}
                </ul>
              </div>
            )}
          </div>
          {evt.materialsNote && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><strong>Allowed materials:</strong> {evt.materialsNote}</p>
          )}
        </section>

        {evt.subsections && evt.subsections.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Subsections</h2>
              <Link href={`/docs/${evt.slug}/edit`} className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400">Edit main</Link>
            </div>
            <ul className={`divide-y divide-gray-200 dark:divide-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800`}>
              {evt.subsections.map(s => (
                <li key={s.slug} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
                  <Link href={`/docs/${evt.slug}/${s.slug}`} className="hover:underline text-blue-600 dark:text-blue-400">{s.title}</Link>
                  <Link href={`/docs/${evt.slug}/${s.slug}/edit`} className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:underline">Quick edit</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Official references</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-900 dark:text-gray-100">
            {evt.links.map(link => (
              <li key={link.url}>
                <a className="hover:underline text-blue-600 dark:text-blue-400" href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
              </li>
            ))}
          </ul>
        </section>

        {evt.notesheetAllowed && (
          <section id="notesheet" className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sample notesheet</h2>
            <p className="text-gray-700 dark:text-gray-300">Download a printable, rule-compliant sample notesheet. Customize with your notes.</p>
            <div className="flex gap-3">
              <Link className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" href={`/docs/${evt.slug}/notesheet.pdf`} prefetch={false}>
                Download PDF
              </Link>
              <Link className={`px-4 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800`} href={`/docs/${evt.slug}/notesheet`} prefetch={false}>
                Preview in browser
              </Link>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Study roadmap</h2>
          <ol className="list-decimal pl-5 text-gray-900 dark:text-gray-100">
            {evt.studyRoadmap.map(step => (<li key={step}>{step}</li>))}
          </ol>
          <div className="mt-2">
            <Link href={`/docs/${evt.slug}/edit`} className="hover:underline text-blue-600 dark:text-blue-400">Contribute edits</Link>
          </div>
        </section>
      </article>
    </div>
  );
}


