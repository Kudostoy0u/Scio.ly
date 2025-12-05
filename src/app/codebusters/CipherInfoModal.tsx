"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { slugifyText } from "@/lib/utils/markdown";
import { VideoCarousel } from "./components/VideoCarousel";
import { getVideosForCipher } from "./data/cipherVideos";

// Regex for splitting lines (handles both \r\n and \n)
const LINE_SPLIT_REGEX = /\r?\n/;
// Regex for matching H2 headers
const H2_HEADER_REGEX = /^##\s+(.+)$/;

interface CipherInfoModalProps {
	isOpen: boolean;
	onClose: () => void;
	cipherType: string;
	darkMode: boolean;
}

type TabSection = {
	id: string;
	title: string;
	markdown: string;
};

function slugifyCipherType(cipherType: string): string {
	return slugifyText(cipherType);
}

export function parseH2Sections(markdown: string): TabSection[] {
	const lines = markdown.split(LINE_SPLIT_REGEX);
	const sections: TabSection[] = [];
	let currentTitle: string | null = null;
	let currentContent: string[] = [];

	const pushCurrent = () => {
		if (currentTitle !== null) {
			const id = currentTitle
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.trim()
				.replace(/\s+/g, "-");
			sections.push({
				id,
				title: currentTitle,
				markdown: currentContent.join("\n").trim(),
			});
		}
	};

	for (const line of lines) {
		if (line.startsWith("## ")) {
			pushCurrent();
			currentTitle = line.replace(H2_HEADER_REGEX, "$1").trim();
			currentContent = [];
		} else {
			if (currentTitle === null) {
				// ignore preface until first h2; tabs are driven by h2s
				continue;
			}
			currentContent.push(line);
		}
	}
	pushCurrent();

	if (sections.length === 0 && markdown.trim().length > 0) {
		return [
			{
				id: "content",
				title: "Content",
				markdown,
			},
		];
	}
	return sections;
}

// Helper function to create markdown components (extracted to reduce complexity)
function createMarkdownComponents(darkMode: boolean) {
	const slugify = (text: string) => slugifyText(text);
	return {
		h2: (props: { children?: React.ReactNode }) => {
			const { children } = props;
			const text = Array.isArray(children)
				? children.join(" ")
				: String(children ?? "");
			const id = slugify(text);
			return (
				<h2
					id={id}
					className="scroll-mt-20 text-lg sm:text-xl mt-6 mb-2"
					{...props}
				>
					{children}
				</h2>
			);
		},
		h3: (props: { children?: React.ReactNode }) => (
			<h3 className="text-base sm:text-lg mt-4 mb-2" {...props}>
				{props.children}
			</h3>
		),
		pre: (props: { children?: React.ReactNode }) => (
			<pre
				className={`${darkMode ? "bg-gray-900 text-gray-100 border border-gray-700" : "bg-gray-50 text-gray-900 border border-gray-200"} overflow-x-auto rounded-md p-3`}
				{...props}
			>
				{props.children}
			</pre>
		),
		code: (props: {
			className?: string;
			children?: React.ReactNode;
			inline?: boolean;
		}) => {
			const { className, children, inline, ...rest } = props;
			if (inline) {
				return (
					<code
						className={`${darkMode ? "bg-gray-900/60 text-gray-100 border border-gray-700" : "bg-gray-50 text-gray-900 border border-gray-200"} px-1 py-0.5 rounded`}
						{...rest}
					>
						{children}
					</code>
				);
			}
			return (
				<code
					className={`${className ?? ""} ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					{...rest}
				>
					{children}
				</code>
			);
		},
	};
}

// Helper hook for scroll handling (extracted to reduce complexity)
function useScrollSectionTracking(
	contentRef: React.RefObject<HTMLDivElement | null>,
	sections: TabSection[],
	activeTabId: string,
	setActiveTabId: (id: string) => void,
	contentMode: "text" | "video",
) {
	useEffect(() => {
		if (!contentRef.current || contentMode !== "text") {
			return;
		}
		const container = contentRef.current;
		const headings = Array.from(
			container.querySelectorAll("h2"),
		) as HTMLElement[];

		if (headings.length > 0 && !activeTabId) {
			const firstHeading = headings[0];
			const first = firstHeading?.id || sections[0]?.id || "";
			setActiveTabId(first);
		}

		const findCurrentSection = (containerTop: number): string => {
			for (let i = headings.length - 1; i >= 0; i--) {
				const heading = headings[i];
				if (!heading) {
					continue;
				}
				const headingTop = heading.offsetTop - container.offsetTop;
				if (headingTop <= containerTop + 100) {
					return heading.id;
				}
			}
			return "";
		};

		const getDefaultSection = (): string => {
			if (headings.length > 0) {
				const firstHeading = headings[0];
				if (firstHeading) {
					return firstHeading.id;
				}
			}
			return "";
		};

		const handleScroll = () => {
			const containerTop = container.scrollTop;
			let currentSection = findCurrentSection(containerTop);

			if (!currentSection) {
				currentSection = getDefaultSection();
			}

			if (currentSection && currentSection !== activeTabId) {
				setActiveTabId(currentSection);
			}
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, [sections, activeTabId, contentMode, contentRef, setActiveTabId]);
}

// Modal Header Component
const ModalHeader = ({
	cipherType,
	darkMode,
	onClose,
}: {
	cipherType: string;
	darkMode: boolean;
	onClose: () => void;
}) => (
	<div
		className={`flex justify-between items-center p-4 border-b ${
			darkMode ? "border-gray-600" : "border-gray-200"
		}`}
	>
		<h2 className="text-xl font-semibold">{cipherType}</h2>
		<button
			type="button"
			onClick={onClose}
			className={`p-2 rounded-full ${
				darkMode
					? "hover:bg-white/20 text-white"
					: "hover:bg-gray-500/20 text-gray-700"
			}`}
			aria-label="Close"
		>
			<svg
				className="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				aria-label="Close"
			>
				<title>Close</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>
);

// Content Mode Toggle Component
const ContentModeToggle = ({
	contentMode,
	darkMode,
	videosCount,
	onSetVideo,
	onSetText,
}: {
	contentMode: "text" | "video";
	darkMode: boolean;
	videosCount: number;
	onSetVideo: () => void;
	onSetText: () => void;
}) => (
	<div
		className={`flex items-center justify-between border-b ${darkMode ? "border-gray-600" : "border-gray-200"} px-3 py-2`}
	>
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onSetVideo}
				className={`px-3 py-1 text-sm rounded transition-colors ${
					contentMode === "video"
						? `${darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-700"}`
						: `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`
				}`}
			>
				Videos ({videosCount})
			</button>
			<button
				type="button"
				onClick={onSetText}
				className={`px-3 py-1 text-sm rounded transition-colors ${
					contentMode === "text"
						? `${darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-700"}`
						: `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`
				}`}
			>
				Text Guide
			</button>
		</div>
	</div>
);

// Sections Tabs Component
const SectionsTabs = ({
	sections,
	activeTabId,
	darkMode,
	onJump,
}: {
	sections: TabSection[];
	activeTabId: string;
	darkMode: boolean;
	onJump: (id: string) => void;
}) => {
	if (sections.length === 0) {
		return null;
	}
	return (
		<div
			className={`border-b ${darkMode ? "border-gray-600" : "border-gray-200"} px-3 py-2 overflow-x-auto`}
		>
			<div className="inline-flex items-center gap-2 whitespace-nowrap">
				{sections.map((tab) => (
					<button
						type="button"
						key={tab.id}
						onClick={() => onJump(tab.id)}
						className={`px-3 py-1 text-sm rounded transition-colors ${
							activeTabId === tab.id
								? `${darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-700"} `
								: `${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`
						}`}
					>
						{tab.title}
					</button>
				))}
			</div>
		</div>
	);
};

// Modal Content Component
const ModalContent = ({
	contentMode,
	videos,
	rawMarkdown,
	error,
	darkMode,
	contentRef,
}: {
	contentMode: "text" | "video";
	videos: ReturnType<typeof getVideosForCipher>;
	rawMarkdown: string;
	error: string | null;
	darkMode: boolean;
	contentRef: React.RefObject<HTMLDivElement | null>;
}) => (
	<div ref={contentRef} className="flex-1 overflow-y-auto p-6">
		{contentMode === "video" ? (
			<VideoCarousel videos={videos} darkMode={darkMode} />
		) : (
			<>
				{!(rawMarkdown || error) && (
					<div className={darkMode ? "text-gray-300" : "text-gray-700"}>
						Loading…
					</div>
				)}
				{error && (
					<div className={darkMode ? "text-red-300" : "text-red-600"}>
						{error}
					</div>
				)}
				{rawMarkdown && (
					<div className={`prose max-w-none ${darkMode ? "prose-invert" : ""}`}>
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={
								[rehypeKatex, rehypeRaw] as unknown as Parameters<
									typeof ReactMarkdown
								>[0]["rehypePlugins"]
							}
							components={createMarkdownComponents(darkMode)}
						>
							{rawMarkdown}
						</ReactMarkdown>
					</div>
				)}
			</>
		)}
	</div>
);

const CipherInfoModal: React.FC<CipherInfoModalProps> = ({
	isOpen,
	onClose,
	cipherType,
	darkMode,
}) => {
	const [rawMarkdown, setRawMarkdown] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [activeTabId, setActiveTabId] = useState<string>("");
	const [contentMode, setContentMode] = useState<"text" | "video">("video");

	// Helper function to reset state
	const resetState = useCallback(() => {
		setError(null);
		setRawMarkdown("");
		setActiveTabId("");
		setContentMode("video");
	}, []);

	// Helper function to fetch markdown content
	const fetchMarkdown = useCallback(
		async (url: string, signal: AbortSignal) => {
			const res = await fetch(url, { signal });
			if (!res.ok) {
				throw new Error(`Failed to load markdown: ${res.status}`);
			}
			return await res.text();
		},
		[],
	);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const controller = new AbortController();
		const slug = slugifyCipherType(cipherType);
		const url = `/api/docs/codebusters/${slug}`;
		resetState();
		fetchMarkdown(url, controller.signal)
			.then((text) => {
				setRawMarkdown(text);
			})
			.catch((_e) => {
				if (controller.signal.aborted) {
					return;
				}
				setError("Content not available yet.");
			});
		return () => controller.abort();
	}, [cipherType, isOpen, fetchMarkdown, resetState]);

	const sections = useMemo(() => parseH2Sections(rawMarkdown), [rawMarkdown]);
	const contentRef = useRef<HTMLDivElement>(null);
	const videos = getVideosForCipher(cipherType);

	useScrollSectionTracking(
		contentRef,
		sections,
		activeTabId,
		setActiveTabId,
		contentMode,
	);

	if (!isOpen) {
		return null;
	}

	const handleJump = (id: string) => {
		const container = contentRef.current;
		if (!container) {
			return;
		}
		const el = container.querySelector(
			`#${CSS.escape(id)}`,
		) as HTMLElement | null;
		if (el) {
			const headerHeight = 80;
			const elementTop = el.offsetTop - headerHeight;

			container.scrollTo({
				top: elementTop,
				behavior: "smooth",
			});
		}
	};

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleBackdropKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") {
			onClose();
		}
	};

	return (
		<>
			<div
				className="fixed inset-0 z-50 flex items-center justify-center"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
				onClick={handleBackdropClick}
				// biome-ignore lint/a11y/useSemanticElements: Using div for modal backdrop with custom styling
				onKeyDown={handleBackdropKeyDown}
				role="dialog"
				aria-modal="true"
				tabIndex={-1}
			>
				<div
					className={`relative w-11/12 h-5/6 max-w-4xl rounded-lg shadow-2xl flex flex-col ${
						darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
					}`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<ModalHeader
						cipherType={cipherType}
						darkMode={darkMode}
						onClose={onClose}
					/>
					<ContentModeToggle
						contentMode={contentMode}
						darkMode={darkMode}
						videosCount={videos.length}
						onSetVideo={() => setContentMode("video")}
						onSetText={() => setContentMode("text")}
					/>
					{contentMode === "text" && (
						<SectionsTabs
							sections={sections}
							activeTabId={activeTabId}
							darkMode={darkMode}
							onJump={handleJump}
						/>
					)}
					<ModalContent
						contentMode={contentMode}
						videos={videos}
						rawMarkdown={rawMarkdown}
						error={error}
						darkMode={darkMode}
						contentRef={contentRef}
					/>
				</div>
			</div>
		</>
	);
};

export default CipherInfoModal;
