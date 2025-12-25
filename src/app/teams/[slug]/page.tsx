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
	return {
		title: `${slug} | Scio.ly`,
		description: `Team page for ${slug}`,
	};
}

export default async function TeamSlugPage({ params }: PageProps) {
	const { slug } = await params;
	return <TeamPageClient teamSlug={slug} />;
}
