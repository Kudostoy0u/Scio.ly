"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getEventMarkdown } from '@/app/docs/utils/storageClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function EditSubsectionDocsPage() {
  const { event, sub } = useParams<{ event: string; sub: string }>();
  const router = useRouter();
  const evt = useMemo(() => getEventBySlug(event as string), [event]);
  const subsection = useMemo(() => evt?.subsections?.find(s => s.slug === (sub as string)), [evt, sub]);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!evt || !subsection) return;
      const slug = `${evt.slug}/${subsection.slug}`;
      const existing = await getEventMarkdown(slug);
      if (!mounted) return;
      const starter = `# ${evt.name} – ${subsection.title} (2026)\n\n## Overview\n\nStart the outline for this subsection here.\n`;
      setMd(existing ?? starter);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [evt, subsection]);

  if (!evt || !subsection) return null;

  async function onSave() {
    // Temporarily disabled; show toast and do nothing
    try {
      const { toast } = await import('react-toastify');
      toast.info('Editing is temporarily disabled.');
    } catch {
      setMessage('Editing is temporarily disabled.');
    }
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Edit Docs – {evt.name} / {subsection.title}</h1>
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-700 ${tab==='edit'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=>setTab('edit')}>Edit</button>
            <button className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-700 ${tab==='preview'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=>setTab('preview')}>Preview</button>
            <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700" onClick={()=>router.push(`/docs/${evt.slug}/${subsection.slug}`)}>Back</button>
          </div>
        </div>
        {message && <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{message}</p>}
        {loading ? (
          <p className="text-gray-700 dark:text-gray-300">Loading…</p>
        ) : tab === 'edit' ? (
          <textarea className="w-full h-[70vh] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded p-3 font-mono text-sm text-gray-900 dark:text-gray-100" value={md} onChange={e=>setMd(e.target.value)} />
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none border border-gray-200 dark:border-gray-800 rounded p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}


