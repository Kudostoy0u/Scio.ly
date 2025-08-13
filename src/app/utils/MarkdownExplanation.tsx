
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownExplanationProps {
  text: string;
}

const MarkdownExplanation: React.FC<MarkdownExplanationProps> = ({ text }) => {
  const normalizeMath = (input: string): string => {
    let out = input.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
    out = out.replace(/\\\(([^]*?)\\\)/g, (_, inner) => `$${inner}$`);
    return out;
  };
  const processed = normalizeMath(text);
  return (
    <div className="markdown-explanation text-sm">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex] as any}>{processed}</ReactMarkdown>
    </div>
  );
};

export default MarkdownExplanation; 