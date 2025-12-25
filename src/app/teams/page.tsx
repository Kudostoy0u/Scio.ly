import type { Metadata } from "next";
import TeamsPageClient from "./components/TeamsPageClient";

export const metadata: Metadata = {
	title: "Scio.ly | Teams",
	description: "Join and coordinate with your Science Olympiad team.",
};

export default async function TeamsPage(ctx: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	await ctx.searchParams;
	return <TeamsPageClient />;
}
