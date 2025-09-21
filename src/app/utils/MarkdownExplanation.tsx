
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { normalizeMath } from '@/lib/utils/markdown';

interface MarkdownExplanationProps {
  text: string;
}

const MarkdownExplanation: React.FC<MarkdownExplanationProps> = ({ text }) => {
  const processed = normalizeMath(text);
  return (
    <div className="markdown-explanation text-sm">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex] as any}>{processed}</ReactMarkdown>
    </div>
  );
};

export default MarkdownExplanation; 