import GithubSlugger from 'github-slugger';

export function normalizeMath(input: string): string {
  let output = input.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => `$$${inner}$$`);
  output = output.replace(/\\\(([^]*?)\\\)/g, (_match, inner: string) => `$${inner}$`);
  return output;
}

export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export type TocItem = { level: number; text: string; id: string };

export function extractToc(content: string | null): TocItem[] {
  if (!content) return [];
  const normalized = normalizeMath(content);
  const lines = normalized.split('\n');
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[#*`_]/g, '').trim();
      const id = slugger.slug(text);
      items.push({ level, text, id });
    }
  }
  return items;
}


