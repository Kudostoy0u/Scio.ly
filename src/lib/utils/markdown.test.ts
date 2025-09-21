import { describe, expect, it } from 'vitest';
import { extractToc, normalizeMath, slugifyText } from './markdown';

describe('normalizeMath', () => {
  it('converts \\[ \\] blocks to $$ $$', () => {
    const input = 'Before\\n\\[a+b=c\\]\\nAfter';
    const out = normalizeMath(input);
    expect(out).toContain('$$a+b=c$$');
  });

  it('converts \\( \\) inline to $ $', () => {
    const input = 'Inline: \\(x+y\\) works';
    const out = normalizeMath(input);
    expect(out).toContain('$x+y$');
  });
});

describe('extractToc', () => {
  it('extracts headings and slugs', () => {
    const md = '# Title\n\n## Section One\nText\n\n### Sub Three\nMore\n';
    const toc = extractToc(md);
    expect(toc.map(t => t.text)).toEqual(['Title', 'Section One', 'Sub Three']);
    expect(toc[0].level).toBe(1);
    expect(toc[1].level).toBe(2);
    expect(toc[2].level).toBe(3);
    expect(toc[1].id).toBeTypeOf('string');
  });

  it('handles null input', () => {
    expect(extractToc(null)).toEqual([]);
  });
});

describe('slugifyText', () => {
  it('creates predictable slugs', () => {
    expect(slugifyText('Hello, World!')).toBe('hello-world');
    expect(slugifyText('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });
});


