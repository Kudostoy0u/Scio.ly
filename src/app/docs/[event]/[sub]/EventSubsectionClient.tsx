"use client";
import Link from 'next/link';
import { useTheme } from '@/app/contexts/ThemeContext';
import { DocsMarkdown } from '@/app/docs/components/DocsMarkdown';

interface EventSubsectionClientProps {
  evt: any;
  sub: any;
  md: string | null;
  meta: any;
  toc: Array<{ level: number; text: string; id: string }>;
}

export function EventSubsectionClient({ evt, sub, md, meta, toc }: EventSubsectionClientProps) {
  const { darkMode } = useTheme();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-3 order-last lg:order-first">
        <div className="sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>On this page</h2>
            <Link href={`/docs/${evt.slug}/${sub.slug}/edit`} className={`text-xs font-medium hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Edit</Link>
          </div>
          <nav className="text-sm">
            <ul className="space-y-2">
              {toc.map(item => (
                <li key={item.id} className={item.level === 2 ? 'ml-0' : item.level === 3 ? 'ml-4' : item.level >= 4 ? 'ml-8' : ''}>
                  <a href={`#${item.id}`} className={`hover:underline block py-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <article className="lg:col-span-9 space-y-10">
        <header className="flex items-center justify-between">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-gray-100' : 'text-black'}`}>{evt.name} - {sub.title}</h1>
          <Link href={`/docs/${evt.slug}/${sub.slug}/edit`} className={`text-sm font-medium hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Edit</Link>
        </header>
        <section>
          <div className={`rounded-lg border p-4 text-sm ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Type:</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{meta.typeLabel}</span></div>
              <div><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Divisions:</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{evt.division.join(', ')}</span></div>
              <div><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Participants:</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{meta.participants}</span></div>
              <div><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Approx. Time:</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{meta.approxTime}</span></div>
              <div className="sm:col-span-2"><span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Allowed Resources:</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-900'}>{meta.allowedResources}</span></div>
            </div>
          </div>
        </section>
        {md ? (
          <DocsMarkdown content={md} withHeadingIds />
        ) : (
          <div className={`rounded-lg border p-4 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No content yet. Be the first to contribute!</p>
          </div>
        )}
      </article>
    </div>
  );
}
