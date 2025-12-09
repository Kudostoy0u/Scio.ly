"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { DocsMarkdown } from "@/app/docs/components/DocsMarkdown";
import type { EventMeta } from "@/app/docs/utils/eventMeta";
import type { DocsEvent } from "@/app/docs/utils/events2026";
import Link from "next/link";
import React from "react";
import { toast } from "react-toastify";

type EventLink = DocsEvent["links"][number];
type DocsSubsection = NonNullable<DocsEvent["subsections"]>[number];

const GOOGLE_DOCS_URL_REGEX = /https?:\/\/docs\.google\.com\//;
const NOTESHEET_LABEL_REGEX = /notesheet/i;

interface EventDocsClientProps {
	evt: DocsEvent;
	md: string | null;
	meta: EventMeta;
	toc: Array<{ level: number; text: string; id: string }>;
}

export function EventDocsClient({ evt, md, meta, toc }: EventDocsClientProps) {
	const { darkMode } = useTheme();
	// Prefer a Google Docs notesheet link if one exists in evt.links
	const links: EventLink[] = Array.isArray(evt?.links) ? evt.links : [];
	const googleNotesheetLink =
		links.find(
			(link) =>
				typeof link?.url === "string" &&
				GOOGLE_DOCS_URL_REGEX.test(link.url) &&
				NOTESHEET_LABEL_REGEX.test(link?.label ?? ""),
		) ?? null;
	const hasGoogleNotesheet = Boolean(googleNotesheetLink?.url);
	const filteredLinks = links.filter(
		(link) =>
			!(
				typeof link?.url === "string" &&
				GOOGLE_DOCS_URL_REGEX.test(link.url) &&
				NOTESHEET_LABEL_REGEX.test(link?.label ?? "")
			),
	);

	React.useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		if (window.location.hash) {
			const id = decodeURIComponent(window.location.hash.slice(1));
			const el = document.getElementById(id);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}
	}, []);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
			<aside className="lg:col-span-3 order-last lg:order-first">
				<div className="sticky top-24 space-y-3">
					<div className="flex items-center justify-between">
						<h2
							className={`text-sm font-semibold ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							On this page
						</h2>
						<Link
							href={`/docs/${evt.slug}/edit`}
							className={`text-xs font-medium hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
						>
							Edit
						</Link>
					</div>
					<nav className="text-sm max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
						<ul className="space-y-2">
							{toc.map((item) => (
								<li
									key={item.id}
									className={
										item.level === 2
											? "ml-0"
											: item.level === 3
												? "ml-4"
												: item.level >= 4
													? "ml-8"
													: ""
									}
								>
									<a
										href={`#${item.id}`}
										onClick={(e) => {
											e.preventDefault();
											const targetId = item.id;
											const el = document.getElementById(targetId);
											if (el) {
												try {
													window.location.hash = targetId;
												} catch {
													// Ignore hash setting errors (e.g., in some browsers or contexts)
												}
												el.scrollIntoView({
													behavior: "smooth",
													block: "start",
												});
											}
										}}
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

			<article className="lg:col-span-9 space-y-10">
				<header className="space-y-1">
					<h1
						className={`text-3xl font-bold ${darkMode ? "text-gray-100" : "text-black"}`}
					>
						{evt.name}
					</h1>
					<p
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						2026 season
					</p>
				</header>

				<section>
					<div
						className={`rounded-lg border p-4 text-sm ${darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}
					>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
							<div>
								<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Type:
								</span>{" "}
								<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
									{meta.typeLabel}
								</span>
							</div>
							<div>
								<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Divisions:
								</span>{" "}
								<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
									{evt.division.join(", ")}
								</span>
							</div>
							<div>
								<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Participants:
								</span>{" "}
								<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
									{meta.participants}
								</span>
							</div>
							<div>
								<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Approx. Time:
								</span>{" "}
								<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
									{meta.approxTime}
								</span>
							</div>
							<div className="sm:col-span-2">
								<span className={darkMode ? "text-gray-400" : "text-gray-600"}>
									Allowed Resources:
								</span>{" "}
								<span className={darkMode ? "text-gray-100" : "text-gray-900"}>
									{meta.allowedResources}
								</span>
							</div>
						</div>
					</div>
				</section>

				{evt.subsections && evt.subsections.length > 0 && (
					<section className="space-y-3">
						<div className="flex items-center justify-between">
							<h2
								className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
							>
								Subsections
							</h2>
							<Link
								href={`/docs/${evt.slug}/edit`}
								className={`text-sm font-medium hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
							>
								Edit main
							</Link>
						</div>
						<ul
							className={`divide-y rounded-lg overflow-hidden border ${darkMode ? "divide-gray-800 border-gray-800" : "divide-gray-200 border-gray-200"}`}
						>
							{evt.subsections.map((s: DocsSubsection) => (
								<li
									key={s.slug}
									className={`flex items-center justify-between px-4 py-3 ${darkMode ? "bg-gray-900" : "bg-white"}`}
								>
									<Link
										href={`/docs/${evt.slug}/${s.slug}`}
										className={`hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
									>
										{s.title}
									</Link>
									<Link
										href={`/docs/${evt.slug}/${s.slug}/edit`}
										className={`text-xs font-medium hover:underline ${darkMode ? "text-gray-300" : "text-gray-700"}`}
									>
										Quick edit
									</Link>
								</li>
							))}
						</ul>
					</section>
				)}

				<section>
					<div>
						{md ? (
							<DocsMarkdown content={md} withHeadingIds={true} />
						) : (
							<div
								className={`prose prose-slate max-w-none ${darkMode ? "prose-invert" : ""}`}
							>
								<p className={darkMode ? "text-gray-300" : "text-gray-900"}>
									{evt.overview}
								</p>
								<ul className={darkMode ? "text-gray-300" : "text-gray-900"}>
									{evt.keyTopics.map((t: string) => (
										<li key={t}>{t}</li>
									))}
								</ul>
							</div>
						)}
					</div>
					{evt.materialsNote && (
						<p
							className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							<strong>Allowed materials:</strong> {evt.materialsNote}
						</p>
					)}
				</section>

				<section>
					<h2
						className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					>
						Official references
					</h2>
					<ul
						className={`list-disc pl-5 space-y-1 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					>
						{filteredLinks.map((link) => (
							<li key={link.url}>
								<a
									className={`hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{link.label}
								</a>
							</li>
						))}
					</ul>
				</section>

				{evt.notesheetAllowed && (
					<section id="notesheet" className="space-y-2">
						<h2
							className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
						>
							Sample notesheet
						</h2>
						<p className={darkMode ? "text-gray-300" : "text-gray-700"}>
							Download a printable, rule-compliant sample notesheet. Customize
							with your notes.
						</p>
						<div className="flex gap-3">
							{hasGoogleNotesheet && googleNotesheetLink ? (
								<a
									className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
									href={googleNotesheetLink.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									See sample notesheet
								</a>
							) : (
								<Link
									className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
									href={`/docs/${evt.slug}/notesheet.pdf`}
									prefetch={false}
								>
									See sample notesheet
								</Link>
							)}
						</div>
					</section>
				)}

				{!evt.notesheetAllowed && (
					<section id="notesheet" className="space-y-2">
						<h2
							className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
						>
							Sample notesheet
						</h2>
						<p className={darkMode ? "text-gray-300" : "text-gray-700"}>
							Download a printable, rule-compliant sample notesheet. Customize
							with your notes.
						</p>
						<div className="flex gap-3">
							{hasGoogleNotesheet && googleNotesheetLink ? (
								<a
									className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
									href={googleNotesheetLink.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									See sample notesheet
								</a>
							) : (
								<button
									type="button"
									onClick={() => {
										toast.info(
											<div>
												A notesheet is not available for this event (yet). If
												you have notesheets for this season, please help us out
												and send it through{" "}
												<a
													href="https://discord.gg/hXSkrD33gu"
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-500 hover:underline"
												>
													Discord
												</a>{" "}
												or{" "}
												<a
													href="mailto:team.scio.ly@gmail.com"
													className="text-blue-500 hover:underline"
												>
													Email
												</a>
												!
											</div>,
											{
												autoClose: 6000,
												position: "top-right",
											},
										);
									}}
									className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
								>
									See sample notesheet
								</button>
							)}
						</div>
					</section>
				)}

				<section className="space-y-2">
					<h2
						className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					>
						Study roadmap
					</h2>
					<ol
						className={`list-decimal pl-5 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					>
						{evt.studyRoadmap.map((step: string) => (
							<li key={step}>{step}</li>
						))}
					</ol>
					<div className="mt-2">
						<Link
							href={`/docs/${evt.slug}/edit`}
							className={`hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
						>
							Contribute edits
						</Link>
					</div>
				</section>
			</article>
		</div>
	);
}
