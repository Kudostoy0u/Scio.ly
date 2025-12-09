import { getEventMeta } from "@/app/docs/utils/eventMeta";
import { getEventBySlug } from "@/app/docs/utils/events2026";
import { getAnyEventMarkdown } from "@/app/docs/utils/storage";
import { extractToc } from "@/lib/utils/content/markdown";
import { notFound } from "next/navigation";
import { EventDocsClient } from "./EventDocsClient";

export const revalidate = 3600;

export function generateStaticParams() {
	const slugs = getEventBySlug.allSlugs?.() || [];
	return slugs.map((event) => ({ event }));
}

export default async function EventDocsPage({
	params,
}: { params: Promise<{ event: string }> }) {
	const { event } = await params;
	const evt = getEventBySlug(event);
	if (!evt) {
		return notFound();
	}
	const md = await getAnyEventMarkdown(evt.slug);
	const meta = getEventMeta(evt);

	const toc = extractToc(md);

	return <EventDocsClient evt={evt} md={md} meta={meta} toc={toc} />;
}
