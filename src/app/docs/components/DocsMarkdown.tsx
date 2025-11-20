"use client";
import type React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { useTheme } from "@/app/contexts/ThemeContext";
import { normalizeMath } from "@/lib/utils/markdown";

type DocsMarkdownProps = {
  content: string;
  withHeadingIds?: boolean;
};

export function DocsMarkdown({ content, withHeadingIds = true }: DocsMarkdownProps) {
  const { darkMode } = useTheme();
  const processed = normalizeMath(content);

  // IDs handled by rehypeSlug; no manual counters needed

  const className = [
    "prose",
    "prose-slate",
    "max-w-none",
    darkMode ? "prose-invert" : "",

    darkMode
      ? ""
      : "prose-headings:text-black prose-p:text-black prose-li:text-black prose-strong:text-black prose-a:text-blue-600",

    darkMode
      ? "dark:prose-headings:text-gray-100 dark:prose-p:text-gray-300 dark:prose-li:text-gray-300 dark:prose-strong:text-gray-100 dark:prose-a:text-blue-400"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const styleVars: React.CSSProperties = {};

  return (
    <div className={className} style={styleVars}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeSlug, rehypeRaw] as any}
        components={
          withHeadingIds
            ? {
                h1: (props) => (
                  <h1
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
                h2: (props) => (
                  <h2
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
                h3: (props) => (
                  <h3
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
                h4: (props) => (
                  <h4
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
                h5: (props) => (
                  <h5
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
                h6: (props) => (
                  <h6
                    {...props}
                    className={["scroll-mt-24 lg:scroll-mt-28", props.className]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ),
              }
            : undefined
        }
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
