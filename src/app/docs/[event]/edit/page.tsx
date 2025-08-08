"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventBySlug } from '@/app/docs/utils/events2026';
import { getEventMarkdown, saveEventMarkdown } from '@/app/docs/utils/storageClient';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const starter = (name: string) => `# ${name} (2026)

## Overview

Provide a concise summary of this event, key skills, and what to expect on test day.

## Key Topics

- Topic 1
- Topic 2
- Topic 3

## Study Roadmap

1. Read official rules
2. Build a reference/notesheet (if allowed)
3. Drill practice problems and past tests

## Allowed Materials

Summarize what you can bring (notesheet, binder, calculator). Verify in official rules.

## Curated Resources

- SciOly Wiki: 
- Practice sets: 
- Videos: 
`;

export default function EditEventDocsPage() {
  const { event } = useParams<{ event: string }>();
  const router = useRouter();
  const evt = useMemo(() => getEventBySlug(event as string), [event]);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!evt) return;
      const existing = await getEventMarkdown(evt.slug);
      if (!mounted) return;
      setMd(existing ?? starter(evt.name));
      setLoading(false);
    })();
    return () => { mounted = false; }
  }, [evt]);

  if (!evt) return null;

  async function onSave() {
    if (!evt) return;
    setSaving(true);
    const res = await saveEventMarkdown(evt.slug, md);
    setSaving(false);
    setMessage(res.ok ? 'Saved!' : `Error: ${res.message}`);
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Edit Docs – {evt.name}</h1>
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded border ${tab==='edit'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=>setTab('edit')}>Edit</button>
            <button className={`px-3 py-1 rounded border ${tab==='preview'?'bg-gray-100 dark:bg-gray-800':''}`} onClick={()=>setTab('preview')}>Preview</button>
            <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="px-3 py-1 rounded border" onClick={()=>router.push(`/docs/${evt.slug}`)}>Back</button>
          </div>
        </div>
        {message && <p className="text-sm mb-3">{message}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : tab === 'edit' ? (
          <textarea className="w-full h-[70vh] border rounded p-3 font-mono text-sm" value={md} onChange={e=>setMd(e.target.value)} />
        ) : (
          <div className="prose dark:prose-invert max-w-none border rounded p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}


