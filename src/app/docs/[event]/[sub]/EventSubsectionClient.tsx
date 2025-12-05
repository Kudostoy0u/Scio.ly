"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { DocsMarkdown } from "@/app/docs/components/DocsMarkdown";
import type { EventMeta } from "@/app/docs/utils/eventMeta";
import type { DocsEvent } from "@/app/docs/utils/events2026";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect } from "react";

interface EventSubsectionClientProps {
	evt: DocsEvent;
	sub: { slug: string; title: string };
	md: string | null;
	meta: EventMeta;
	toc: Array<{ level: number; text: string; id: string }>;
}

export function EventSubsectionClient({
	evt,
	sub,
	md,
	meta,
	toc,
}: EventSubsectionClientProps) {
	const { darkMode } = useTheme();

	useEffect(() => {
		if (typeof window === "undefined" || !window.location.hash) {
			return;
		}
		const id = decodeURIComponent(window.location.hash.slice(1));
		document
			.getElementById(id)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, []);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
			<EventSidebar darkMode={darkMode} evt={evt} sub={sub} toc={toc} />
			<EventContent
				darkMode={darkMode}
				evt={evt}
				sub={sub}
				meta={meta}
				md={md}
			/>
		</div>
	);
}

function EventSidebar({
	darkMode,
	evt,
	sub,
	toc,
}: {
	darkMode: boolean;
	evt: DocsEvent;
	sub: { slug: string; title: string };
	toc: Array<{ level: number; text: string; id: string }>;
}) {
	const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
		event.preventDefault();
		const el = document.getElementById(id);
		if (!el) {
			return;
		}
		try {
			window.location.hash = id;
		} catch {
			/* ignore hash update errors */
		}
		el.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<aside className="lg:col-span-3 order-last lg:order-first">
			<div className="sticky top-24 space-y-3">
				<div className="flex items-center justify-between">
					<h2
						className={`text-sm font-semibold ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						On this page
					</h2>
					<Link
						href={`/docs/${evt.slug}/${sub.slug}/edit`}
						className={`text-xs font-medium hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
					>
						Edit
					</Link>
				</div>
				<nav className="text-sm max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
					<ul className="space-y-2">
						{toc.map((item) => (
							<li key={item.id} className={getTocIndent(item.level)}>
								<a
									href={`#${item.id}`}
									onClick={(e) => handleNavClick(e, item.id)}
									className={`hover:underline block py-0.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									{item.text}
								</a>
							</li>
						))}
					</ul>
				</nav>
			</div>
		</aside>
	);
}

function EventContent({
	darkMode,
	evt,
	sub,
	meta,
	md,
}: {
	darkMode: boolean;
	evt: DocsEvent;
	sub: { slug: string; title: string };
	meta: EventMeta;
	md: string | null;
}) {
	return (
		<article className="lg:col-span-9 space-y-10">
			<EventHeader darkMode={darkMode} evt={evt} sub={sub} />
			<EventMetadataCard darkMode={darkMode} evt={evt} meta={meta} />
			{md ? (
				<DocsMarkdown content={md} withHeadingIds={true} />
			) : (
				<div
					className={`rounded-lg border p-4 ${darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}
				>
					<p
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						No content yet. Be the first to contribute!
					</p>
				</div>
			)}
		</article>
	);
}

function EventHeader({
	darkMode,
	evt,
	sub,
}: {
	darkMode: boolean;
	evt: DocsEvent;
	sub: { slug: string; title: string };
}) {
	return (
		<header className="space-y-1">
			<div className="flex items-center justify-between">
				<h1
					className={`text-3xl font-bold ${darkMode ? "text-gray-100" : "text-black"}`}
				>
					{evt.name} - {sub.title}
				</h1>
				<Link
					href={`/docs/${evt.slug}/${sub.slug}/edit`}
					className={`text-sm font-medium hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
				>
					Edit
				</Link>
			</div>
			<div>
				<Link
					href={`/docs/${evt.slug}`}
					className={`group inline-flex items-center text-base font-medium ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
				>
					<span className="transition-transform duration-200 group-hover:-translate-x-1">
						←
					</span>
					<span className="ml-2">Go back</span>
				</Link>
			</div>
		</header>
	);
}

function EventMetadataCard({
	darkMode,
	evt,
	meta,
}: {
	darkMode: boolean;
	evt: DocsEvent;
	meta: EventMeta;
}) {
	return (
		<section>
			<div
				className={`rounded-lg border p-4 text-sm ${darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}
			>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
					<MetadataRow
						label="Type"
						value={meta.typeLabel}
						darkMode={darkMode}
					/>
					<MetadataRow
						label="Divisions"
						value={evt.division.join(", ")}
						darkMode={darkMode}
					/>
					<MetadataRow
						label="Participants"
						value={meta.participants}
						darkMode={darkMode}
					/>
					<MetadataRow
						label="Approx. Time"
						value={meta.approxTime}
						darkMode={darkMode}
					/>
					<MetadataRow
						label="Allowed Resources"
						value={meta.allowedResources}
						darkMode={darkMode}
						fullWidth={true}
					/>
				</div>
			</div>
		</section>
	);
}

function MetadataRow({
	label,
	value,
	darkMode,
	fullWidth = false,
}: {
	label: string;
	value: string;
	darkMode: boolean;
	fullWidth?: boolean;
}) {
	return (
		<div className={fullWidth ? "sm:col-span-2" : undefined}>
			<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
				{label}:
			</span>{" "}
			<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
				{value}
			</span>
		</div>
	);
}

function getTocIndent(level: number) {
	if (level === 2) {
		return "ml-0";
	}
	if (level === 3) {
		return "ml-4";
	}
	if (level >= 4) {
		return "ml-8";
	}
	return "";
}
