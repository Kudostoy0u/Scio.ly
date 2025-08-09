"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@/app/contexts/ThemeContext';

type DocsMarkdownProps = {
  content: string;
  withHeadingIds?: boolean;
};

export function DocsMarkdown({ content, withHeadingIds = true }: DocsMarkdownProps) {
  const { darkMode } = useTheme();

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
        remarkPlugins={[remarkGfm]}
        components={withHeadingIds ? {
          h1: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
          h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3>,
          h4: ({ children }) => <h4 id={slugify(String(children))}>{children}</h4>,
          h5: ({ children }) => <h5 id={slugify(String(children))}>{children}</h5>,
          h6: ({ children }) => <h6 id={slugify(String(children))}>{children}</h6>,
        } : undefined}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


