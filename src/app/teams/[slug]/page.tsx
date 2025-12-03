import { createContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/routers/_app";
import { HydrationBoundary } from "@tanstack/react-query";
import { createServerSideHelpers } from "@trpc/react-query/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import superjson from "superjson";
import TeamPageClient from "./TeamPageClient";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;
	try {
		const ctx = await createContext();
		const caller = appRouter.createCaller(ctx);
		const meta = await caller.teams.meta({ teamSlug: slug });
		return {
			title: `${meta?.name ?? meta?.school ?? "Team"} | Scio.ly`,
			description: `Team page for ${meta?.name ?? meta?.school ?? slug}`,
		};
	} catch {
		return {
			title: "Team | Scio.ly",
			description: "Team page",
		};
	}
}

export default async function TeamSlugPage({ params }: PageProps) {
	const { slug } = await params;
	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: await createContext(),
		transformer: superjson,
	});

	try {
		await helpers.teams.full.prefetch({ teamSlug: slug });
	} catch (_error) {
		// If unauthorized, send to auth flow
		redirect("/auth");
	}

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<TeamPageClient teamSlug={slug} />
		</HydrationBoundary>
	);
}
