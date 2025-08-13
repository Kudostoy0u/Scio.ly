"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useTheme } from '@/app/contexts/ThemeContext';

type DocsMarkdownProps = {
  content: string;
  withHeadingIds?: boolean;
};

export function DocsMarkdown({ content, withHeadingIds = true }: DocsMarkdownProps) {
  const { darkMode } = useTheme();
  const headingIdCounts = React.useRef<Record<string, number>>({});
  React.useEffect(() => {
    headingIdCounts.current = {};
  }, [content]);

  const normalizeMath = (input: string): string => {
    // Convert \[ ... \] → $$ ... $$ (display) first
    let out = input.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
    // Convert \( ... \) → $ ... $ (inline)
    out = out.replace(/\\\(([^]*?)\\\)/g, (_, inner) => `$${inner}$`);
    return out;
  };
  const processed = normalizeMath(content);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  const className = [
    'prose',
    'prose-slate',
    'max-w-none',
    darkMode ? 'prose-invert' : '',
    // Light mode: force high-contrast body/headings via typography utilities
    !darkMode ? 'prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black prose-a:text-blue-600' : '',
    // Dark mode fine-tuning
    darkMode ? 'dark:prose-headings:text-gray-100 dark:prose-p:text-gray-300 dark:prose-li:text-gray-300 dark:prose-strong:text-gray-100 dark:prose-a:text-blue-400' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Remove CSS variable overrides; rely solely on classes driven by useTheme()
  const styleVars: React.CSSProperties = {};

  return (
    <div className={className} style={styleVars}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex] as any}
        components={withHeadingIds ? {
          h1: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h1 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h1>;
          },
          h2: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h2 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h2>;
          },
          h3: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h3 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h3>;
          },
          h4: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h4 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h4>;
          },
          h5: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h5 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h5>;
          },
          h6: ({ children }) => {
            const base = slugify(String(children));
            const n = (headingIdCounts.current[base] ?? 0) + 1;
            headingIdCounts.current[base] = n;
            const id = n > 1 ? `${base}-${n}` : base;
            return <h6 id={id} className="scroll-mt-24 lg:scroll-mt-28">{children}</h6>;
          },
        } : undefined}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}


