"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getEventMarkdown } from '@/app/docs/utils/storageClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useTheme } from '@/app/contexts/ThemeContext';

export default function EditSubsectionDocsPage() {
  const { darkMode } = useTheme();
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
          <h1 className={`text-2xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Edit Docs – {evt.name} / {subsection.title}</h1>
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded border ${darkMode ? 'border-gray-700' : 'border-gray-300'} ${tab==='edit' ? (darkMode ? 'bg-gray-800' : 'bg-gray-100') : ''} ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} onClick={()=>setTab('edit')}>Edit</button>
            <button className={`px-3 py-1 rounded border ${darkMode ? 'border-gray-700' : 'border-gray-300'} ${tab==='preview' ? (darkMode ? 'bg-gray-800' : 'bg-gray-100') : ''} ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} onClick={()=>setTab('preview')}>Preview</button>
            <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className={`px-3 py-1 rounded border ${darkMode ? 'border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`} onClick={()=>router.push(`/docs/${evt.slug}/${subsection.slug}`)}>Back</button>
          </div>
        </div>
        {message && <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>}
        {loading ? (
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Loading…</p>
        ) : tab === 'edit' ? (
          <textarea className={`w-full h-[70vh] border rounded p-3 font-mono text-sm ${darkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-300 bg-white text-gray-900'}`} value={md} onChange={e=>setMd(e.target.value)} />
        ) : (
          <div className={`prose prose-slate max-w-none border rounded p-4 ${darkMode ? 'prose-invert border-gray-800' : 'border-gray-200'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex] as any}>
              {md}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}


