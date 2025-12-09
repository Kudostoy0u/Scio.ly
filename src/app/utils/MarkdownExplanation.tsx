import type React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { normalizeMath } from "@/lib/utils/content/markdown";

interface MarkdownExplanationProps {
	text: string;
}

const MarkdownExplanation: React.FC<MarkdownExplanationProps> = ({ text }) => {
	const processed = normalizeMath(text);
	return (
		<div className="markdown-explanation text-sm">
			<ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
				{processed}
			</ReactMarkdown>
		</div>
	);
};

export default MarkdownExplanation;
