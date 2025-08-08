import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const lines = content.split('\n');
    const items: { level: number; text: string; id: string }[] = [];
    for (const line of lines) {
      const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
      if (m) {
        const level = m[1].length;
        const text = m[2].replace(/[#*`_]/g, '').trim();
        const id = slugify(text);
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
            <Link href={`/docs/${evt.slug}/edit`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</Link>
          </div>
          <nav className="text-sm">
            <ul className="space-y-1">
              {toc.map(item => (
                <li key={item.id} className={item.level > 2 ? 'ml-4' : ''}>
                  <a href={`#${item.id}`} className="hover:underline">{item.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <article className="prose dark:prose-invert max-w-none lg:col-span-9">
        <h1>{evt.name} – Division {evt.division.join(' / ')}</h1>
        <p className="text-sm -mt-4 text-gray-500">2026 season</p>

        <section>
          <h2>Overview</h2>
          {md ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
                h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3>,
                h4: ({ children }) => <h4 id={slugify(String(children))}>{children}</h4>,
                h5: ({ children }) => <h5 id={slugify(String(children))}>{children}</h5>,
                h6: ({ children }) => <h6 id={slugify(String(children))}>{children}</h6>,
              }}
            >
              {md}
            </ReactMarkdown>
          ) : (
            <>
              <p>{evt.overview}</p>
              <ul>
                {evt.keyTopics.map(t => (<li key={t}>{t}</li>))}
              </ul>
            </>
          )}
          {evt.materialsNote && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><strong>Allowed materials:</strong> {evt.materialsNote}</p>
          )}
        </section>

        {evt.subsections && evt.subsections.length > 0 && (
          <section>
            <h2>Subsections</h2>
            <ul>
              {evt.subsections.map(s => (
                <li key={s.slug}>
                  <Link href={`/docs/${evt.slug}/${s.slug}`} className="text-blue-600 dark:text-blue-400 hover:underline">{s.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

      <section>
        <h2>Official references</h2>
        <ul>
          {evt.links.map(link => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
            </li>
          ))}
        </ul>
      </section>

        {evt.notesheetAllowed && (
          <section id="notesheet">
            <h2>Sample notesheet</h2>
            <p>Download a printable, rule-compliant sample notesheet. Customize with your notes.</p>
            <div className="flex gap-3">
              <Link className="btn btn-primary" href={`/docs/${evt.slug}/notesheet.pdf`} prefetch={false}>
                Download PDF
              </Link>
              <Link className="btn" href={`/docs/${evt.slug}/notesheet`} prefetch={false}>
                Preview in browser
              </Link>
            </div>
          </section>
        )}

        <section>
          <h2>Study roadmap</h2>
          <ol>
            {evt.studyRoadmap.map(step => (<li key={step}>{step}</li>))}
          </ol>
          <div className="mt-4">
            <Link href={`/docs/${evt.slug}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">Contribute edits</Link>
          </div>
        </section>
      </article>
    </div>
  );
}


