import 'server-only';
import { supabase } from '@/lib/supabase';

const BUCKET = 'docs';

export async function ensureDocsBucket(): Promise<void> {
  // Best-effort: try to create the bucket if it doesn't exist
  try {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    if (error && !String(error.message || '').includes('already exists')) {
      // Silently ignore to avoid blocking UX
      // console.warn('Bucket creation error', error.message);
    }
  } catch {
    // ignore
  }
}

export async function getEventMarkdown(slug: string): Promise<string | null> {
  const path = `2026/${slug}.md`;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const text = await data.text();
  return text;
}

export async function saveEventMarkdown(slug: string, content: string): Promise<{ ok: boolean; message?: string }> {
  await ensureDocsBucket();
  const path = `2026/${slug}.md`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'text/markdown' });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function getLocalEventMarkdown(slug: string): Promise<string | null> {
  try {
    const parts = slug.split('/');
    const pathMod = await import('node:path');
    const { readFile } = await import('node:fs/promises');
    const filePath = pathMod.join(process.cwd(), 'src', 'app', 'docs', 'content', '2026', ...parts) + '.md';
    const buf = await readFile(filePath);
    return buf.toString('utf-8');
  } catch {
    return null;
  }
}

export async function getAnyEventMarkdown(slug: string): Promise<string | null> {
  const remote = await getEventMarkdown(slug);
  if (remote) return remote;
  return getLocalEventMarkdown(slug);
}


