import 'server-only';

const BUCKET = 'docs';

export async function ensureDocsBucket(): Promise<void> {

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    if (error && !String(error.message || '').includes('already exists')) {

      // console.warn('bucket creation error', error.message);
    }
  } catch {
    // ignore
  }
}

export async function getEventMarkdown(slug: string): Promise<string | null> {
  const path = `2026/${slug}.md`;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const text = await data.text();
  return text;
}

export async function saveEventMarkdown(slug: string, content: string): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ok: false, message: 'Supabase not configured' };
  await ensureDocsBucket();
  const path = `2026/${slug}.md`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const { supabase } = await import('@/lib/supabase');
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'text/markdown' });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function getLocalEventMarkdown(slug: string): Promise<string | null> {
  try {
    const parts = slug.split('/');
    const pathMod = await import('node:path');
    const { readFile, access } = await import('node:fs/promises');
    const { constants } = await import('node:fs');

    const candidatePaths: string[] = [];

    candidatePaths.push(
      pathMod.join(process.cwd(), 'src', 'app', 'docs', 'content', '2026', ...parts) + '.md'
    );


    if (parts[0] === 'codebusters' && parts.length >= 2) {
      const cipher = parts[1];

      candidatePaths.push(
        pathMod.join(process.cwd(), 'src', 'app', 'docs', 'content', '2026', 'codebusters', `${cipher}.md`)
      );
      candidatePaths.push(
        pathMod.join(process.cwd(), 'src', 'app', 'docs', 'content', '2026', 'codebusters', 'ciphers', `${cipher}.md`)
      );

      candidatePaths.push(
        pathMod.join(process.cwd(), 'public', 'codebusters', 'ciphers', `${cipher}.md`)
      );
    }

    for (const filePath of candidatePaths) {
      try {
        await access(filePath, constants.R_OK);
        const buf = await readFile(filePath);
        return buf.toString('utf-8');
      } catch {
        // try next candidate
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAnyEventMarkdown(slug: string): Promise<string | null> {
  // Prefer local repo content first (bundled at build time for SSG),
  // then fall back to Supabase if available.
  const local = await getLocalEventMarkdown(slug);
  if (local) return local;
  return getEventMarkdown(slug);
}


