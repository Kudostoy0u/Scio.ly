import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getAnyEventMarkdown } from '@/app/docs/utils/storage';
import { DocsMarkdown } from '@/app/docs/components/DocsMarkdown';

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

  return (
    <div className="pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-black dark:text-gray-100">{evt.name} – {sub.title}</h1>
          <Link
            href={`/docs/${evt.slug}/${sub.slug}/edit`}
            className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400"
          >
            Edit
          </Link>
        </div>
        {md ? (
          <DocsMarkdown content={md} />
        ) : (
          <div className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4`}>
            <p className={`text-sm text-gray-600 dark:text-gray-400`}>No content yet. Be the first to contribute!</p>
          </div>
        )}
      </div>
    </div>
  );
}


