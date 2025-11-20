import GithubSlugger from "github-slugger";

/**
 * Markdown processing utilities for Science Olympiad content
 * Handles math normalization, text slugification, and table of contents extraction
 */

/**
 * Normalizes LaTeX math expressions in markdown content
 * Converts LaTeX block and inline math to standard markdown format
 *
 * @param {string} input - Markdown content with LaTeX math
 * @returns {string} Normalized markdown with standard math syntax
 * @example
 * ```typescript
 * const markdown = "This is inline math: \\(x^2\\) and block math: \\[\\sum_{i=1}^{n} i\\]";
 * const normalized = normalizeMath(markdown);
 * // Returns: "This is inline math: $x^2$ and block math: $$\\sum_{i=1}^{n} i$$"
 * ```
 */
export function normalizeMath(input: string): string {
  let output = input.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner: string) => `$$${inner}$$`);
  output = output.replace(/\\\(([^]*?)\\\)/g, (_match, inner: string) => `$${inner}$`);
  return output;
}

/**
 * Converts text to URL-friendly slug format
 * Removes special characters and converts to lowercase with hyphens
 *
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 * @example
 * ```typescript
 * slugifyText("Anatomy & Physiology"); // Returns "anatomy-physiology"
 * slugifyText("Dynamic Planet (Oceanography)"); // Returns "dynamic-planet-oceanography"
 * ```
 */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Table of contents item interface
 */
export type TocItem = {
  /** Heading level (1-6) */
  level: number;
  /** Heading text content */
  text: string;
  /** Unique identifier for the heading */
  id: string;
};

/**
 * Extracts table of contents from markdown content
 * Parses headings and generates navigation structure
 *
 * @param {string | null} content - Markdown content to parse
 * @returns {TocItem[]} Array of table of contents items
 * @example
 * ```typescript
 * const markdown = "# Introduction\n## Getting Started\n### Prerequisites";
 * const toc = extractToc(markdown);
 * // Returns: [
 * //   { level: 1, text: "Introduction", id: "introduction" },
 * //   { level: 2, text: "Getting Started", id: "getting-started" },
 * //   { level: 3, text: "Prerequisites", id: "prerequisites" }
 * // ]
 * ```
 */
export function extractToc(content: string | null): TocItem[] {
  if (!content) {
    return [];
  }
  const normalized = normalizeMath(content);
  const lines = normalized.split("\n");
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (match && match[1] && match[2]) {
      const level = match[1].length;
      const text = match[2].replace(/[#*`_]/g, "").trim();
      const id = slugger.slug(text);
      items.push({ level, text, id });
    }
  }
  return items;
}
