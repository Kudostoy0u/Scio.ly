import type { Metadata } from "next";
import TeamPageClient from "./TeamPageClient";

export const dynamic = "force-static";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const prettyName = slug
		.split("-")
		.filter(Boolean)
		.map((part) =>
			part.length ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part,
		)
		.join(" ");
	return {
		title: `${prettyName} | Scio.ly`,
		description: `Team page for ${prettyName}`,
	};
}

export default async function TeamSlugPage({ params }: PageProps) {
	const { slug } = await params;
	return <TeamPageClient teamSlug={slug} />;
}
