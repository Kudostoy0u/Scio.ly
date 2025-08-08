import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">{evt.name} – {sub.title}</h1>
          <Link href={`/docs/${evt.slug}/edit`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Edit</Link>
        </div>
        {md ? (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">No content yet. Be the first to contribute!</p>
        )}
      </div>
    </div>
  );
}


